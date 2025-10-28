import { DEFAULT_SETTINGS } from '../config/constants.js';
import { deepClone } from '../utils/utilities.js';
import { debouncedStore } from './DebouncedStore.js';
import { debugLog } from '../logging/DebugLogger.js';
class OutfitStore {
    constructor() {
        this.dataManager = null;
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
                botPanelColors: Object.assign({}, DEFAULT_SETTINGS.botPanelColors),
                userPanelColors: Object.assign({}, DEFAULT_SETTINGS.userPanelColors),
            },
            settings: Object.assign({}, DEFAULT_SETTINGS),
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
    }
    /**
     * Sets the DataManager for synchronization
     * @param dataManager The DataManager instance to sync with
     */
    setDataManager(dataManager) {
        this.dataManager = dataManager;
        // Load initial data from DataManager to sync the store
        this.syncFromDataManager();
    }
    /**
     * Synchronizes the store state from the DataManager
     */
    syncFromDataManager() {
        if (!this.dataManager) {
            debugLog('DataManager not available for synchronization', null, 'warn');
            return;
        }
        try {
            const data = this.dataManager.loadOutfitData();
            // Update the store's instance data from DataManager
            this.state.botInstances = data.botInstances || {};
            this.state.userInstances = data.userInstances || {};
            // Also update presets if they exist in the DataManager
            const allData = this.dataManager.load();
            if (allData && allData.presets) {
                this.state.presets = {
                    bot: Object.assign(Object.assign({}, this.state.presets.bot), allData.presets.bot),
                    user: Object.assign(Object.assign({}, this.state.presets.user), allData.presets.user)
                };
            }
            // Notify listeners that the state has been updated
            this.notifyListeners();
            debugLog('Store synchronized from DataManager', {
                botInstanceCount: Object.keys(this.state.botInstances).length,
                userInstanceCount: Object.keys(this.state.userInstances).length
            }, 'debug');
        }
        catch (error) {
            debugLog('Error during synchronization from DataManager', error, 'error');
        }
    }
    /**
     * Synchronizes the store state to the DataManager
     */
    syncToDataManager() {
        if (!this.dataManager) {
            debugLog('DataManager not available for synchronization', null, 'warn');
            return;
        }
        try {
            // Prepare the outfit data to save to DataManager
            const outfitData = {
                botInstances: this.state.botInstances,
                userInstances: this.state.userInstances,
                presets: this.state.presets
            };
            // Save the instance data to DataManager
            this.dataManager.savePartial(outfitData);
            debugLog('Store synchronized to DataManager', {
                botInstanceCount: Object.keys(this.state.botInstances).length,
                userInstanceCount: Object.keys(this.state.userInstances).length
            }, 'debug');
        }
        catch (error) {
            debugLog('Error during synchronization to DataManager', error, 'error');
        }
    }
    /**
     * Updates the state and synchronizes with DataManager
     */
    setState(updates) {
        var _a, _b, _c, _d;
        // Deep clone the current state to avoid reference issues
        const currentStateClone = deepClone(this.state);
        // Create a deep clone of the updates to avoid reference issues
        const updatesClone = deepClone(updates);
        // Ensure that critical nested objects maintain their structure with proper deep merging
        this.state = Object.assign(Object.assign(Object.assign({}, currentStateClone), updatesClone), { presets: {
                bot: Object.assign(Object.assign({}, (((_a = currentStateClone.presets) === null || _a === void 0 ? void 0 : _a.bot) || {})), (((_b = updatesClone === null || updatesClone === void 0 ? void 0 : updatesClone.presets) === null || _b === void 0 ? void 0 : _b.bot) || {})),
                user: Object.assign(Object.assign({}, (((_c = currentStateClone.presets) === null || _c === void 0 ? void 0 : _c.user) || {})), (((_d = updatesClone === null || updatesClone === void 0 ? void 0 : updatesClone.presets) === null || _d === void 0 ? void 0 : _d.user) || {}))
            }, botInstances: Object.assign(Object.assign({}, (currentStateClone.botInstances || {})), ((updatesClone === null || updatesClone === void 0 ? void 0 : updatesClone.botInstances) || {})), userInstances: Object.assign(Object.assign({}, (currentStateClone.userInstances || {})), ((updatesClone === null || updatesClone === void 0 ? void 0 : updatesClone.userInstances) || {})), 
            // Keep other nested objects safe from undefined values
            panelSettings: Object.assign(Object.assign({}, currentStateClone.panelSettings), ((updatesClone === null || updatesClone === void 0 ? void 0 : updatesClone.panelSettings) || {})), settings: Object.assign(Object.assign({}, currentStateClone.settings), ((updatesClone === null || updatesClone === void 0 ? void 0 : updatesClone.settings) || {})), panelVisibility: Object.assign(Object.assign({}, currentStateClone.panelVisibility), ((updatesClone === null || updatesClone === void 0 ? void 0 : updatesClone.panelVisibility) || {})), references: Object.assign(Object.assign({}, currentStateClone.references), ((updatesClone === null || updatesClone === void 0 ? void 0 : updatesClone.references) || {})) });
        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            // Check if any data that should be persisted to DataManager has changed
            const syncData = {};
            // Only sync properties that actually changed and are managed by DataManager
            if ('botInstances' in updatesClone) {
                syncData.botInstances = this.state.botInstances;
            }
            if ('userInstances' in updatesClone) {
                syncData.userInstances = this.state.userInstances;
            }
            if ('presets' in updatesClone) {
                syncData.presets = this.state.presets;
            }
            if ('settings' in updatesClone) {
                syncData.settings = this.state.settings;
            }
            if (Object.keys(syncData).length > 0) {
                this.dataManager.savePartial(syncData);
            }
        }
        this.notifyListeners();
    }
    /**
     * Updates the state and saves to storage
     */
    updateAndSave(updates) {
        this.setState(updates);
        debouncedStore.saveState();
    }
    subscribe(listener) {
        this.state.listeners.push(listener);
        return () => {
            this.state.listeners = this.state.listeners.filter(l => l !== listener);
        };
    }
    notifyListeners() {
        this.state.listeners.forEach(listener => {
            try {
                listener(this.state);
            }
            catch (error) {
                debugLog('Error in store listener', error, 'error');
            }
        });
    }
    getState() {
        return deepClone(this.state);
    }
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
    setBotOutfit(characterId, instanceId, outfitData) {
        if (!this.state.botInstances[characterId]) {
            this.state.botInstances[characterId] = {};
        }
        if (!this.state.botInstances[characterId][instanceId]) {
            this.state.botInstances[characterId][instanceId] = { bot: {}, user: {} };
        }
        // Preserve any existing promptInjectionEnabled value
        const existingInstanceData = this.state.botInstances[characterId][instanceId];
        const promptInjectionEnabled = existingInstanceData === null || existingInstanceData === void 0 ? void 0 : existingInstanceData.promptInjectionEnabled;
        this.state.botInstances[characterId][instanceId] = {
            bot: Object.assign({}, outfitData),
            user: this.state.botInstances[characterId][instanceId].user || {},
            promptInjectionEnabled
        };
        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            this.dataManager.savePartial({
                botInstances: this.state.botInstances
            });
        }
        this.notifyListeners();
    }
    getUserOutfit(instanceId) {
        const instanceData = this.state.userInstances[instanceId];
        return deepClone(instanceData || {});
    }
    setUserOutfit(instanceId, outfitData) {
        // Preserve any existing promptInjectionEnabled value
        const existingInstanceData = this.state.userInstances[instanceId];
        let promptInjectionEnabled;
        if (existingInstanceData && typeof existingInstanceData === 'object' && 'promptInjectionEnabled' in existingInstanceData) {
            promptInjectionEnabled = existingInstanceData.promptInjectionEnabled;
        }
        // Create the new instance data with both outfit data and settings
        const updatedInstanceData = Object.assign({}, outfitData);
        if (promptInjectionEnabled !== undefined) {
            updatedInstanceData.promptInjectionEnabled = promptInjectionEnabled;
        }
        this.state.userInstances[instanceId] = updatedInstanceData;
        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            this.dataManager.savePartial({
                userInstances: this.state.userInstances
            });
        }
        this.notifyListeners();
    }
    getSetting(key) {
        return this.state.settings[key];
    }
    setSetting(key, value) {
        this.state.settings[key] = value;
        // Synchronize settings changes to the DataManager
        if (this.dataManager) {
            this.dataManager.savePartial({
                settings: this.state.settings
            });
        }
        this.notifyListeners();
    }
    getCurrentInstanceId() {
        return this.state.currentOutfitInstanceId;
    }
    setCurrentInstanceId(instanceId) {
        this.state.currentOutfitInstanceId = instanceId;
        this.notifyListeners();
    }
    setPanelVisibility(panelType, isVisible) {
        this.state.panelVisibility[panelType] = isVisible;
        this.notifyListeners();
    }
    getPanelVisibility(panelType) {
        return this.state.panelVisibility[panelType];
    }
    setPanelRef(panelType, panel) {
        this.state.references[`${panelType}Panel`] = panel;
        this.notifyListeners();
    }
    getPanelRef(panelType) {
        return this.state.references[`${panelType}Panel`];
    }
    setAutoOutfitSystem(autoOutfitSystem) {
        this.state.references.autoOutfitSystem = autoOutfitSystem;
        this.notifyListeners();
    }
    getAutoOutfitSystem() {
        return this.state.references.autoOutfitSystem;
    }
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
        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            this.dataManager.savePartial({
                botInstances: this.state.botInstances
            });
        }
        this.notifyListeners();
    }
    getCharacterInstances(characterId) {
        const characterData = this.state.botInstances[characterId];
        if (!characterData) {
            return [];
        }
        return Object.keys(characterData);
    }
    clearCharacterOutfits(characterId) {
        if (this.state.botInstances[characterId]) {
            delete this.state.botInstances[characterId];
        }
        for (const key in this.state.presets.bot) {
            if (key.startsWith(`${characterId}_`)) {
                delete this.state.presets.bot[key];
            }
        }
        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            this.dataManager.savePartial({
                botInstances: this.state.botInstances,
                presets: this.state.presets
            });
        }
        this.notifyListeners();
    }
    /**
     * Wipes all outfit data including bot instances, user instances, and presets
     */
    wipeAllOutfitData() {
        // Clear all bot instances
        this.state.botInstances = {};
        // Clear all user instances
        this.state.userInstances = {};
        // Clear all presets
        this.state.presets = {
            bot: {},
            user: {}
        };
        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            this.dataManager.savePartial({
                botInstances: this.state.botInstances,
                userInstances: this.state.userInstances,
                presets: this.state.presets
            });
        }
        this.notifyListeners();
    }
    /**
     * Forces a complete resynchronization of the outfit store from the DataManager.
     * This can be used to fix any potential desynchronization between the store and DataManager.
     */
    forceResyncFromDataManager() {
        if (this.dataManager) {
            this.syncFromDataManager();
        }
        else {
            debugLog('Cannot force resync: DataManager not available', null, 'warn');
        }
    }
}
const outfitStore = new OutfitStore();
export { outfitStore };
export const getStoreState = () => {
    return outfitStore.getState();
};
