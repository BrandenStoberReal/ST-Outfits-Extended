// Centralized Store for Outfit Tracker Extension
// Replaces usage of global variables with a proper state management system

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
            
            // Panel settings
            panelSettings: {
                botPanelColors: {
                    primary: 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)',
                    border: '#8a7fdb',
                    shadow: 'rgba(106, 79, 193, 0.4)'
                },
                userPanelColors: {
                    primary: 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)',
                    border: '#5da6f0',
                    shadow: 'rgba(26, 120, 209, 0.4)'
                }
            },
            
            // Global settings
            settings: {
                autoOpenBot: true,
                autoOpenUser: false,
                position: 'right',
                enableSysMessages: true,
                autoOutfitSystem: false,
                autoOutfitPrompt: '',
                autoOutfitConnectionProfile: null
            },
            
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

    // Migration from old storage format
    migrateFromLegacy(legacySettings) {
        try {
            // Migrate instance data
            if (legacySettings.outfit_tracker?.instances) {
                this.state.botInstances = { ...legacySettings.outfit_tracker.instances };
            }
            
            if (legacySettings.outfit_tracker?.user_instances) {
                this.state.userInstances = { ...legacySettings.outfit_tracker.user_instances };
            }
            
            // Migrate presets
            if (legacySettings.outfit_tracker?.presets) {
                this.state.presets = { ...legacySettings.outfit_tracker.presets };
            }
            
            // Migrate settings
            if (legacySettings.outfit_tracker) {
                // Map relevant settings
                const relevantSettings = ['autoOpenBot', 'autoOpenUser', 'position', 
                    'enableSysMessages', 'autoOutfitSystem', 
                    'autoOutfitPrompt', 'autoOutfitConnectionProfile',
                    'botPanelColors', 'userPanelColors'];
                
                for (const setting of relevantSettings) {
                    if (legacySettings.outfit_tracker[setting] !== undefined) {
                        if (setting.includes('PanelColors')) {
                            this.state.panelSettings[setting] = { ...legacySettings.outfit_tracker[setting] };
                        } else {
                            this.state.settings[setting] = legacySettings.outfit_tracker[setting];
                        }
                    }
                }
            }
            
            console.log('[OutfitTracker] Successfully migrated data from legacy format');
            return true;
        } catch (error) {
            console.error('[OutfitTracker] Error migrating legacy data:', error);
            return false;
        }
    }
    
    // Persist all data to extension settings for reload persistence
    persistToSettings() {
        if (window.extension_settings?.outfit_tracker) {
            // Update extension settings with current store state
            window.extension_settings.outfit_tracker.instances = this.state.botInstances;
            window.extension_settings.outfit_tracker.user_instances = this.state.userInstances;
            window.extension_settings.outfit_tracker.presets = this.state.presets;
            window.extension_settings.outfit_tracker.settings = this.state.settings;
            
            // Save settings if the debounced function is available
            if (typeof window.saveSettingsDebounced === 'function') {
                window.saveSettingsDebounced();
            }
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
        if (window.extension_settings?.outfit_tracker) {
            // Load instances
            if (window.extension_settings.outfit_tracker.instances) {
                this.state.botInstances = { ...window.extension_settings.outfit_tracker.instances };
            }
            if (window.extension_settings.outfit_tracker.user_instances) {
                this.state.userInstances = { ...window.extension_settings.outfit_tracker.user_instances };
            }
            // Load presets
            if (window.extension_settings.outfit_tracker.presets) {
                this.state.presets = { ...window.extension_settings.outfit_tracker.presets };
            }
            // Load settings
            if (window.extension_settings.outfit_tracker.settings) {
                this.state.settings = { ...window.extension_settings.outfit_tracker.settings };
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