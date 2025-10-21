// Centralized Store for Outfit Tracker Extension
// Replaces usage of global variables with a proper state management system
import { DEFAULT_SETTINGS } from '../config/constants.js';

// Unique module name for extension settings
const MODULE_NAME = 'outfit_tracker';

class OutfitStore {
    constructor() {
        this.initializeState();
    }

    // Initialize the store state with proper defaults
    initializeState() {
        this.state = {
            // Current outfit data
            botOutfits: {},
            userOutfits: {},
            
            // Instance tracking
            botInstances: {},
            userInstances: {},
            
            // Preset data
            presets: {
                bot: {},
                user: {}
            },
            
            // Panel settings - taking panel colors from DEFAULT_SETTINGS
            panelSettings: { 
                botPanelColors: structuredClone(DEFAULT_SETTINGS.botPanelColors),
                userPanelColors: structuredClone(DEFAULT_SETTINGS.userPanelColors)
            },
            
            // Global settings with defaults
            settings: structuredClone(DEFAULT_SETTINGS),
            
            // Current context tracking
            currentCharacterId: null,
            currentChatId: null,
            currentOutfitInstanceId: null,
            
            // UI State
            panelVisibility: {
                bot: false,
                user: false
            },
            
            // References to UI panels and managers
            references: {
                botPanel: null,
                userPanel: null,
                autoOutfitSystem: null
            },
            
            // Callbacks for state changes
            listeners: []
        };
    }

