"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeExtension = initializeExtension;
const CharacterService_1 = require("../services/CharacterService");
const CustomMacroService_1 = require("../services/CustomMacroService");
const shared_1 = require("../common/shared");
const Store_1 = require("../common/Store");
const NewBotOutfitManager_1 = require("../managers/NewBotOutfitManager");
const BotOutfitPanel_1 = require("../panels/BotOutfitPanel");
const NewUserOutfitManager_1 = require("../managers/NewUserOutfitManager");
const UserOutfitPanel_1 = require("../panels/UserOutfitPanel");
const DebugPanel_1 = require("../panels/DebugPanel");
const EventService_1 = require("../services/EventService");
const OutfitCommands_1 = require("../commands/OutfitCommands");
const SettingsUI_1 = require("../settings/SettingsUI");
const settings_1 = require("../settings/settings");
const constants_1 = require("../config/constants");
const StorageService_1 = require("../services/StorageService");
const DataManager_1 = require("../managers/DataManager");
const OutfitDataService_1 = require("../services/OutfitDataService");
const MacroProcessor_1 = require("../processors/MacroProcessor");
const DebugLogger_1 = require("../logging/DebugLogger");
let AutoOutfitSystem;
/**
 * Loads the AutoOutfitSystem module dynamically.
 * This function attempts to import the AutoOutfitSystem module and assigns it to the AutoOutfitSystem variable.
 * If loading fails, it creates a dummy class to prevent errors.
 * @returns {Promise<void>} A promise that resolves when the module is loaded
 */
function loadAutoOutfitSystem() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            (0, DebugLogger_1.debugLog)('Attempting to load AutoOutfitSystem module', null, 'debug');
            const autoOutfitModule = yield Promise.resolve().then(() => __importStar(require('../services/AutoOutfitService')));
            AutoOutfitSystem = autoOutfitModule.AutoOutfitService;
            (0, DebugLogger_1.debugLog)('AutoOutfitSystem module loaded successfully', null, 'info');
        }
        catch (error) {
            console.error('[OutfitTracker] Failed to load AutoOutfitSystem:', error);
            (0, DebugLogger_1.debugLog)('Failed to load AutoOutfitSystem, using dummy class', error, 'error');
            AutoOutfitSystem = class DummyAutoOutfitSystem {
            };
        }
    });
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
 * @param {any} botManager - The bot outfit manager instance
 * @param {any} userManager - The user outfit manager instance
 * @param {any} botPanel - The bot outfit panel instance
 * @param {any} userPanel - The user outfit panel instance
 * @param {any} autoOutfitSystem - The auto outfit system instance
 * @param {any} outfitDataService - The outfit data service instance
 * @returns {void}
 */
function setupApi(botManager, userManager, botPanel, userPanel, autoOutfitSystem, outfitDataService) {
    var _a;
    shared_1.extension_api.botOutfitPanel = botPanel;
    shared_1.extension_api.userOutfitPanel = userPanel;
    shared_1.extension_api.autoOutfitSystem = autoOutfitSystem;
    shared_1.extension_api.wipeAllOutfits = () => outfitDataService.wipeAllOutfits();
    window.wipeAllOutfits = () => outfitDataService.wipeAllOutfits(); // Make it directly accessible globally
    shared_1.extension_api.getOutfitExtensionStatus = () => {
        var _a, _b;
        return ({
            core: true,
            autoOutfit: (_b = (_a = autoOutfitSystem === null || autoOutfitSystem === void 0 ? void 0 : autoOutfitSystem.getStatus) === null || _a === void 0 ? void 0 : _a.call(autoOutfitSystem)) !== null && _b !== void 0 ? _b : false,
            botPanel: { isVisible: botPanel === null || botPanel === void 0 ? void 0 : botPanel.isVisible },
            userPanel: { isVisible: userPanel === null || userPanel === void 0 ? void 0 : userPanel.isVisible },
            events: true,
            managers: { bot: Boolean(botManager), user: Boolean(userManager) },
        });
    };
    // Register character-specific macros when the API is set up
    if (typeof ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) !== 'undefined') {
        const STContext = window.SillyTavern.getContext();
        if (STContext) {
            // Wait for character data to be loaded before registering character-specific macros
            setTimeout(() => {
                CustomMacroService_1.customMacroSystem.deregisterCharacterSpecificMacros(STContext);
                CustomMacroService_1.customMacroSystem.registerCharacterSpecificMacros(STContext);
            }, 2000); // Wait a bit for character data to load
        }
    }
    // Also register a global function that can refresh macros when needed
    window.refreshOutfitMacros = function () {
        var _a;
        const STContext = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext();
        if (STContext) {
            CustomMacroService_1.customMacroSystem.deregisterCharacterSpecificMacros(STContext);
            CustomMacroService_1.customMacroSystem.registerCharacterSpecificMacros(STContext);
        }
    };
    // Create and set up the debug panel
    const debugPanel = new DebugPanel_1.DebugPanel();
    window.outfitDebugPanel = debugPanel;
    shared_1.extension_api.debugPanel = debugPanel;
    globalThis.outfitTracker = shared_1.extension_api;
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
 * @param {any[]} chat - The chat array that will be passed to the AI
 * @returns {Promise<void>} A promise that resolves when the injection is complete
 */
