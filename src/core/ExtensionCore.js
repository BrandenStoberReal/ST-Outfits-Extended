// Import functions using SillyTavern's getContext as recommended in documentation
import {updateForCurrentCharacter} from '../services/CharacterService.js';
import {customMacroSystem} from '../utils/CustomMacroSystem.js';
import {extension_api} from '../common/shared.js';
import {outfitStore} from '../common/Store.js';
import {NewBotOutfitManager} from '../managers/NewBotOutfitManager.js';
import {BotOutfitPanel} from '../panels/BotOutfitPanel.js';
import {NewUserOutfitManager} from '../managers/NewUserOutfitManager.js';
import {UserOutfitPanel} from '../panels/UserOutfitPanel.js';
import {DebugPanel} from '../panels/DebugPanel.js';
import {setupEventListeners} from './EventSystem.js';
import {registerOutfitCommands} from './OutfitCommands.js';
import {createSettingsUI} from './SettingsUI.js';
import {initSettings} from './settings.js';
import {ACCESSORY_SLOTS, ALL_SLOTS, CLOTHING_SLOTS} from '../config/constants.js';
import {StorageService} from '../services/StorageService.js';
import {DataManager} from '../services/DataManager.js';
import {OutfitDataService} from '../services/OutfitDataService.js';
import {macroProcessor} from '../utils/MacroProcessor.js';
import {debugLog} from '../utils/DebugLogger.js';
import {settingsSync} from '../utils/SettingsSync.js';

let AutoOutfitSystem;

/**
 * Loads the AutoOutfitSystem module dynamically.
 * This function attempts to import the AutoOutfitSystem module and assigns it to the AutoOutfitSystem variable.
 * If loading fails, it creates a dummy class to prevent errors.
 * @returns {Promise<void>} A promise that resolves when the module is loaded
 */
async function loadAutoOutfitSystem() {
    try {
        debugLog('Attempting to load AutoOutfitSystem module', null, 'debug');
        const autoOutfitModule = await import('./AutoOutfitSystem.js');

        AutoOutfitSystem = autoOutfitModule.AutoOutfitSystem;
        debugLog('AutoOutfitSystem module loaded successfully', null, 'info');
    } catch (error) {
        console.error('[OutfitTracker] Failed to load AutoOutfitSystem:', error);
        debugLog('Failed to load AutoOutfitSystem, using dummy class', error, 'error');
        AutoOutfitSystem = class DummyAutoOutfitSystem {
        };
    }
}

/**
 * Checks if a user agent string contains mobile device indicators.
 * This helper function is used to determine if the current device is a mobile device.
 * @param {string} userAgent - The user agent string to check
 * @returns {boolean} True if the user agent indicates a mobile device, false otherwise
 */
function isMobileUserAgent(userAgent) {
    const mobileIndicators = [
        'android',
        'webos',
        'iphone',
        'ipad',
        'ipod',
        'blackberry',
        'iemobile',
        'opera mini'
    ];

    const lowerUserAgent = userAgent.toLowerCase();

    for (let i = 0; i < mobileIndicators.length; i++) {
        if (lowerUserAgent.includes(mobileIndicators[i])) {
            return true;
        }
    }

    return false;
}

/**
 * Sets up the global API for the outfit extension.
 * This function registers the panel and system references in the global API,
 * and registers character-specific macros when the system initializes.
 * @param {object} botManager - The bot outfit manager instance
 * @param {object} userManager - The user outfit manager instance
 * @param {object} botPanel - The bot outfit panel instance
 * @param {object} userPanel - The user outfit panel instance
 * @param {object} autoOutfitSystem - The auto outfit system instance
 * @param {object} outfitDataService - The outfit data service instance
 * @returns {void}
 */
