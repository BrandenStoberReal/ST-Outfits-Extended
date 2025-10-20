import { getContext, extension_settings } from '../../../../../../scripts/extensions.js';
import { saveSettingsDebounced } from '../../../../../../script.js';
import { wipeAllOutfits } from '../services/DataService.js';
import { updateForCurrentCharacter } from '../services/CharacterService.js';
import { customMacroSystem } from '../utils/CustomMacroSystem.js';
import { extension_api } from '../common/shared.js';
import { generateInstanceIdFromText } from '../utils/utilities.js';
import { outfitStore } from '../common/Store.js';
import { registerQuotesColorExtension } from '../../scripts/showdown-quotes-orange.js';
import { NewBotOutfitManager } from '../managers/NewBotOutfitManager.js';
import { BotOutfitPanel } from '../panels/BotOutfitPanel.js';
import { NewUserOutfitManager } from '../managers/NewUserOutfitManager.js';
import { UserOutfitPanel } from '../panels/UserOutfitPanel.js';
import { setupEventListeners } from './EventSystem.js';
import { registerOutfitCommands } from './OutfitCommands.js';
import { createSettingsUI } from './SettingsUI.js';
import { initSettings } from './settings.js';
import { CLOTHING_SLOTS, ACCESSORY_SLOTS, ALL_SLOTS } from '../config/constants.js';

let AutoOutfitSystem;

async function loadAutoOutfitSystem() {
    try {
        const autoOutfitModule = await import('./AutoOutfitSystem.js');

        AutoOutfitSystem = autoOutfitModule.AutoOutfitSystem;
    } catch (error) {
        console.error('[OutfitTracker] Failed to load AutoOutfitSystem:', error);
        AutoOutfitSystem = class DummyAutoOutfitSystem {};
    }
}

async function processMacrosInFirstMessage() {
    try {
        const context = getContext();

        if (!context || !context.chat) {return;}

        const firstBotMessage = context.chat.find(message => !message.is_user && !message.is_system);

        if (firstBotMessage) {
            // Use the existing cleanOutfitMacrosFromText function to remove macro patterns
            const processedMessage = cleanOutfitMacrosFromText(firstBotMessage.mes);
            
            // Collect all possible outfit values for this character to remove from the message before hashing
            // This includes values from all known outfit instances and presets for this character
            const outfitValues = getAllOutfitValuesForCharacter(context.characterId);
            
            // Generate instance ID with outfit values removed from the processed message
            // This ensures consistent instance IDs even when outfit values change
            const instanceId = await generateInstanceIdFromText(processedMessage, outfitValues);

            outfitStore.setCurrentInstanceId(instanceId);
        }
    } catch (error) {
        console.error('[OutfitTracker] Error processing macros in first message:', error);
    }
}

// Function to get all outfit values for a character across all instances
function getAllOutfitValuesForCharacter(characterId) {
    if (!characterId) {return [];}
    
    const actualCharacterId = characterId.toString();
    const state = outfitStore.getState();
    const outfitValues = new Set();
    
    // Look through bot outfits for this character
    if (state.botOutfits && state.botOutfits[actualCharacterId]) {
        Object.values(state.botOutfits[actualCharacterId]).forEach(outfit => {
            if (outfit) {
                Object.values(outfit).forEach(value => {
                    if (value && typeof value === 'string' && value !== 'None') {
                        outfitValues.add(value);
                    }
                });
            }
        });
    }
    
    // Look through presets for this character
    if (state.presets && state.presets.bot) {
        Object.keys(state.presets.bot).forEach(key => {
            if (key.startsWith(actualCharacterId + '_')) { // Character-specific instance
                const presets = state.presets.bot[key];

                if (presets) {
                    Object.values(presets).forEach(preset => {
                        if (preset) {
                            Object.values(preset).forEach(value => {
                                if (value && typeof value === 'string' && value !== 'None') {
                                    outfitValues.add(value);
                                }
                            });
                        }
                    });
                }
            }
        });
    }
    
    return Array.from(outfitValues);
}