globalThis.outfitTrackerInterceptor = function (chat) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Create a temporary reference to the managers using the panel references
            const botPanel = window.botOutfitPanel;
            const userPanel = window.userOutfitPanel;
            if (!botPanel || !userPanel) {
                // If panels aren't available yet, store the reference and try later
                (0, DebugLogger_1.debugLog)('Panels not available for interceptor, deferring injection', {
                    botPanel: Boolean(botPanel),
                    userPanel: Boolean(userPanel)
                }, 'warn');
                return;
            }
            const botManager = botPanel.outfitManager;
            const userManager = userPanel.outfitManager;
            if (!botManager || !userManager) {
                (0, DebugLogger_1.debugLog)('Managers not available for interceptor', {
                    botManager: Boolean(botManager),
                    userManager: Boolean(userManager)
                }, 'warn');
                return;
            }
            // If both bot and user have prompt injection disabled, skip entirely
            if (!botManager.getPromptInjectionEnabled() && !userManager.getPromptInjectionEnabled()) {
                (0, DebugLogger_1.debugLog)('Prompt injection is disabled for both bot and user', null, 'info');
                return;
            }
            // Check if prompt injection is disabled for this bot instance
            if (!botManager.getPromptInjectionEnabled()) {
                (0, DebugLogger_1.debugLog)('Prompt injection is disabled for this bot instance', null, 'info');
            }
            // Generate outfit information string using the custom macro system
            const outfitInfoString = CustomMacroService_1.customMacroSystem.generateOutfitInfoString(botManager, userManager);
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
                (0, DebugLogger_1.debugLog)('Injecting outfit information into chat', { outfitInfoString }, 'info');
                // Insert the outfit information before the last message in the chat
                // This ensures it's included in the context without disrupting the conversation flow
                chat.splice(chat.length - 1, 0, outfitInjection);
            }
            else {
                (0, DebugLogger_1.debugLog)('No outfit information to inject', null, 'debug');
            }
        }
        catch (error) {
            console.error('[OutfitTracker] Error in interceptor:', error);
            (0, DebugLogger_1.debugLog)('Error in interceptor', error, 'error');
        }
    });
};
/**
 * Initializes the outfit extension.
 * This is the main initialization function that loads all components of the system,
 * including managers, panels, settings, and event listeners.
 * @returns {Promise<void>} A promise that resolves when the extension is fully initialized
 * @throws {Error} If SillyTavern context is not available
 */
