// Centralized Store for Outfit Tracker Extension
// Replaces usage of global variables with a proper state management system
import { DEFAULT_SETTINGS } from '../config/constants.js';
import { dataPersistenceService } from '../services/DataPersistenceService.js';

// Utility function to create a deep clone of an object
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {return obj;}
    if (obj instanceof Date) {return new Date(obj.getTime());}
    if (obj instanceof Array) {return obj.map(item => deepClone(item));}
    if (typeof obj === 'object') {
        const clonedObj = {};

        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

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
        return deepClone(this.state);
    }

    // Bot outfit data management
    getBotOutfit(characterId, instanceId) {
        const characterData = this.state.botInstances[characterId];

        if (!characterData) {return {};}
        
        const instanceData = characterData[instanceId];

        if (!instanceData) {return {};}
        
        return deepClone(instanceData.bot || {});
    }

    setBotOutfit(characterId, instanceId, outfitData) {
        // Ensure the character exists in the store
        if (!this.state.botInstances[characterId]) {
            this.state.botInstances[characterId] = {};
        }
        
        // Ensure the instance exists for this character
        if (!this.state.botInstances[characterId][instanceId]) {
            this.state.botInstances[characterId][instanceId] = { bot: {}, user: {} };
        }
        
        // Update the bot outfit data for this instance
        this.state.botInstances[characterId][instanceId].bot = { ...outfitData };
        this.notifyListeners();
    }

    // User outfit data management
    getUserOutfit(instanceId) {
        const instanceData = this.state.userInstances[instanceId];

        return deepClone(instanceData || {});
    }

    setUserOutfit(instanceId, outfitData) {
        this.state.userInstances[instanceId] = { ...outfitData };
        this.notifyListeners();
    }

    // Preset management
    getPresets(characterId, instanceId) {
        // Use a more robust identifier for bot presets
        const botPresetKey = this._generateBotPresetKey(characterId, instanceId);
        const userPresetKey = instanceId || 'default';

        return {
            bot: deepClone(this.state.presets.bot[botPresetKey] || {}),
            user: deepClone(this.state.presets.user[userPresetKey] || {})
        };
    }

    savePreset(characterId, instanceId, presetName, outfitData, type = 'bot') {
        if (type === 'bot') {
            const key = this._generateBotPresetKey(characterId, instanceId);
            
            if (!this.state.presets.bot[key]) {
                this.state.presets.bot[key] = {};
            }
            this.state.presets.bot[key][presetName] = { ...outfitData };
        } else {
            const key = instanceId || 'default';
            
            if (!this.state.presets.user[key]) {
                this.state.presets.user[key] = {};
            }
            this.state.presets.user[key][presetName] = { ...outfitData };
        }
        this.notifyListeners();
    }

    // Method to delete a specific preset
    deletePreset(characterId, instanceId, presetName, type = 'bot') {
        if (type === 'bot') {
            const key = this._generateBotPresetKey(characterId, instanceId);
            
            if (this.state.presets.bot[key] && this.state.presets.bot[key][presetName]) {
                delete this.state.presets.bot[key][presetName];
                
                // Clean up empty objects
                if (Object.keys(this.state.presets.bot[key]).length === 0) {
                    delete this.state.presets.bot[key];
                }
            }
        } else {
            const key = instanceId || 'default';
            
            if (this.state.presets.user[key] && this.state.presets.user[key][presetName]) {
                delete this.state.presets.user[key][presetName];
                    
                // Clean up empty objects
                if (Object.keys(this.state.presets.user[key]).length === 0) {
                    delete this.state.presets.user[key];
                }
            }
        }
        this.notifyListeners();
    }
    
    // Method to delete all presets for a character/instance
    deleteAllPresetsForCharacter(characterId, instanceId, type = 'bot') {
        if (type === 'bot') {
            const key = this._generateBotPresetKey(characterId, instanceId);
            
            if (this.state.presets.bot[key]) {
                delete this.state.presets.bot[key];
            }
        } else {
            const key = instanceId || 'default';
            
            if (this.state.presets.user[key]) {
                delete this.state.presets.user[key];
            }
        }
        this.notifyListeners();
    }

    // Method to get all presets for a character/instance
    getAllPresets(characterId, instanceId, type = 'bot') {
        if (type === 'bot') {
            const key = this._generateBotPresetKey(characterId, instanceId);

            return deepClone(this.state.presets.bot[key] || {});
        } 
        const key = instanceId || 'default';

        return deepClone(this.state.presets.user[key] || {});
        
    }

    // Helper method to generate a consistent bot preset key
    _generateBotPresetKey(characterId, instanceId) {
        if (!characterId) {
            throw new Error('Character ID is required for generating bot preset key');
        }
        if (!instanceId) {
            throw new Error('Instance ID is required for generating bot preset key');
        }
        return `${characterId}_${instanceId}`;
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

    // Update and save specific data
    updateAndSave(updates) {
        this.setState(updates);
        this.saveSettings();
    }
    
    // Save settings for reload persistence using the dedicated service
    saveSettings() {
        // Prepare the data to save
        const dataToSave = {
            instances: deepClone(this.state.botInstances),
            user_instances: deepClone(this.state.userInstances),
            presets: deepClone(this.state.presets),
            settings: deepClone(this.state.settings)
        };
        
        dataPersistenceService.saveOutfitData({
            botInstances: dataToSave.instances,
            userInstances: dataToSave.user_instances,
            presets: dataToSave.presets
        });
        
        dataPersistenceService.saveSettings(dataToSave.settings);
    }
    
    // Load data from extension settings for reload using the dedicated service
    loadDataFromSettings() {
        // Load outfit data
        const outfitData = dataPersistenceService.loadOutfitData();

        this.state.botInstances = deepClone(outfitData.botInstances);
        this.state.userInstances = deepClone(outfitData.userInstances);
        this.state.presets = deepClone(outfitData.presets);
        
        // Load settings
        const settings = dataPersistenceService.loadSettings();

        this.state.settings = deepClone(settings);
    }
    
    // Force flush any pending save operations
    flush() {
        dataPersistenceService.flush();
    }
    
    // Cleanup method to remove unused instance data
    cleanupUnusedInstances(characterId, validInstanceIds) {
        if (!characterId || !this.state.botInstances[characterId]) {
            return;
        }
        
        const characterData = this.state.botInstances[characterId];

        for (const instanceId in characterData) {
            if (!validInstanceIds.includes(instanceId)) {
                delete characterData[instanceId];
            }
        }
        
        // Clean up empty character data
        if (Object.keys(characterData).length === 0) {
            delete this.state.botInstances[characterId];
        }
        
        this.notifyListeners();
    }
    
    // Get all available outfit instances for a character
    getCharacterInstances(characterId) {
        const characterData = this.state.botInstances[characterId];

        if (!characterData) {return [];}
        
        return Object.keys(characterData);
    }
    
    // Clear all outfit data for a character
    clearCharacterOutfits(characterId) {
        if (this.state.botInstances[characterId]) {
            delete this.state.botInstances[characterId];
        }
        
        // Also clear associated presets
        for (const key in this.state.presets.bot) {
            if (key.startsWith(`${characterId}_`)) {
                delete this.state.presets.bot[key];
            }
        }
        
        this.notifyListeners();
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