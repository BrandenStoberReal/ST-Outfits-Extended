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
            console.warn('[NewUserOutfitManager] Cannot load outfit - missing outfitInstanceId');
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
            console.warn('[NewUserOutfitManager] Cannot save outfit - missing outfitInstanceId');
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
            console.error('[NewUserOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        outfitStore.savePreset('user', actualInstanceId, presetName, presetData, 'user');
        outfitStore.saveState(); // Ensure the presets are saved to persistent storage
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
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for user instance ${actualInstanceId}.`;
        }
        // Check if the preset being deleted is the same as the current default preset
        const defaultPresetName = this.getDefaultPresetName(actualInstanceId);
        let message = '';
        if (defaultPresetName === presetName) {
            // If we're deleting the preset that's currently set as default, 
            // we need to clear the default status
            outfitStore.deletePreset('user', actualInstanceId, 'default', 'user');
            message = `Deleted "${presetName}" and cleared it as your default outfit (instance: ${actualInstanceId}).`;
        }
        else {
            message = `Deleted your "${presetName}" outfit for instance ${actualInstanceId}.`;
        }
        outfitStore.deletePreset('user', actualInstanceId, presetName, 'user');
        outfitStore.saveState(); // Ensure the presets are saved to persistent storage
        if (outfitStore.getSetting('enableSysMessages')) {
            return message;
        }
        return '';
    }
    getPresets(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
        if (!presets) {
            return [];
        }
        return Object.keys(presets);
    }
    /**
     * Loads the default outfit for the user.
     * Default outfits are HEAVILY encouraged and provide a fallback appearance for the user.
     * @param {string | null} instanceId - The instance ID to load the default outfit for
     * @returns {Promise<string>} A message indicating the result of loading the default outfit
     */
    loadDefaultOutfit() {
        return __awaiter(this, arguments, void 0, function* (instanceId = null) {
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
            if (!presets || !presets['default']) {
                return `[Outfit System] No default outfit set for user (instance: ${actualInstanceId}). Having a default outfit is HEAVILY encouraged.`;
            }
            const preset = presets['default'];
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
            console.error('[NewUserOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
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
            console.warn('[NewUserOutfitManager] Cannot set prompt injection - missing instanceId');
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
            console.warn('[NewUserOutfitManager] Cannot get prompt injection - missing instanceId');
            return true;
        }
        const instanceData = outfitStore.state.userInstances[actualInstanceId];
        return (instanceData === null || instanceData === void 0 ? void 0 : instanceData.promptInjectionEnabled) !== undefined ?
            instanceData.promptInjectionEnabled : true;
    }
    hasDefaultOutfit(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
        return Boolean(presets && presets['default']);
    }
    getDefaultPresetName(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
        if (presets && presets['default']) {
            return 'default';
        }
        return null;
    }
    setPresetAsDefault(presetName_1) {
        return __awaiter(this, arguments, void 0, function* (presetName, instanceId = null) {
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            const { user: presets } = outfitStore.getPresets('user', actualInstanceId);
            if (!presets || !presets[presetName]) {
                return `[Outfit System] Preset "${presetName}" does not exist for user instance ${actualInstanceId}. Cannot set as default.`;
            }
            const presetToSetAsDefault = presets[presetName];
            outfitStore.savePreset('user', actualInstanceId, 'default', presetToSetAsDefault, 'user');
            outfitStore.saveState(); // Ensure the presets are saved to persistent storage
            if (outfitStore.getSetting('enableSysMessages')) {
                return `Set "${presetName}" as your default outfit (instance: ${actualInstanceId}).`;
            }
            return '';
        });
    }
    loadOutfitFromInstanceId(instanceId) {
        if (!instanceId) {
            console.warn('[NewUserOutfitManager] Cannot load outfit - missing instanceId');
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
            console.warn('[NewUserOutfitManager] Cannot save outfit - missing instanceId');
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