    // Get extension settings with proper initialization
    getExtensionSettings() {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : null;
        const extensionSettings = context?.extensionSettings || window.extension_settings;

        if (!extensionSettings) {
            console.warn('[OutfitTracker] Could not access extension settings.');
            return null;
        }

        // Initialize settings if they don't exist
        if (!extensionSettings[MODULE_NAME]) {
            extensionSettings[MODULE_NAME] = structuredClone(DEFAULT_SETTINGS);
        }

        // Ensure all default keys exist (helpful after updates)
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
            if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
                extensionSettings[MODULE_NAME][key] = DEFAULT_SETTINGS[key];
            }
        }

        return extensionSettings;
    }

    // Subscribe to state changes
    subscribe(listener) {
        this.state.listeners.push(listener);
        return () => {
            this.state.listeners = this.state.listeners.filter(l => l !== listener);
        };
    }

    // Notify all listeners of state change
    notifyListeners() {
        this.state.listeners.forEach(listener => {
            try {
                listener(this.getState());
            } catch (error) {
                console.error('Error in store listener:', error);
            }
        });
    }

    // Update state and notify listeners
    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notifyListeners();
    }

    // Get current state (returning a deep clone to prevent external mutations)
    getState() {
        return structuredClone(this.state);
    }

    // Bot outfit data management
    getBotOutfit(characterId, instanceId) {
        return this.state.botInstances[characterId]?.[instanceId]?.bot || {};
    }

    setBotOutfit(characterId, instanceId, outfitData) {
        if (!this.state.botInstances[characterId]) {
            this.state.botInstances[characterId] = {};
        }
        if (!this.state.botInstances[characterId][instanceId]) {
            this.state.botInstances[characterId][instanceId] = { bot: {}, user: {} };
        }
        this.state.botInstances[characterId][instanceId].bot = structuredClone(outfitData);
        this.notifyListeners();
    }

    // User outfit data management
    getUserOutfit(instanceId) {
        return this.state.userInstances[instanceId] || {};
    }

    setUserOutfit(instanceId, outfitData) {
        this.state.userInstances[instanceId] = structuredClone(outfitData);
        this.notifyListeners();
    }

    // Preset management
    getPresets(characterId, instanceId) {
        const key = `${characterId}_${instanceId}`;

        return {
            bot: this.state.presets.bot[key] || {},
            user: this.state.presets.user[instanceId] || {}
        };
    }

    savePreset(characterId, instanceId, presetName, outfitData, type = 'bot') {
        const key = `${characterId}_${instanceId}`;

        if (type === 'bot') {
            if (!this.state.presets.bot[key]) {
                this.state.presets.bot[key] = {};
            }
            this.state.presets.bot[key][presetName] = structuredClone(outfitData);
        } else {
            if (!this.state.presets.user[instanceId]) {
                this.state.presets.user[instanceId] = {};
            }
            this.state.presets.user[instanceId][presetName] = structuredClone(outfitData);
        }
        this.notifyListeners();
    }

    // Settings
    getSetting(key) {
        return this.state.settings[key];
    }

    setSetting(key, value) {
        this.state.settings[key] = value;
        this.notifyListeners();
    }

    // Instance management
    getCurrentInstanceId() {
        return this.state.currentOutfitInstanceId;
    }

    setCurrentInstanceId(instanceId) {
        this.state.currentOutfitInstanceId = instanceId;
        this.notifyListeners();
    }

    // Panel visibility
    setPanelVisibility(panelType, isVisible) {
        this.state.panelVisibility[panelType] = isVisible;
        this.notifyListeners();
    }

    getPanelVisibility(panelType) {
        return this.state.panelVisibility[panelType];
    }

    // Panel references
    setPanelRef(panelType, panel) {
        this.state.references[`${panelType}Panel`] = panel;
        this.notifyListeners();
    }

    getPanelRef(panelType) {
        return this.state.references[`${panelType}Panel`];
    }

    // Auto outfit system reference
    setAutoOutfitSystem(autoOutfitSystem) {
        this.state.references.autoOutfitSystem = autoOutfitSystem;
        this.notifyListeners();
    }

    getAutoOutfitSystem() {
        return this.state.references.autoOutfitSystem;
    }

    // Context
    setCurrentCharacter(characterId) {
        this.state.currentCharacterId = characterId;
        this.notifyListeners();
    }

    getCurrentCharacter() {
        return this.state.currentCharacterId;
    }

    setCurrentChat(chatId) {
        this.state.currentChatId = chatId;
        this.notifyListeners();
    }

    getCurrentChat() {
        return this.state.currentChatId;
    }

    // Persist all data to extension settings for reload persistence
    persistToSettings() {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : null;
        const saveSettingsFn = context?.saveSettingsDebounced || window.saveSettingsDebounced;
        const extensionSettings = this.getExtensionSettings();

        if (extensionSettings && extensionSettings[MODULE_NAME] && typeof saveSettingsFn === 'function') {
            // Update extension settings with current store state
            extensionSettings[MODULE_NAME].instances = structuredClone(this.state.botInstances);
            extensionSettings[MODULE_NAME].user_instances = structuredClone(this.state.userInstances);
            extensionSettings[MODULE_NAME].presets = structuredClone(this.state.presets);
            extensionSettings[MODULE_NAME].settings = structuredClone(this.state.settings);
            
            // Save settings if the debounced function is available
            saveSettingsFn();
        } else {
            console.warn('[OutfitTracker] Could not persist settings - save function or extension settings not available');
        }
    }
    
    // Update and save specific data
    updateAndSave(updates) {
        this.setState(updates);
        this.persistToSettings();
    }
    
    // Save settings for reload persistence
    saveSettings() {
        this.persistToSettings();
    }
    
    // Load data from extension settings for reload
    loadDataFromSettings() {
        const extensionSettings = this.getExtensionSettings();

        if (extensionSettings && extensionSettings[MODULE_NAME]) {
            const moduleSettings = extensionSettings[MODULE_NAME];
            
            // Load instances
            if (moduleSettings.instances) {
                this.state.botInstances = structuredClone(moduleSettings.instances);
            }
            if (moduleSettings.user_instances) {
                this.state.userInstances = structuredClone(moduleSettings.user_instances);
            }
            // Load presets
            if (moduleSettings.presets) {
                this.state.presets = structuredClone(moduleSettings.presets);
            }
            // Load settings
            if (moduleSettings.settings) {
                this.state.settings = structuredClone(moduleSettings.settings);
            }
        }
    }
}

// Create a single instance of the store
const outfitStore = new OutfitStore();

// Export the store instance and methods for accessing it
export { outfitStore };

// Export function to get current store state for debugging
export const getStoreState = () => {
    return outfitStore.getState();
};