// Function to clean outfit-related values from text for consistent instance ID generation
function cleanOutfitMacrosFromText(text) {
    if (!text || typeof text !== 'string') {return text || '';}
    
    // First, remove any outfit-related macros like {{char_slot}}, {{user_slot}}, etc.
    let cleanedText = text.replace(/\{\{(?:char_|user_|[A-Za-z0-9_]+_)[a-z0-9_\-]+\}\}/g, '{{}}');
    
    // Get the current character ID to identify which outfits to look for
    const context = getContext();

    if (!context || !context.characterId) {
        return cleanedText;
    }
    
    const characterId = context.characterId.toString();
    
    // Get all possible outfit values from the outfit store for this character across all instances
    const state = outfitStore.getState();
    
    // Collect all unique outfit values for this character across all instances
    const outfitValues = new Set();
    
    // Look through bot outfits for this character
    if (state.botOutfits && state.botOutfits[characterId]) {
        Object.values(state.botOutfits[characterId]).forEach(outfit => {
            if (outfit) {
                Object.values(outfit).forEach(value => {
                    if (value && typeof value === 'string' && value !== 'None') {
                        outfitValues.add(value);
                    }
                });
            }
        });
    }
    
    // Look through presets for this character
    if (state.presets && state.presets.bot) {
        Object.keys(state.presets.bot).forEach(key => {
            if (key.startsWith(characterId + '_')) { // Character-specific instance
                const presets = state.presets.bot[key];

                if (presets) {
                    Object.values(presets).forEach(preset => {
                        if (preset) {
                            Object.values(preset).forEach(value => {
                                if (value && typeof value === 'string' && value !== 'None') {
                                    outfitValues.add(value);
                                }
                            });
                        }
                    });
                }
            }
        });
    }
    
    // Remove each outfit value from the text if it exists
    // Process in reverse length order to handle longer items first (avoid substring issues)
    const sortedValues = Array.from(outfitValues).sort((a, b) => b.length - a.length);
    
    let resultText = cleanedText;

    sortedValues.forEach(outfitValue => {
        if (outfitValue && typeof outfitValue === 'string') {
            // Replace case-insensitive occurrences of the outfit value in the text
            // Use a simple string replacement approach to avoid regex complexity
            let tempText = resultText;
            let lowerTempText = tempText.toLowerCase();
            let lowerOutfitValue = outfitValue.toLowerCase();
            
            let startIndex = 0;

            while ((startIndex = lowerTempText.indexOf(lowerOutfitValue, startIndex)) !== -1) {
                // Verify it's a complete word match to avoid partial replacements
                const endIndex = startIndex + lowerOutfitValue.length;
                
                // Check if it's a complete word (surrounded by word boundaries or punctuation)
                const beforeChar = startIndex > 0 ? lowerTempText.charAt(startIndex - 1) : ' ';
                const afterChar = endIndex < lowerTempText.length ? lowerTempText.charAt(endIndex) : ' ';
                
                // Replace if surrounded by spaces/punctuation or at text boundaries
                if ((beforeChar === ' ' || beforeChar === '.' || beforeChar === ',' || beforeChar === '"' || beforeChar === '\'' || beforeChar === '(' || beforeChar === '[') &&
                    (afterChar === ' ' || afterChar === '.' || afterChar === ',' || afterChar === '"' || afterChar === '\'' || afterChar === ')' || afterChar === ']')) {
                    resultText = resultText.substring(0, startIndex) + '[OUTFIT_REMOVED]' + resultText.substring(endIndex);
                    lowerTempText = resultText.toLowerCase();
                }
                
                startIndex = endIndex;
            }
        }
    });
    
    return resultText;
}