function initializeExtension() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        yield loadAutoOutfitSystem();
        (0, DebugLogger_1.debugLog)('Starting extension initialization', null, 'info');
        const STContext = ((_b = (_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_c = window.getContext) === null || _c === void 0 ? void 0 : _c.call(window));
        if (!STContext) {
            console.error('[OutfitTracker] Required SillyTavern context is not available.');
            throw new Error('Missing required SillyTavern globals.');
        }
        const storageService = new StorageService_1.StorageService((data) => STContext.saveSettingsDebounced({ outfit_tracker: data }), () => STContext.extensionSettings.outfit_tracker);
        const dataManager = new DataManager_1.DataManager(storageService);
        yield dataManager.initialize();
        Store_1.outfitStore.setDataManager(dataManager);
        // Load the stored state into the outfit store after initialization
        Store_1.outfitStore.loadState();
        (0, DebugLogger_1.debugLog)('Data manager and outfit store initialized', null, 'info');
        const outfitDataService = new OutfitDataService_1.OutfitDataService(dataManager);
        const settings = dataManager.loadSettings();
        (0, DebugLogger_1.debugLog)('Settings loaded', settings, 'info');
        const botManager = new NewBotOutfitManager_1.NewBotOutfitManager(constants_1.ALL_SLOTS);
        const userManager = new NewUserOutfitManager_1.NewUserOutfitManager(constants_1.ALL_SLOTS);
        (0, DebugLogger_1.debugLog)('Outfit managers created', { botManager, userManager }, 'info');
        const botPanel = new BotOutfitPanel_1.BotOutfitPanel(botManager, constants_1.CLOTHING_SLOTS, constants_1.ACCESSORY_SLOTS, (data) => STContext.saveSettingsDebounced({ outfit_tracker: data }));
        const userPanel = new UserOutfitPanel_1.UserOutfitPanel(userManager, constants_1.CLOTHING_SLOTS, constants_1.ACCESSORY_SLOTS, (data) => STContext.saveSettingsDebounced({ outfit_tracker: data }));
        (0, DebugLogger_1.debugLog)('Outfit panels created', { botPanel, userPanel }, 'info');
        const autoOutfitSystem = new AutoOutfitSystem(botManager);
        (0, DebugLogger_1.debugLog)('Auto outfit system created', { autoOutfitSystem }, 'info');
        // Set global references for the interceptor function to access
        window.botOutfitPanel = botPanel;
        window.userOutfitPanel = userPanel;
        Store_1.outfitStore.setPanelRef('bot', botPanel);
        Store_1.outfitStore.setPanelRef('user', userPanel);
        Store_1.outfitStore.setAutoOutfitSystem(autoOutfitSystem);
        (0, DebugLogger_1.debugLog)('Global references set', null, 'info');
        setupApi(botManager, userManager, botPanel, userPanel, autoOutfitSystem, outfitDataService);
        (0, settings_1.initSettings)(autoOutfitSystem, AutoOutfitSystem, STContext);
        yield (0, OutfitCommands_1.registerOutfitCommands)(botManager, userManager, autoOutfitSystem);
        CustomMacroService_1.customMacroSystem.registerMacros(STContext);
        (0, SettingsUI_1.createSettingsUI)(AutoOutfitSystem, autoOutfitSystem, STContext);
        (0, DebugLogger_1.debugLog)('Extension components initialized', null, 'info');
        // Pass the STContext to the event listeners setup
        (0, EventService_1.setupEventListeners)({
            botManager, userManager, botPanel, userPanel, autoOutfitSystem,
            updateForCurrentCharacter: () => (0, CharacterService_1.updateForCurrentCharacter)(botManager, userManager, botPanel, userPanel),
            processMacrosInFirstMessage: () => MacroProcessor_1.macroProcessor.processMacrosInFirstMessage(STContext),
            context: STContext
        });
        (0, DebugLogger_1.debugLog)('Event listeners set up', null, 'info');
        updatePanelStyles();
        (0, DebugLogger_1.debugLog)('Panel styles updated', null, 'info');
        if (settings.autoOpenBot && !isMobileDevice()) {
            setTimeout(() => botPanel.show(), 1000);
        }
        if (settings.autoOpenUser && !isMobileDevice()) {
            setTimeout(() => userPanel.show(), 1000);
        }
        setTimeout(updatePanelStyles, 1500);
        (0, DebugLogger_1.debugLog)('Extension initialization completed', null, 'info');
    });
}
