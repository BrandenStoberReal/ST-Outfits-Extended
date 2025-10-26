import {DEFAULT_SETTINGS} from '../config/constants.js';
import {deepClone} from '../utils/utilities.js';

class OutfitStore {
    constructor() {
        this.state = {
            botOutfits: {},
            userOutfits: {},
            botInstances: {},
            userInstances: {},
            presets: {
                bot: {},
                user: {},
            },
            panelSettings: {
                botPanelColors: {...DEFAULT_SETTINGS.botPanelColors},
                userPanelColors: {...DEFAULT_SETTINGS.userPanelColors},
            },
            settings: {...DEFAULT_SETTINGS},
            currentCharacterId: null,
            currentChatId: null,
            currentOutfitInstanceId: null,
            panelVisibility: {
                bot: false,
                user: false,
            },
            references: {
                botPanel: null,
                userPanel: null,
                autoOutfitSystem: null,
            },
            listeners: [],
        };
        this.dataManager = null;
    }

    /**
     * Sets the data manager for the store
     * @param {DataManager} dataManager - The data manager instance to use for persistence
     */
    setDataManager(dataManager) {
        this.dataManager = dataManager;
    }

    /**
     * Subscribe to store changes
     * @param {Function} listener - A function to be called when store state changes
     * @returns {Function} A function to unsubscribe the listener
     */
    subscribe(listener) {
        this.state.listeners.push(listener);
        return () => {
            this.state.listeners = this.state.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of state changes
     */
    notifyListeners() {
        this.state.listeners.forEach(listener => {
            try {
                listener(this.state);
            } catch (error) {
                console.error('Error in store listener:', error);
            }
        });
    }

    /**
     * Update the state with new values and notify listeners
     * @param {Object} updates - Object containing the state updates
     */
    setState(updates) {
        this.state = {...this.state, ...updates};
        this.notifyListeners();
    }

    /**
     * Get a deep clone of the current state
     * @returns {Object} A deep cloned copy of the state
     */
    getState() {
        return deepClone(this.state);
    }

    /**
     * Get bot outfit data for a specific character and instance
     * @param {string} characterId - The ID of the character
     * @param {string} instanceId - The ID of the instance
     * @returns {Object} The bot outfit data for the given character and instance
     */
    getBotOutfit(characterId, instanceId) {
        const characterData = this.state.botInstances[characterId];

        if (!characterData) {
            return {};
        }
        const instanceData = characterData[instanceId];

        if (!instanceData) {
            return {};
        }
        return deepClone(instanceData.bot || {});
    }

    /**
     * Set bot outfit data for a specific character and instance
     * @param {string} characterId - The ID of the character
     * @param {string} instanceId - The ID of the instance
     * @param {Object} outfitData - The outfit data to set
     */
    setBotOutfit(characterId, instanceId, outfitData) {
        if (!this.state.botInstances[characterId]) {
            this.state.botInstances[characterId] = {};
        }
        if (!this.state.botInstances[characterId][instanceId]) {
            this.state.botInstances[characterId][instanceId] = {bot: {}, user: {}};
        }
        this.state.botInstances[characterId][instanceId].bot = {...outfitData};
        this.notifyListeners();
    }

    /**
     * Get user outfit data for a specific instance
     * @param {string} instanceId - The ID of the instance
     * @returns {Object} The user outfit data for the given instance
     */
    getUserOutfit(instanceId) {
        const instanceData = this.state.userInstances[instanceId];

        return deepClone(instanceData || {});
    }

    /**
     * Set user outfit data for a specific instance
     * @param {string} instanceId - The ID of the instance
     * @param {Object} outfitData - The outfit data to set
     */
    setUserOutfit(instanceId, outfitData) {
        this.state.userInstances[instanceId] = {...outfitData};
        this.notifyListeners();
    }

    /**
     * Get presets for a character and instance
     * @param {string} characterId - The ID of the character
     * @param {string} instanceId - The ID of the instance
     * @returns {Object} An object containing bot and user presets
     */
    getPresets(characterId, instanceId) {
        const botPresetKey = this._generateBotPresetKey(characterId, instanceId);
        const userPresetKey = instanceId || 'default';

        return {
            bot: deepClone(this.state.presets.bot[botPresetKey] || {}),
            user: deepClone(this.state.presets.user[userPresetKey] || {}),
        };
    }

    /**
     * Save a preset for a character or user
     * @param {string} characterId - The ID of the character
     * @param {string} instanceId - The ID of the instance
     * @param {string} presetName - The name of the preset
     * @param {Object} outfitData - The outfit data to save
     * @param {string} type - The type of preset ('bot' or 'user')
     */
    savePreset(characterId, instanceId, presetName, outfitData, type = 'bot') {
        if (type === 'bot') {
            const key = this._generateBotPresetKey(characterId, instanceId);

            if (!this.state.presets.bot[key]) {
                this.state.presets.bot[key] = {};
            }
            this.state.presets.bot[key][presetName] = {...outfitData};
        } else {
            const key = instanceId || 'default';

            if (!this.state.presets.user[key]) {
                this.state.presets.user[key] = {};
            }
            this.state.presets.user[key][presetName] = {...outfitData};
        }
        this.notifyListeners();
    }

    /**
     * Delete a preset for a character or user
     * @param {string} characterId - The ID of the character
     * @param {string} instanceId - The ID of the instance
     * @param {string} presetName - The name of the preset to delete
     * @param {string} type - The type of preset ('bot' or 'user')
     */
    deletePreset(characterId, instanceId, presetName, type = 'bot') {
        if (type === 'bot') {
            const key = this._generateBotPresetKey(characterId, instanceId);

            if (this.state.presets.bot[key]?.[presetName]) {
                delete this.state.presets.bot[key][presetName];
                if (Object.keys(this.state.presets.bot[key]).length === 0) {
                    delete this.state.presets.bot[key];
                }
            }
        } else {
            const key = instanceId || 'default';

            if (this.state.presets.user[key]?.[presetName]) {
                delete this.state.presets.user[key][presetName];
                if (Object.keys(this.state.presets.user[key]).length === 0) {
                    delete this.state.presets.user[key];
                }
            }
        }
        this.notifyListeners();
    }

    /**
     * Delete all presets for a character
     * @param {string} characterId - The ID of the character
     * @param {string} instanceId - The ID of the instance
     * @param {string} type - The type of preset ('bot' or 'user')
     */
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

    /**
     * Get all presets for a character or user instance
     * @param {string} characterId - The ID of the character
     * @param {string} instanceId - The ID of the instance
     * @param {string} type - The type of preset ('bot' or 'user')
     * @returns {Object} An object containing all presets of the specified type
     */
    getAllPresets(characterId, instanceId, type = 'bot') {
        if (type === 'bot') {
            const key = this._generateBotPresetKey(characterId, instanceId);

            return deepClone(this.state.presets.bot[key] || {});
        }
        const key = instanceId || 'default';

        return deepClone(this.state.presets.user[key] || {});
    }

    /**
     * Generate a key for bot presets
     * @private
     * @param {string} characterId - The ID of the character
     * @param {string} instanceId - The ID of the instance
     * @returns {string} The generated key for bot presets
     * @throws {Error} If characterId or instanceId is not provided
     */
    _generateBotPresetKey(characterId, instanceId) {
        if (!characterId) {
            throw new Error('Character ID is required for generating bot preset key');
        }
        if (!instanceId) {
            throw new Error('Instance ID is required for generating bot preset key');
        }
        return `${characterId}_${instanceId}`;
    }

    /**
     * Get a specific setting value
     * @param {string} key - The key of the setting to retrieve
     * @returns {*} The value of the setting
     */
    getSetting(key) {
        return this.state.settings[key];
    }

    /**
     * Set a specific setting value
     * @param {string} key - The key of the setting to set
     * @param {*} value - The value to set
     */
    setSetting(key, value) {
        this.state.settings[key] = value;
        this.notifyListeners();
    }

    /**
     * Get the current outfit instance ID
     * @returns {string|null} The current outfit instance ID
     */
    getCurrentInstanceId() {
        return this.state.currentOutfitInstanceId;
    }

    /**
     * Set the current outfit instance ID
     * @param {string} instanceId - The instance ID to set
     */
    setCurrentInstanceId(instanceId) {
        this.state.currentOutfitInstanceId = instanceId;
        this.notifyListeners();
    }

    /**
     * Set the visibility state of a panel
     * @param {string} panelType - The type of panel ('bot' or 'user')
     * @param {boolean} isVisible - Whether the panel is visible
     */
    setPanelVisibility(panelType, isVisible) {
        this.state.panelVisibility[panelType] = isVisible;
        this.notifyListeners();
    }

    /**
     * Get the visibility state of a panel
     * @param {string} panelType - The type of panel ('bot' or 'user')
     * @returns {boolean} Whether the panel is visible
     */
    getPanelVisibility(panelType) {
        return this.state.panelVisibility[panelType];
    }

    /**
     * Set a panel reference
     * @param {string} panelType - The type of panel ('bot' or 'user')
     * @param {Object} panel - The panel instance
     */
    setPanelRef(panelType, panel) {
        this.state.references[`${panelType}Panel`] = panel;
        this.notifyListeners();
    }

    /**
     * Get a panel reference
     * @param {string} panelType - The type of panel ('bot' or 'user')
     * @returns {Object} The panel instance
     */
    getPanelRef(panelType) {
        return this.state.references[`${panelType}Panel`];
    }

    /**
     * Set the auto outfit system reference
     * @param {Object} autoOutfitSystem - The auto outfit system instance
     */
    setAutoOutfitSystem(autoOutfitSystem) {
        this.state.references.autoOutfitSystem = autoOutfitSystem;
        this.notifyListeners();
    }

    /**
     * Get the auto outfit system reference
     * @returns {Object} The auto outfit system instance
     */
    getAutoOutfitSystem() {
        return this.state.references.autoOutfitSystem;
    }

    /**
     * Set the current character ID
     * @param {string} characterId - The character ID to set
     */
    setCurrentCharacter(characterId) {
        this.state.currentCharacterId = characterId;
        this.notifyListeners();
    }

    /**
     * Get the current character ID
     * @returns {string|null} The current character ID
     */
    getCurrentCharacter() {
        return this.state.currentCharacterId;
    }

    /**
     * Set the current chat ID
     * @param {string} chatId - The chat ID to set
     */
    setCurrentChat(chatId) {
        this.state.currentChatId = chatId;
        this.notifyListeners();
    }

    /**
     * Get the current chat ID
     * @returns {string|null} The current chat ID
     */
    getCurrentChat() {
        return this.state.currentChatId;
    }

    /**
     * Update and save state changes
     * @param {Object} updates - The state updates to apply
     */
    updateAndSave(updates) {
        this.setState(updates);
        this.saveState();
    }

    /**
     * Save the current state to the data manager
     */
    saveState() {
        if (!this.dataManager) {
            return;
        }
        const {botInstances, userInstances, presets, settings} = this.state;

        this.dataManager.saveOutfitData({botInstances, userInstances, presets});
        this.dataManager.saveSettings(settings);
    }

    /**
     * Load state from the data manager
     */
    loadState() {
        if (!this.dataManager) {
            return;
        }
        const {botInstances, userInstances, presets} = this.dataManager.loadOutfitData();
        const settings = this.dataManager.loadSettings();

        this.setState({botInstances, userInstances, presets, settings});
    }

    /**
     * Flush data to the data manager
     */
    flush() {
        if (!this.dataManager) {
            return;
        }
        this.dataManager.flush();
    }

    /**
     * Clean up unused instances for a character
     * @param {string} characterId - The ID of the character
     * @param {Array<string>} validInstanceIds - Array of valid instance IDs
     */
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

        if (Object.keys(characterData).length === 0) {
            delete this.state.botInstances[characterId];
        }
        this.notifyListeners();
    }

    /**
     * Get all instance IDs for a character
     * @param {string} characterId - The ID of the character
     * @returns {Array<string>} Array of instance IDs for the character
     */
    getCharacterInstances(characterId) {
        const characterData = this.state.botInstances[characterId];

        if (!characterData) {
            return [];
        }
        return Object.keys(characterData);
    }

    /**
     * Clear all outfit data for a character
     * @param {string} characterId - The ID of the character to clear
     */
    clearCharacterOutfits(characterId) {
        if (this.state.botInstances[characterId]) {
            delete this.state.botInstances[characterId];
        }

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
export {outfitStore};


// Export function to get current store state for debugging
export const getStoreState = () => {
    return outfitStore.getState();
};