function setupApi(botManager, userManager, botPanel, userPanel, autoOutfitSystem) {
    extension_api.botOutfitPanel = botPanel;
    extension_api.userOutfitPanel = userPanel;
    extension_api.autoOutfitSystem = autoOutfitSystem;
    extension_api.wipeAllOutfits = () => wipeAllOutfits();
    extension_api.getOutfitExtensionStatus = () => ({
        core: true,
        autoOutfit: autoOutfitSystem?.getStatus(),
        botPanel: { isVisible: botPanel?.isVisible },
        userPanel: { isVisible: userPanel?.isVisible },
        events: true,
        managers: { bot: Boolean(botManager), user: Boolean(userManager) },
    });
    extension_api.updateQuoteColorSetting = (newColor) => {
        try {
            extension_settings.outfit_tracker.quoteColor = newColor;
            saveSettingsDebounced();
            registerQuotesColorExtension(newColor);
            console.log(`[OutfitTracker] Quote color updated to ${newColor}`);
            return true;
        } catch (error) {
            console.error('[OutfitTracker] Error updating quote color:', error);
            return false;
        }
    };
    extension_api.getQuoteColorSetting = () => extension_settings.outfit_tracker?.quoteColor || '#FFA500';
    globalThis.outfitTracker = extension_api;
}

function updatePanelStyles() {
    if (window.botOutfitPanel) {window.botOutfitPanel.applyPanelColors();}
    if (window.userOutfitPanel) {window.userOutfitPanel.applyPanelColors();}
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 1);
}

// Define the interceptor function to inject outfit information into the context
globalThis.outfitTrackerInterceptor = async function(chat, contextSize, abort, type) {
    try {
        // Create a temporary reference to the managers using the panel references
        const botPanel = window.botOutfitPanel;
        const userPanel = window.userOutfitPanel;

        if (!botPanel || !userPanel) {
            // If panels aren't available yet, store the reference and try later
            console.warn('[OutfitTracker] Panels not available for interceptor, deferring injection');
            return;
        }

        const botManager = botPanel.outfitManager;
        const userManager = userPanel.outfitManager;

        if (!botManager || !userManager) {
            console.warn('[OutfitTracker] Managers not available for interceptor');
            return;
        }

        // Generate outfit information string using the custom macro system
        const outfitInfoString = customMacroSystem.generateOutfitInfoString(botManager, userManager);

        // Only inject if there's actual outfit information to add
        if (outfitInfoString && outfitInfoString.trim()) {
            // Create a new message object for the outfit information
            const outfitInjection = {
                is_user: false,
                is_system: true,
                name: 'Outfit Info',
                send_date: new Date().toISOString(),
                mes: outfitInfoString,
                extra: { outfit_injection: true }
            };

            // Insert the outfit information before the last message in the chat
            // This ensures it's included in the context without disrupting the conversation flow
            chat.splice(chat.length - 1, 0, outfitInjection);
        }
    } catch (error) {
        console.error('[OutfitTracker] Error in interceptor:', error);
    }
};

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

    // Set global references for the interceptor function to access
    window.botOutfitPanel = botPanel;
    window.userOutfitPanel = userPanel;

    outfitStore.setPanelRef('bot', botPanel);
    outfitStore.setPanelRef('user', userPanel);
    outfitStore.setAutoOutfitSystem(autoOutfitSystem);

    setupApi(botManager, userManager, botPanel, userPanel, autoOutfitSystem);
    initSettings(autoOutfitSystem, AutoOutfitSystem);
    registerOutfitCommands(botManager, userManager, autoOutfitSystem);
    customMacroSystem.registerMacros();
    createSettingsUI(AutoOutfitSystem, autoOutfitSystem);

    setupEventListeners({
        botManager, userManager, botPanel, userPanel, autoOutfitSystem,
        updateForCurrentCharacter: () => updateForCurrentCharacter(botManager, userManager, botPanel, userPanel),
        processMacrosInFirstMessage,
    });

    const quoteColor = extension_settings.outfit_tracker?.quoteColor || '#FFA500';

    registerQuotesColorExtension(quoteColor);

    updatePanelStyles();

    if (extension_settings[MODULE_NAME].autoOpenBot && !isMobileDevice()) {
        setTimeout(() => botPanel.show(), 1000);
    }
    if (extension_settings[MODULE_NAME].autoOpenUser && !isMobileDevice()) {
        setTimeout(() => userPanel.show(), 1000);
    }
    setTimeout(updatePanelStyles, 1500);
}