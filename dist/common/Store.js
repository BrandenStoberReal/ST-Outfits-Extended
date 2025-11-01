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
        this.state = Object.assign(Object.assign({}, this.state), updates);
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
        // Check if characterId or instanceId are undefined/null to prevent errors
        if (!characterId || !instanceId) {
            console.warn(`[OutfitStore] getPresets called with invalid parameters: characterId=${characterId}, instanceId=${instanceId}`);
            return {
                bot: {},
                user: deepClone(this.state.presets.user[instanceId || 'default'] || {})
            };
        }
        const botPresetKey = this._generateBotPresetKey(characterId, instanceId);
        const userPresetKey = instanceId || 'default';
        // Ensure presets objects exist before accessing them
        const botPresets = ((_a = this.state.presets) === null || _a === void 0 ? void 0 : _a.bot) || {};
        const userPresets = ((_b = this.state.presets) === null || _b === void 0 ? void 0 : _b.user) || {};
        return {
            bot: deepClone(botPresets[botPresetKey] || {}),
            user: deepClone(userPresets[userPresetKey] || {}),
        };
    }
    savePreset(characterId, instanceId, presetName, outfitData, type = 'bot') {
        var _a, _b;
        if (type === 'bot') {
            // Check if characterId or instanceId are undefined/null to prevent errors
            if (!characterId || !instanceId) {
                console.warn(`[OutfitStore] savePreset called with invalid parameters: characterId=${characterId}, instanceId=${instanceId}`);
                return;
            }
            const key = this._generateBotPresetKey(characterId, instanceId);
            const botPresets = ((_a = this.state.presets) === null || _a === void 0 ? void 0 : _a.bot) || {};
            if (!botPresets[key]) {
                botPresets[key] = {};
            }
            botPresets[key][presetName] = Object.assign({}, outfitData);
            this.state.presets.bot = botPresets;
        }
        else {
            const key = instanceId || 'default';
            const userPresets = ((_b = this.state.presets) === null || _b === void 0 ? void 0 : _b.user) || {};
            if (!userPresets[key]) {
                userPresets[key] = {};
            }
            userPresets[key][presetName] = Object.assign({}, outfitData);
            this.state.presets.user = userPresets;
        }
        this.notifyListeners();
    }
    deletePreset(characterId, instanceId, presetName, type = 'bot') {
        var _a, _b, _c, _d;
        if (type === 'bot') {
            // Check if characterId or instanceId are undefined/null to prevent errors
            if (!characterId || !instanceId) {
                console.warn(`[OutfitStore] deletePreset called with invalid parameters: characterId=${characterId}, instanceId=${instanceId}`);
                return;
            }
            const key = this._generateBotPresetKey(characterId, instanceId);
            const botPresets = ((_a = this.state.presets) === null || _a === void 0 ? void 0 : _a.bot) || {};
            if ((_b = botPresets[key]) === null || _b === void 0 ? void 0 : _b[presetName]) {
                delete botPresets[key][presetName];
                if (Object.keys(botPresets[key] || {}).length === 0) {
                    delete botPresets[key];
                }
            }
            this.state.presets.bot = botPresets;
        }
        else {
            const key = instanceId || 'default';
            const userPresets = ((_c = this.state.presets) === null || _c === void 0 ? void 0 : _c.user) || {};
            if ((_d = userPresets[key]) === null || _d === void 0 ? void 0 : _d[presetName]) {
                delete userPresets[key][presetName];
                if (Object.keys(userPresets[key] || {}).length === 0) {
                    delete userPresets[key];
                }
            }
            this.state.presets.user = userPresets;
        }
        this.notifyListeners();
    }
    deleteAllPresetsForCharacter(characterId, instanceId, type = 'bot') {
        var _a, _b;
        if (type === 'bot') {
            // Check if characterId or instanceId are undefined/null to prevent errors
            if (!characterId || !instanceId) {
                console.warn(`[OutfitStore] deleteAllPresetsForCharacter called with invalid parameters: characterId=${characterId}, instanceId=${instanceId}`);
                return;
            }
            const key = this._generateBotPresetKey(characterId, instanceId);
            const botPresets = ((_a = this.state.presets) === null || _a === void 0 ? void 0 : _a.bot) || {};
            if (botPresets[key]) {
                delete botPresets[key];
                this.state.presets.bot = botPresets;
            }
        }
        else {
            const key = instanceId || 'default';
            const userPresets = ((_b = this.state.presets) === null || _b === void 0 ? void 0 : _b.user) || {};
            if (userPresets[key]) {
                delete userPresets[key];
                this.state.presets.user = userPresets;
            }
        }
        this.notifyListeners();
    }
    getAllPresets(characterId, instanceId, type = 'bot') {
        var _a, _b;
        if (type === 'bot') {
            // Check if characterId or instanceId are undefined/null to prevent errors
            if (!characterId || !instanceId) {
                console.warn(`[OutfitStore] getAllPresets called with invalid parameters: characterId=${characterId}, instanceId=${instanceId}`);
                return {};
            }
            const key = this._generateBotPresetKey(characterId, instanceId);
            const botPresets = ((_a = this.state.presets) === null || _a === void 0 ? void 0 : _a.bot) || {};
            return deepClone(botPresets[key] || {});
        }
        const key = instanceId || 'default';
        const userPresets = ((_b = this.state.presets) === null || _b === void 0 ? void 0 : _b.user) || {};
        return deepClone(userPresets[key] || {});
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
        this.setState({ botInstances, userInstances, presets, settings });
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
