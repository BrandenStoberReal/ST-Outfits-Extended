// Centralized Store for Outfit Tracker Extension
// Replaces usage of global variables with a proper state management system
import { DEFAULT_SETTINGS } from '../config/constants.js';

class OutfitStore {
    constructor() {
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
                botPanelColors: { ...DEFAULT_SETTINGS.botPanelColors },
                userPanelColors: { ...DEFAULT_SETTINGS.userPanelColors }
            },
            
            // Global settings
            settings: { ...DEFAULT_SETTINGS },
            
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
                listener(this.state);
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

    // Get current state
    getState() {
        return { ...this.state };
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
        this.state.botInstances[characterId][instanceId].bot = { ...outfitData };
        this.notifyListeners();
    }

    // User outfit data management
    getUserOutfit(instanceId) {
        return this.state.userInstances[instanceId] || {};
    }

    setUserOutfit(instanceId, outfitData) {
        this.state.userInstances[instanceId] = { ...outfitData };
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
            this.state.presets.bot[key][presetName] = { ...outfitData };
        } else {
            if (!this.state.presets.user[instanceId]) {
                this.state.presets.user[instanceId] = {};
            }
            this.state.presets.user[instanceId][presetName] = { ...outfitData };
        }
        this.notifyListeners();
    }

    // Method to delete a specific preset
    deletePreset(characterId, instanceId, presetName, type = 'bot') {
        const key = `${characterId}_${instanceId}`;
        
        if (type === 'bot') {
            if (this.state.presets.bot[key] && this.state.presets.bot[key][presetName]) {
                delete this.state.presets.bot[key][presetName];
                
                // Clean up empty objects
                if (Object.keys(this.state.presets.bot[key]).length === 0) {
                    delete this.state.presets.bot[key];
                }
            }
        } else if (this.state.presets.user[instanceId] && this.state.presets.user[instanceId][presetName]) {
            delete this.state.presets.user[instanceId][presetName];
                
            // Clean up empty objects
            if (Object.keys(this.state.presets.user[instanceId]).length === 0) {
                delete this.state.presets.user[instanceId];
            }
        }
        this.notifyListeners();
    }
    
    // Method to delete all presets for a character/instance
    deleteAllPresetsForCharacter(characterId, instanceId, type = 'bot') {
        const key = `${characterId}_${instanceId}`;
        
        if (type === 'bot') {
            if (this.state.presets.bot[key]) {
                delete this.state.presets.bot[key];
            }
        } else if (this.state.presets.user[instanceId]) {
            delete this.state.presets.user[instanceId];
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

    // Get the extension settings object properly using SillyTavern context
    getExtensionSettings() {
        // Try to get context through SillyTavern first, then fallback to window
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : 
            window.getContext ? window.getContext() : 
                window.extension_settings;
        
        if (context && typeof context === 'function') {
            return context().extensionSettings;
        } else if (context && context.extensionSettings) {
            return context.extensionSettings;
        } 
        return window.extension_settings;
        
    }

    // Get save settings function properly using SillyTavern context
    getSaveSettingsFunction() {
        // Try to get save function through SillyTavern first, then fallback to window
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() :
            window.getContext ? window.getContext() :
                null;
        
        if (context && typeof context === 'function') {
            return context().saveSettingsDebounced;
        } else if (context && context.saveSettingsDebounced) {
            return context.saveSettingsDebounced;
        } 
        return window.saveSettingsDebounced;
        
    }
    
    // Persist all data to extension settings for reload persistence
    persistToSettings() {
        let extensionSettings = this.getExtensionSettings();
        const saveSettingsFn = this.getSaveSettingsFunction();
        
        // Ensure the outfit_tracker module exists in settings
        if (!extensionSettings?.outfit_tracker) {
            if (extensionSettings) {
                extensionSettings.outfit_tracker = {};
            } else {
                // If we can't get extension settings through context, try direct window access
                if (!window.extension_settings?.outfit_tracker) {
                    window.extension_settings = window.extension_settings || {};
                    window.extension_settings.outfit_tracker = {};
                }
                // Update the extensionSettings to refer to window.extension_settings
                extensionSettings = window.extension_settings;
            }
        }

        if (extensionSettings.outfit_tracker && typeof saveSettingsFn === 'function') {
            // Update extension settings with current store state
            extensionSettings.outfit_tracker.instances = { ...this.state.botInstances };
            extensionSettings.outfit_tracker.user_instances = { ...this.state.userInstances };
            extensionSettings.outfit_tracker.presets = { ...this.state.presets };
            extensionSettings.outfit_tracker.settings = { ...this.state.settings };
            
            // Save settings if the debounced function is available
            saveSettingsFn();
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
        
        if (extensionSettings?.outfit_tracker) {
            // Load instances
            if (extensionSettings.outfit_tracker.instances) {
                this.state.botInstances = { ...extensionSettings.outfit_tracker.instances };
            }
            if (extensionSettings.outfit_tracker.user_instances) {
                this.state.userInstances = { ...extensionSettings.outfit_tracker.user_instances };
            }
            // Load presets
            if (extensionSettings.outfit_tracker.presets) {
                this.state.presets = { ...extensionSettings.outfit_tracker.presets };
            }
            // Load settings
            if (extensionSettings.outfit_tracker.settings) {
                this.state.settings = { ...extensionSettings.outfit_tracker.settings };
            }
        } else if (window.extension_settings?.outfit_tracker) {
            // Fallback to window.extension_settings if context approach failed
            const moduleSettings = window.extension_settings.outfit_tracker;
            
            // Load instances
            if (moduleSettings.instances) {
                this.state.botInstances = { ...moduleSettings.instances };
            }
            if (moduleSettings.user_instances) {
                this.state.userInstances = { ...moduleSettings.user_instances };
            }
            // Load presets
            if (moduleSettings.presets) {
                this.state.presets = { ...moduleSettings.presets };
            }
            // Load settings
            if (moduleSettings.settings) {
                this.state.settings = { ...moduleSettings.settings };
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