function setupApi(botManager, userManager, botPanel, userPanel, autoOutfitSystem, outfitDataService) {
    extension_api.botOutfitPanel = botPanel;
    extension_api.userOutfitPanel = userPanel;
    extension_api.autoOutfitSystem = autoOutfitSystem;
    extension_api.wipeAllOutfits = () => outfitDataService.wipeAllOutfits();
    window.wipeAllOutfits = () => outfitDataService.wipeAllOutfits(); // Make it directly accessible globally
    extension_api.getOutfitExtensionStatus = () => ({
        core: true,
        autoOutfit: autoOutfitSystem?.getStatus?.() ?? false,
        botPanel: {isVisible: botPanel?.isVisible},
        userPanel: {isVisible: userPanel?.isVisible},
        events: true,
        managers: {bot: Boolean(botManager), user: Boolean(userManager)},
    });

    // Register character-specific macros when the API is set up
    if (typeof window.SillyTavern?.getContext !== 'undefined') {
        const STContext = window.SillyTavern.getContext();

        if (STContext) {
            // Wait for character data to be loaded before registering character-specific macros
            setTimeout(() => {
                customMacroSystem.deregisterCharacterSpecificMacros(STContext);
                customMacroSystem.registerCharacterSpecificMacros(STContext);
            }, 2000); // Wait a bit for character data to load
        }
    }

    // Also register a global function that can refresh macros when needed
    window.refreshOutfitMacros = function () {
        const STContext = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext();

        if (STContext) {
            customMacroSystem.deregisterCharacterSpecificMacros(STContext);
            customMacroSystem.registerCharacterSpecificMacros(STContext);
        }
    };

    // Create and set up the debug panel
    const debugPanel = new DebugPanel();

    window.outfitDebugPanel = debugPanel;
    extension_api.debugPanel = debugPanel;

    globalThis.outfitTracker = extension_api;
}

/**
 * Updates the styles of the outfit panels.
 * This function applies color settings to both bot and user outfit panels.
 * @returns {void}
 */
function updatePanelStyles() {
    if (window.botOutfitPanel) {
        window.botOutfitPanel.applyPanelColors();
    }
    if (window.userOutfitPanel) {
        window.userOutfitPanel.applyPanelColors();
    }
}

/**
 * Checks if the current device is a mobile device.
 * This function combines user agent checks, screen size, and touch capabilities to determine
 * if the current device should be treated as mobile.
 * @returns {boolean} True if the device is a mobile device, false otherwise
 */
function isMobileDevice() {
    const userAgent = navigator.userAgent.toLowerCase();

    return isMobileUserAgent(userAgent) || window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 1);
}

/**
 * The interceptor function to inject outfit information into the conversation context.
 * This function is called by SillyTavern during generation to inject outfit information
 * into the AI's context, making it aware of the current character and user outfits.
 * @param {array} chat - The chat array that will be passed to the AI
 * @param {number} contextSize - The context size limit
 * @param {object} abort - Abort signal for the request
 * @param {string} type - The type of generation request
 * @returns {Promise<void>} A promise that resolves when the injection is complete
 */
globalThis.outfitTrackerInterceptor = async function (chat, contextSize, abort, type) {
    try {
        // Create a temporary reference to the managers using the panel references
        const botPanel = window.botOutfitPanel;
        const userPanel = window.userOutfitPanel;

        if (!botPanel || !userPanel) {
            // If panels aren't available yet, store the reference and try later
            debugLog('Panels not available for interceptor, deferring injection', {
                botPanel: Boolean(botPanel),
                userPanel: Boolean(userPanel)
            }, 'warn');
            return;
        }

        const botManager = botPanel.outfitManager;
        const userManager = userPanel.outfitManager;

        if (!botManager || !userManager) {
            debugLog('Managers not available for interceptor', {
                botManager: Boolean(botManager),
                userManager: Boolean(userManager)
            }, 'warn');
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
                extra: {outfit_injection: true}
            };

            debugLog('Injecting outfit information into chat', {outfitInfoString}, 'info');

            // Insert the outfit information before the last message in the chat
            // This ensures it's included in the context without disrupting the conversation flow
            chat.splice(chat.length - 1, 0, outfitInjection);
        } else {
            debugLog('No outfit information to inject', null, 'debug');
        }
    } catch (error) {
        console.error('[OutfitTracker] Error in interceptor:', error);
        debugLog('Error in interceptor', error, 'error');
    }
};

