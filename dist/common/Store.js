import { DEFAULT_SETTINGS } from '../config/constants.js';
import { deepClone } from '../utils/utilities.js';
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
        this.dataManager = null;
    }
    setDataManager(dataManager) {
        this.dataManager = dataManager;
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
                console.error('Error in store listener:', error);
            }
        });
    }
    setState(updates) {
        var _a, _b, _c, _d;
        // Ensure that critical nested objects maintain their structure
        this.state = Object.assign(Object.assign(Object.assign({}, this.state), updates), { presets: {
                bot: Object.assign(Object.assign({}, (((_a = this.state.presets) === null || _a === void 0 ? void 0 : _a.bot) || {})), (((_b = updates === null || updates === void 0 ? void 0 : updates.presets) === null || _b === void 0 ? void 0 : _b.bot) || {})),
                user: Object.assign(Object.assign({}, (((_c = this.state.presets) === null || _c === void 0 ? void 0 : _c.user) || {})), (((_d = updates === null || updates === void 0 ? void 0 : updates.presets) === null || _d === void 0 ? void 0 : _d.user) || {}))
            }, botInstances: Object.assign(Object.assign({}, (this.state.botInstances || {})), ((updates === null || updates === void 0 ? void 0 : updates.botInstances) || {})), userInstances: Object.assign(Object.assign({}, (this.state.userInstances || {})), ((updates === null || updates === void 0 ? void 0 : updates.userInstances) || {})), 
            // Keep other nested objects safe from undefined values
            panelSettings: Object.assign(Object.assign({}, this.state.panelSettings), ((updates === null || updates === void 0 ? void 0 : updates.panelSettings) || {})), settings: Object.assign(Object.assign({}, this.state.settings), ((updates === null || updates === void 0 ? void 0 : updates.settings) || {})), panelVisibility: Object.assign(Object.assign({}, this.state.panelVisibility), ((updates === null || updates === void 0 ? void 0 : updates.panelVisibility) || {})), references: Object.assign(Object.assign({}, this.state.references), ((updates === null || updates === void 0 ? void 0 : updates.references) || {})) });
        this.notifyListeners();
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
        this.notifyListeners();
    }
    getPresets(characterId, instanceId) {
        var _a, _b;
        const botPresetKey = this._generateBotPresetKey(characterId, instanceId);
        const userPresetKey = instanceId || 'default';
        // Ensure presets and its sub-properties exist to prevent undefined errors
        const botPresets = ((_a = this.state.presets) === null || _a === void 0 ? void 0 : _a.bot) || {};
        const userPresets = ((_b = this.state.presets) === null || _b === void 0 ? void 0 : _b.user) || {};
        return {
            bot: deepClone(botPresets[botPresetKey] || {}),
            user: deepClone(userPresets[userPresetKey] || {}),
        };
    }
    savePreset(characterId, instanceId, presetName, outfitData, type = 'bot') {
        if (type === 'bot') {
            const key = this._generateBotPresetKey(characterId, instanceId);
            // Ensure presets.bot exists
            if (!this.state.presets.bot) {
                this.state.presets.bot = {};
            }
            if (!this.state.presets.bot[key]) {
                this.state.presets.bot[key] = {};
            }
            this.state.presets.bot[key][presetName] = Object.assign({}, outfitData);
        }
        else {
            const key = instanceId || 'default';
            // Ensure presets.user exists
            if (!this.state.presets.user) {
                this.state.presets.user = {};
            }
            if (!this.state.presets.user[key]) {
                this.state.presets.user[key] = {};
            }
            this.state.presets.user[key][presetName] = Object.assign({}, outfitData);
        }
        this.notifyListeners();
    }
    deletePreset(characterId, instanceId, presetName, type = 'bot') {
        var _a, _b, _c, _d;
        if (type === 'bot') {
            const key = this._generateBotPresetKey(characterId, instanceId);
            if ((_b = (_a = this.state.presets.bot) === null || _a === void 0 ? void 0 : _a[key]) === null || _b === void 0 ? void 0 : _b[presetName]) {
                delete this.state.presets.bot[key][presetName];
                if (Object.keys(this.state.presets.bot[key]).length === 0) {
                    delete this.state.presets.bot[key];
                }
            }
        }
        else {
            const key = instanceId || 'default';
            if ((_d = (_c = this.state.presets.user) === null || _c === void 0 ? void 0 : _c[key]) === null || _d === void 0 ? void 0 : _d[presetName]) {
                delete this.state.presets.user[key][presetName];
                if (Object.keys(this.state.presets.user[key]).length === 0) {
                    delete this.state.presets.user[key];
                }
            }
        }
        this.notifyListeners();
    }
    deleteAllPresetsForCharacter(characterId, instanceId, type = 'bot') {
        var _a, _b;
        if (type === 'bot') {
            const key = this._generateBotPresetKey(characterId, instanceId);
            if ((_a = this.state.presets.bot) === null || _a === void 0 ? void 0 : _a[key]) {
                delete this.state.presets.bot[key];
            }
        }
        else {
            const key = instanceId || 'default';
            if ((_b = this.state.presets.user) === null || _b === void 0 ? void 0 : _b[key]) {
                delete this.state.presets.user[key];
            }
        }
        this.notifyListeners();
    }
    getAllPresets(characterId, instanceId, type = 'bot') {
        var _a, _b;
        if (type === 'bot') {
            const key = this._generateBotPresetKey(characterId, instanceId);
            return deepClone(((_a = this.state.presets.bot) === null || _a === void 0 ? void 0 : _a[key]) || {});
        }
        const key = instanceId || 'default';
        return deepClone(((_b = this.state.presets.user) === null || _b === void 0 ? void 0 : _b[key]) || {});
    }
    _generateBotPresetKey(characterId, instanceId) {
        if (!characterId) {
            throw new Error('Character ID is required for generating bot preset key');
        }
        if (!instanceId) {
            throw new Error('Instance ID is required for generating bot preset key');
        }
        return `${characterId}_${instanceId}`;
    }
    getSetting(key) {
        return this.state.settings[key];
    }
    setSetting(key, value) {
        this.state.settings[key] = value;
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
    updateAndSave(updates) {
        this.setState(updates);
        this.saveState();
    }
    saveState() {
        if (!this.dataManager) {
            return;
        }
        const { botInstances, userInstances, presets, settings } = this.state;
        this.dataManager.saveOutfitData({ botInstances, userInstances, presets });
        this.dataManager.saveSettings(settings);
    }
    loadState() {
        if (!this.dataManager) {
            return;
        }
        const { botInstances, userInstances, presets } = this.dataManager.loadOutfitData();
        const settings = this.dataManager.loadSettings();
        // Ensure presets is properly structured even if loaded data is undefined or missing
        const safePresets = presets || {
            bot: {},
            user: {}
        };
        this.setState({ botInstances, userInstances, presets: safePresets, settings });
    }
    flush() {
        if (!this.dataManager) {
            return;
        }
        this.dataManager.flush();
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
        this.notifyListeners();
    }
}
const outfitStore = new OutfitStore();
export { outfitStore };
export const getStoreState = () => {
    return outfitStore.getState();
};
