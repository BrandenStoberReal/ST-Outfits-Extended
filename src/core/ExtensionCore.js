// Import modules from SillyTavern core
import { getContext, extension_settings } from '../../../../../../scripts/extensions.js';
import { saveSettingsDebounced, converter } from '../../../../../../script.js';

// Import services
import { wipeAllOutfits } from '../services/DataService.js';
import { updateForCurrentCharacter } from '../services/CharacterService.js';

// Import utilities
import { customMacroSystem } from '../utils/CustomMacroSystem.js';
import { extension_api } from '../common/shared.js';
import { generateInstanceIdFromText } from '../utils/utility.js';

// Import store
import { outfitStore } from '../common/Store.js';

// Import Showdown extension for orange quotes
import { registerQuotesOrangeExtension, markdownQuotesOrangeExt } from '../../scripts/showdown-quotes-orange.js';

// Import managers and panels
import { NewBotOutfitManager } from '../managers/NewBotOutfitManager.js';
import { BotOutfitPanel } from '../panels/BotOutfitPanel.js';
import { NewUserOutfitManager } from '../managers/NewUserOutfitManager.js';
import { UserOutfitPanel } from '../panels/UserOutfitPanel.js';

// Import core components
import { setupEventListeners } from './EventSystem.js';
import { registerOutfitCommands } from './OutfitCommands.js';
import { createSettingsUI } from './SettingsUI.js';
import { initSettings } from './settings.js';
import { CLOTHING_SLOTS, ACCESSORY_SLOTS, ALL_SLOTS } from '../config/constants.js';

// Import AutoOutfitSystem with error handling
let AutoOutfitSystem;

async function loadAutoOutfitSystem() {
    try {
        const autoOutfitModule = await import('./AutoOutfitSystem.js');

        AutoOutfitSystem = autoOutfitModule.AutoOutfitSystem;
    } catch (error) {
        console.error('[OutfitTracker] Failed to load AutoOutfitSystem:', error);
        AutoOutfitSystem = class DummyAutoOutfitSystem {
            constructor(outfitManager) {
                this.outfitManager = outfitManager;
                this.isEnabled = false;
                this.systemPrompt = 'Dummy system prompt for outfit detection';
                this.connectionProfile = null;
                console.warn('[OutfitTracker] AutoOutfitSystem failed to load, using dummy implementation.');
            }

            enable() {
                this.isEnabled = true;
                console.warn('[OutfitTracker] Dummy AutoOutfitSystem enabled (no actual functionality)');
                return '[Outfit System] Auto outfit updates enabled (dummy implementation).';
            }

            disable() {
                this.isEnabled = false;
                console.warn('[OutfitTracker] Dummy AutoOutfitSystem disabled');
                return '[Outfit System] Auto outfit updates disabled (dummy implementation).';
            }

            setPrompt(prompt) {
                this.systemPrompt = prompt;
                console.warn('[OutfitTracker] Dummy AutoOutfitSystem prompt updated');
            }

            setConnectionProfile(profile) {
                this.connectionProfile = profile;
                console.warn('[OutfitTracker] Dummy AutoOutfitSystem connection profile updated');
            }

            getConnectionProfile() {
                return this.connectionProfile;
            }

            async manualTrigger() {
                console.warn('[OutfitTracker] Manual trigger called on dummy AutoOutfitSystem (no action taken)');
            }

            getStatus() {
                return {
                    enabled: this.isEnabled,
                    hasPrompt: Boolean(this.systemPrompt),
                    isProcessing: false,
                    error: 'AutoOutfitSystem module failed to load'
                };
            }

            markAppInitialized() {
                console.warn('[OutfitTracker] Dummy AutoOutfitSystem marked as initialized');
            }
        };
    }
}

console.log('[OutfitTracker] Starting extension loading...');

/**
 * Initializes the Outfit Tracker extension.
 * This function is called by SillyTavern when the extension is loaded.
 */
