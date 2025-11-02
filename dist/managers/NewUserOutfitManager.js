var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { OutfitManager } from './OutfitManager.js';
import { outfitStore } from '../common/Store.js';
import { debugLog } from '../logging/DebugLogger.js';
export class NewUserOutfitManager extends OutfitManager {
    constructor(slots) {
        super(slots);
        this.character = 'User';
    }
    getVarName(slot) {
        if (!this.outfitInstanceId) {
            return `OUTFIT_INST_USER_${slot}`;
        }
        return `OUTFIT_INST_USER_${this.outfitInstanceId}_${slot}`;
    }
    loadOutfit() {
        if (!this.outfitInstanceId) {
            debugLog('[NewUserOutfitManager] Cannot load outfit - missing outfitInstanceId', null, 'warn');
            this.slots.forEach(slot => {
                this.currentValues[slot] = 'None';
            });
            return;
        }
        const userOutfit = outfitStore.getUserOutfit(this.outfitInstanceId);
        this.slots.forEach(slot => {
            const value = userOutfit[slot] !== undefined ? userOutfit[slot] : 'None';
            this.currentValues[slot] = value;
        });
    }
    saveOutfit() {
        if (!this.outfitInstanceId) {
            debugLog('[NewUserOutfitManager] Cannot save outfit - missing outfitInstanceId', null, 'warn');
            return;
        }
        const userOutfit = {};
        this.slots.forEach(slot => {
            userOutfit[slot] = this.currentValues[slot] || 'None';
        });
        outfitStore.setUserOutfit(this.outfitInstanceId, userOutfit);
        outfitStore.saveState();
    }
    setOutfitItem(slot, value) {
        const _super = Object.create(null, {
            setOutfitItem: { get: () => super.setOutfitItem }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const message = yield _super.setOutfitItem.call(this, slot, value);
            if (message) {
                return message.replace(this.character, 'You');
            }
            return null;
        });
    }
    savePreset(presetName, instanceId = null) {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            debugLog('[NewUserOutfitManager] Invalid preset name provided', null, 'error');
            return '[Outfit System] Invalid preset name provided.';
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        outfitStore.savePreset('user', actualInstanceId, presetName, presetData, 'user');
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Saved "${presetName}" outfit for user character (instance: ${actualInstanceId}).`;
        }
        return '';
    }
    loadPreset(presetName_1) {
        return __awaiter(this, arguments, void 0, function* (presetName, instanceId = null) {
            if (!presetName || typeof presetName !== 'string') {
                return `[Outfit System] Invalid preset name: ${presetName}`;
            }
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            // Ensure instanceId is defined before attempting to get presets
            if (!actualInstanceId) {
                return `[Outfit System] Invalid instance ID: ${actualInstanceId}`;
            }
            const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
            if (!presets || !presets[presetName]) {
                return `[Outfit System] Preset "${presetName}" not found for user instance ${actualInstanceId}.`;
            }
            const preset = presets[presetName];
            let changed = false;
            for (const [slot, value] of Object.entries(preset)) {
                if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                    yield this.setOutfitItem(slot, value);
                    changed = true;
                }
            }
            if (changed) {
                return `You changed into the "${presetName}" outfit (instance: ${actualInstanceId}).`;
            }
            return `You are already wearing the "${presetName}" outfit (instance: ${actualInstanceId}).`;
        });
    }
    deletePreset(presetName, instanceId = null) {
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        // Ensure instanceId is defined before attempting to get presets
        if (!actualInstanceId) {
            return `[Outfit System] Invalid instance ID: ${actualInstanceId}`;
        }
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for user instance ${actualInstanceId}.`;
        }
        outfitStore.deletePreset('user', actualInstanceId, presetName, 'user');
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Deleted your "${presetName}" outfit for instance ${actualInstanceId}.`;
        }
        return '';
    }
    getPresets(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        // Ensure instanceId is defined before attempting to get presets
        if (!actualInstanceId) {
            debugLog(`[NewUserOutfitManager] getPresets called with invalid parameters: instanceId=${actualInstanceId}`, null, 'warn');
            return [];
        }
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
        if (!presets) {
            return [];
        }
        return Object.keys(presets);
    }
    loadDefaultOutfit() {
        return __awaiter(this, arguments, void 0, function* (instanceId = null) {
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            // Ensure instanceId is defined before attempting to get presets
            if (!actualInstanceId) {
                return `[Outfit System] Invalid instance ID: ${actualInstanceId}`;
            }
            const settings = outfitStore.getState().settings;
            const defaultUserPresets = settings.defaultUserPresets || {};
            const defaultPresetName = defaultUserPresets[actualInstanceId];
            if (!defaultPresetName) {
                return `[Outfit System] No default outfit set for user (instance: ${actualInstanceId}).`;
            }
            const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
            if (!presets || !presets[defaultPresetName]) {
                return `[Outfit System] Default preset "${defaultPresetName}" not found for user (instance: ${actualInstanceId}).`;
            }
            const preset = presets[defaultPresetName];
            let changed = false;
            for (const [slot, value] of Object.entries(preset)) {
                if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                    yield this.setOutfitItem(slot, value);
                    changed = true;
                }
            }
            for (const slot of this.slots) {
                if (!Object.prototype.hasOwnProperty.call(preset, slot) && this.currentValues[slot] !== 'None') {
                    yield this.setOutfitItem(slot, 'None');
                    changed = true;
                }
            }
            if (changed) {
                return `You changed into your default outfit (instance: ${actualInstanceId}).`;
            }
            return `You were already wearing your default outfit (instance: ${actualInstanceId}).`;
        });
    }
    overwritePreset(presetName, instanceId = null) {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            debugLog('[NewUserOutfitManager] Invalid preset name provided', null, 'error');
            return '[Outfit System] Invalid preset name provided.';
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        // Ensure instanceId is defined before attempting to get presets
        if (!actualInstanceId) {
            return `[Outfit System] Invalid instance ID: ${actualInstanceId}`;
        }
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for user (instance: ${actualInstanceId}). Cannot overwrite.`;
        }
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        outfitStore.savePreset('user', actualInstanceId, presetName, presetData, 'user');
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Overwrote your "${presetName}" outfit (instance: ${actualInstanceId}).`;
        }
        return '';
    }
    getAllPresets(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        return outfitStore.getAllPresets('user', actualInstanceId, 'user');
    }
    setPromptInjectionEnabled(enabled, instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId;
        if (!actualInstanceId) {
            debugLog('[NewUserOutfitManager] Cannot set prompt injection - missing instanceId', null, 'warn');
            return;
        }
        if (!outfitStore.state.userInstances[actualInstanceId]) {
            outfitStore.state.userInstances[actualInstanceId] = {};
        }
        const updatedInstanceData = Object.assign(Object.assign({}, outfitStore.state.userInstances[actualInstanceId]), { promptInjectionEnabled: Boolean(enabled) });
        outfitStore.state.userInstances[actualInstanceId] = updatedInstanceData;
        outfitStore.notifyListeners();
        outfitStore.saveState();
    }
    getPromptInjectionEnabled(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId;
        if (!actualInstanceId) {
            debugLog('[NewUserOutfitManager] Cannot get prompt injection - missing instanceId', null, 'warn');
            return true;
        }
        const instanceData = outfitStore.state.userInstances[actualInstanceId];
        return (instanceData === null || instanceData === void 0 ? void 0 : instanceData.promptInjectionEnabled) !== undefined ?
            instanceData.promptInjectionEnabled : true;
    }
    hasDefaultOutfit(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        // Ensure instanceId is defined before attempting to get presets
        if (!actualInstanceId) {
            debugLog(`[NewUserOutfitManager] hasDefaultOutfit called with invalid parameters: instanceId=${actualInstanceId}`, null, 'warn');
            return false;
        }
        const settings = outfitStore.getState().settings;
        const defaultUserPresets = settings.defaultUserPresets || {};
        return Boolean(defaultUserPresets[actualInstanceId]);
    }
    getDefaultPresetName(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        // Ensure instanceId is defined before attempting to get presets
        if (!actualInstanceId) {
            debugLog(`[NewUserOutfitManager] getDefaultPresetName called with invalid parameters: instanceId=${actualInstanceId}`, null, 'warn');
            return null;
        }
        const settings = outfitStore.getState().settings;
        const defaultUserPresets = settings.defaultUserPresets || {};
        return defaultUserPresets[actualInstanceId] || null;
    }
    setPresetAsDefault(presetName_1) {
        return __awaiter(this, arguments, void 0, function* (presetName, instanceId = null) {
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            // Ensure instanceId is defined before attempting to get presets
            if (!actualInstanceId) {
                return `[Outfit System] Invalid instance ID: ${actualInstanceId}`;
            }
            const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
            if (!presets || !presets[presetName]) {
                return `[Outfit System] Preset "${presetName}" does not exist for user instance ${actualInstanceId}. Cannot set as default.`;
            }
            // Store the default preset name in settings instead of creating a duplicate preset
            const state = outfitStore.getState();
            const defaultUserPresets = Object.assign({}, (state.settings.defaultUserPresets || {}));
            defaultUserPresets[actualInstanceId] = presetName;
            outfitStore.setSetting('defaultUserPresets', defaultUserPresets);
            if (outfitStore.getSetting('enableSysMessages')) {
                return `Set "${presetName}" as your default outfit (instance: ${actualInstanceId}).`;
            }
            return '';
        });
    }
    clearDefaultPreset() {
        return __awaiter(this, arguments, void 0, function* (instanceId = null) {
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            // Ensure instanceId is defined before attempting to get presets
            if (!actualInstanceId) {
                return `[Outfit System] Invalid instance ID: ${actualInstanceId}`;
            }
            const settings = outfitStore.getState().settings;
            const defaultUserPresets = settings.defaultUserPresets || {};
            if (!defaultUserPresets[actualInstanceId]) {
                return `[Outfit System] No default outfit set for user (instance: ${actualInstanceId}).`;
            }
            // Clear the default preset setting
            const state = outfitStore.getState();
            const updatedDefaultUserPresets = Object.assign({}, (state.settings.defaultUserPresets || {}));
            delete updatedDefaultUserPresets[actualInstanceId];
            outfitStore.setSetting('defaultUserPresets', updatedDefaultUserPresets);
            if (outfitStore.getSetting('enableSysMessages')) {
                return `Default outfit cleared for user (instance: ${actualInstanceId}).`;
            }
            return '';
        });
    }
    loadOutfitFromInstanceId(instanceId) {
        if (!instanceId) {
            debugLog('[NewUserOutfitManager] Cannot load outfit - missing instanceId', null, 'warn');
            const defaultOutfit = {};
            this.slots.forEach(slot => {
                defaultOutfit[slot] = 'None';
            });
            return defaultOutfit;
        }
        return outfitStore.getUserOutfit(instanceId);
    }
    saveOutfitToInstanceId(outfitData, instanceId) {
        if (!instanceId) {
            debugLog('[NewUserOutfitManager] Cannot save outfit - missing instanceId', null, 'warn');
            return;
        }
        outfitStore.setUserOutfit(instanceId, outfitData);
        outfitStore.saveState();
    }
    applyDefaultOutfitAfterReset() {
        return __awaiter(this, arguments, void 0, function* (instanceId = null) {
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            if (this.hasDefaultOutfit(actualInstanceId)) {
                yield this.loadDefaultOutfit(actualInstanceId);
                return true;
            }
            if (actualInstanceId !== 'default' && this.hasDefaultOutfit('default')) {
                yield this.loadDefaultOutfit('default');
                return true;
            }
            return false;
        });
    }
}
