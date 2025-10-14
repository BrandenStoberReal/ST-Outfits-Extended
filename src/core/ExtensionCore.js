// Import modules from SillyTavern core
import { getContext, extension_settings } from '../../../../../../scripts/extensions.js';
import { saveSettingsDebounced, converter } from '../../../../../../script.js';

// Import services
import { wipeAllOutfits } from '../services/DataService.js';
import { updateForCurrentCharacter } from '../services/CharacterService.js';

// Import utilities
import { customMacroSystem } from '../utils/CustomMacroSystem.js';
import { extension_api } from '../common/shared.js';

// Import store
import { outfitStore } from '../common/Store.js';

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

    function processMacrosInFirstMessage() {
        try {
            const context = getContext();

            if (context && context.chat) {
                const firstBotMessage = context.chat.find(message => !message.is_user && !message.is_system);

                if (firstBotMessage) {
                    // Update the message data with macro replacements
                    const processedText = customMacroSystem.replaceMacrosInText(firstBotMessage.mes);

                    firstBotMessage.mes = processedText;
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