export async function initializeExtension() {
    await loadAutoOutfitSystem();

    window.getContext = getContext || window.getContext;
    window.extension_settings = extension_settings || window.extension_settings;
    window.saveSettingsDebounced = saveSettingsDebounced || window.saveSettingsDebounced;

    if (!window.getContext || !window.extension_settings || !window.saveSettingsDebounced) {
        console.error('[OutfitTracker] Required SillyTavern functions are not available.');
        throw new Error('Missing required SillyTavern globals.');
    }

    const MODULE_NAME = 'outfit_tracker';

    const botManager = new NewBotOutfitManager(ALL_SLOTS);
    const userManager = new NewUserOutfitManager(ALL_SLOTS);
    const botPanel = new BotOutfitPanel(botManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, saveSettingsDebounced);
    const userPanel = new UserOutfitPanel(userManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, saveSettingsDebounced);
    const autoOutfitSystem = new AutoOutfitSystem(botManager);

    extension_api.botOutfitPanel = botPanel;
    extension_api.userOutfitPanel = userPanel;
    extension_api.autoOutfitSystem = autoOutfitSystem;

    outfitStore.setPanelRef('bot', botPanel);
    outfitStore.setPanelRef('user', userPanel);
    outfitStore.setAutoOutfitSystem(autoOutfitSystem);

    extension_api.wipeAllOutfits = () => wipeAllOutfits();
    extension_api.replaceOutfitMacrosInText = (text) => {
        if (!text || typeof text !== 'string') {
            return text;
        }
        return customMacroSystem.replaceMacrosInText(text);
    };
    
    extension_api.getOutfitExtensionStatus = () => {
        try {
            const autoOutfitStatus = autoOutfitSystem && typeof autoOutfitSystem.getStatus === 'function' 
                ? autoOutfitSystem.getStatus() 
                : null;
                
            return {
                core: true, // Extension is loaded if this function exists
                autoOutfit: autoOutfitStatus,
                botPanel: {
                    isVisible: botPanel && botPanel.isVisible
                },
                userPanel: {
                    isVisible: userPanel && userPanel.isVisible
                },
                events: true, // Event system is initialized if we're here
                managers: {
                    bot: Boolean(botManager),
                    user: Boolean(userManager)
                }
            };
        } catch (error) {
            console.error('[OutfitTracker] Error getting extension status:', error);
            return {
                core: false,
                autoOutfit: null,
                botPanel: { isVisible: false },
                userPanel: { isVisible: false },
                events: false,
                managers: { bot: false, user: false }
            };
        }
    };

    function updatePanelStyles() {
        if (window.botOutfitPanel) {window.botOutfitPanel.applyPanelColors();}
        if (window.userOutfitPanel) {window.userOutfitPanel.applyPanelColors();}
    }

    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 1);
    }

    initSettings(autoOutfitSystem, AutoOutfitSystem);

    registerOutfitCommands(botManager, userManager, autoOutfitSystem);

    async function processMacrosInFirstMessage() {
        try {
            const context = getContext();

            if (context && context.chat) {
                const firstBotMessage = context.chat.find(message => !message.is_user && !message.is_system);

                if (firstBotMessage) {
                    // Generate and set instance ID based on the original first message content (before macro processing)
                    // This ensures different conversations have different outfit instances and the ID remains stable
                    // regardless of what the macros evaluate to
                    let instanceId = await generateInstanceIdFromText(firstBotMessage.mes);
                    
                    // Update managers with character info before setting instance ID
                    // This ensures that the managers have the correct character information
                    if (context.characters && context.characterId !== undefined && context.characterId !== null) {
                        const currentChar = context.characters[context.characterId];

                        if (currentChar && currentChar.name) {
                            botManager.setCharacter(currentChar.name, context.characterId.toString());
                        }
                    }

                    // Set the instance ID in the store for global access
                    outfitStore.setCurrentInstanceId(instanceId);
                    
                    // Set the instance ID in both bot and user managers to ensure
                    // they are working with the correct instance
                    botManager.setOutfitInstanceId(instanceId);
                    userManager.setOutfitInstanceId(instanceId);

                    // Update the message data with macro replacements (after instance ID is set)
                    const originalMes = firstBotMessage.mes;
                    const processedText = customMacroSystem.replaceMacrosInText(firstBotMessage.mes);

                    firstBotMessage.mes = processedText;
                    
                    // Update the DOM element if content changed
                    if (originalMes !== processedText) {
                        const messageIndex = context.chat.indexOf(firstBotMessage);

                        if (messageIndex !== -1) {
                            // Need to update the DOM element that displays this message
                            // Using the same approach as in EventSystem
                            setTimeout(() => {
                                try {
                                    // Get all message elements in the chat using the 'mes' CSS class
                                    const messageElements = document.querySelectorAll('#chat .mes');
                                    
                                    // Access the specific message element by index (should match chat array order)
                                    if (messageElements[messageIndex]) {
                                        // Find the text content area within the message element (has class 'mes_text')
                                        const textElement = messageElements[messageIndex].querySelector('.mes_text');

                                        if (textElement) {
                                            // Use showdown with SillyTavern's configurations if available
                                            if (window.SillyTavern && window.SillyTavern.libs && window.SillyTavern.libs.showdown) {
                                                // Create a new converter with all required extensions
                                                const extensions = [markdownQuotesOrangeExt()];
                                                
                                                // Add native SillyTavern extensions if available
                                                if (window.SillyTavern.libs.showdown.extension) {
                                                    // Try to get existing extensions
                                                    try {
                                                        // Get the markdown exclusion extension if available
                                                        if (typeof window.SillyTavern.libs.showdown.extensions['markdown-exclusion'] !== 'undefined') {
                                                            extensions.push(window.SillyTavern.libs.showdown.extensions['markdown-exclusion']);
                                                        }
                                                        // Get the underscore extension if available
                                                        if (typeof window.SillyTavern.libs.showdown.extensions['markdown-underscore'] !== 'undefined') {
                                                            extensions.push(window.SillyTavern.libs.showdown.extensions['markdown-underscore']);
                                                        }
                                                    } catch (e) {
                                                        console.debug('Could not add some native SillyTavern extensions:', e);
                                                    }
                                                }
                                                
                                                const converter = new window.SillyTavern.libs.showdown.Converter({
                                                    extensions: extensions
                                                });

                                                // Set options to match SillyTavern's formatting
                                                converter.setFlavor('github');
                                                converter.setOption('simpleLineBreaks', true);
                                                converter.setOption('strikethrough', true);
                                                
                                                let htmlContent = converter.makeHtml(processedText);
                                                
                                                // Sanitize the HTML content if DOMPurify is available
                                                if (window.SillyTavern.libs && window.SillyTavern.libs.DOMPurify) {
                                                    htmlContent = window.SillyTavern.libs.DOMPurify.sanitize(htmlContent);
                                                }
                                                
                                                textElement.innerHTML = htmlContent;
                                            } else {
                                                // Fallback to direct innerHTML if showdown is not available
                                                textElement.innerHTML = processedText;
                                            }
                                            
                                            // Optionally trigger content updated event to ensure 
                                            // any other extensions or ST features are aware of the change
                                            textElement.dispatchEvent(new CustomEvent('contentUpdated', {
                                                detail: { content: processedText }
                                            }));
                                        }
                                    }
                                } catch (domError) {
                                    console.error('Error updating first message DOM element:', domError);
                                }
                            }, 100); // Small delay to ensure DOM is ready
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[OutfitTracker] Error processing macros in first message:', error);
        }
    }

    setupEventListeners({
        botManager, userManager, botPanel, userPanel, autoOutfitSystem,
        updateForCurrentCharacter: () => updateForCurrentCharacter(botManager, userManager, botPanel, userPanel),
        converter, processMacrosInFirstMessage
    });

    createSettingsUI(AutoOutfitSystem, autoOutfitSystem);

    // Register the showdown extension for orange quotes
    registerQuotesOrangeExtension();

    updatePanelStyles();

    if (extension_settings[MODULE_NAME].autoOpenBot && !isMobileDevice()) {
        setTimeout(() => botPanel.show(), 1000);
    }
    if (extension_settings[MODULE_NAME].autoOpenUser && !isMobileDevice()) {
        setTimeout(() => userPanel.show(), 1000);
    }
    setTimeout(updatePanelStyles, 1500);

    globalThis.outfitTracker = extension_api;
}