/**
 * Initializes the outfit extension.
 * This is the main initialization function that loads all components of the system,
 * including managers, panels, settings, and event listeners.
 * @returns {Promise<void>} A promise that resolves when the extension is fully initialized
 * @throws {Error} If SillyTavern context is not available
 */
export async function initializeExtension() {
    await loadAutoOutfitSystem();
    debugLog('Starting extension initialization', null, 'info');

    const STContext = window.SillyTavern?.getContext?.() || window.getContext?.();

    if (!STContext) {
        console.error('[OutfitTracker] Required SillyTavern context is not available.');
        throw new Error('Missing required SillyTavern globals.');
    }

    const storageService = new StorageService(
        (data) => STContext.saveSettingsDebounced({outfit_tracker: data}),
        () => STContext.extensionSettings.outfit_tracker
    );

    const dataManager = new DataManager(storageService);

    await dataManager.initialize();
    outfitStore.setDataManager(dataManager);

    // Load the stored state into the outfit store after initialization
    outfitStore.loadState();
    debugLog('Data manager and outfit store initialized', null, 'info');

    const outfitDataService = new OutfitDataService(dataManager);

    const settings = dataManager.loadSettings();

    debugLog('Settings loaded', settings, 'info');

    const botManager = new NewBotOutfitManager(ALL_SLOTS);
    const userManager = new NewUserOutfitManager(ALL_SLOTS);

    debugLog('Outfit managers created', {botManager, userManager}, 'info');

    const botPanel = new BotOutfitPanel(botManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, (data) => STContext.saveSettingsDebounced({outfit_tracker: data}));
    const userPanel = new UserOutfitPanel(userManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, (data) => STContext.saveSettingsDebounced({outfit_tracker: data}));

    debugLog('Outfit panels created', {botPanel, userPanel}, 'info');

    const autoOutfitSystem = new AutoOutfitSystem(botManager);

    debugLog('Auto outfit system created', {autoOutfitSystem}, 'info');

    // Set global references for the interceptor function to access
    window.botOutfitPanel = botPanel;
    window.userOutfitPanel = userPanel;

    outfitStore.setPanelRef('bot', botPanel);
    outfitStore.setPanelRef('user', userPanel);
    outfitStore.setAutoOutfitSystem(autoOutfitSystem);
    debugLog('Global references set', null, 'info');

    setupApi(botManager, userManager, botPanel, userPanel, autoOutfitSystem, outfitDataService);
    initSettings(autoOutfitSystem, AutoOutfitSystem, STContext);
    registerOutfitCommands(botManager, userManager, autoOutfitSystem);
    customMacroSystem.registerMacros(STContext);
    createSettingsUI(AutoOutfitSystem, autoOutfitSystem, STContext);
    debugLog('Extension components initialized', null, 'info');

    // Register settings sync mechanism to ensure consistency
    settingsSync.registerSettingsSaveListener(STContext, 'outfit_tracker');

    // Check for desync and fix if necessary
    const desyncCount = settingsSync.fixDesync(STContext.extensionSettings, 'outfit_tracker');

    if (desyncCount > 0) {
        debugLog(`Fixed ${desyncCount} desynced settings during initialization`, null, 'warn');
    }

    // Pass the STContext to the event listeners setup
    setupEventListeners({
        botManager, userManager, botPanel, userPanel, autoOutfitSystem,
        updateForCurrentCharacter: () => updateForCurrentCharacter(botManager, userManager, botPanel, userPanel),
        processMacrosInFirstMessage: () => macroProcessor.processMacrosInFirstMessage(STContext),
        context: STContext
    });
    debugLog('Event listeners set up', null, 'info');

    updatePanelStyles();
    debugLog('Panel styles updated', null, 'info');

    if (settings.autoOpenBot && !isMobileDevice()) {
        setTimeout(() => botPanel.show(), 1000);
    }
    if (settings.autoOpenUser && !isMobileDevice()) {
        setTimeout(() => userPanel.show(), 1000);
    }
    setTimeout(updatePanelStyles, 1500);

    debugLog('Extension initialization completed', null, 'info');
}