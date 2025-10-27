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
export class NewBotOutfitManager extends OutfitManager {
    constructor(slots) {
        super(slots);
    }
    setPromptInjectionEnabled(enabled, instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId;
        if (!this.characterId || !actualInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot set prompt injection - missing characterId or instanceId');
            return;
        }
        if (!outfitStore.state.botInstances[this.characterId]) {
            outfitStore.state.botInstances[this.characterId] = {};
        }
        if (!outfitStore.state.botInstances[this.characterId][actualInstanceId]) {
            outfitStore.state.botInstances[this.characterId][actualInstanceId] = {
                bot: {},
                user: {},
                promptInjectionEnabled: true
            };
        }
        const updatedInstanceData = Object.assign(Object.assign({}, outfitStore.state.botInstances[this.characterId][actualInstanceId]), { promptInjectionEnabled: Boolean(enabled) });
        outfitStore.state.botInstances[this.characterId][actualInstanceId] = updatedInstanceData;
        outfitStore.notifyListeners();
        outfitStore.saveState();
    }
    getPromptInjectionEnabled(instanceId = null) {
        var _a;
        const actualInstanceId = instanceId || this.outfitInstanceId;
        if (!this.characterId || !actualInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot get prompt injection - missing characterId or instanceId');
            return true;
        }
        const instanceData = (_a = outfitStore.state.botInstances[this.characterId]) === null || _a === void 0 ? void 0 : _a[actualInstanceId];
        return (instanceData === null || instanceData === void 0 ? void 0 : instanceData.promptInjectionEnabled) !== undefined ?
            instanceData.promptInjectionEnabled : true;
    }
    getVarName(slot) {
        if (!this.characterId || !this.outfitInstanceId) {
            return `OUTFIT_INST_${this.characterId || 'unknown'}_temp_${slot}`;
        }
        return `OUTFIT_INST_${this.characterId}_${this.outfitInstanceId}_${slot}`;
    }
    loadOutfit() {
        if (!this.characterId || !this.outfitInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot load outfit - missing characterId or outfitInstanceId');
            this.slots.forEach(slot => {
                this.currentValues[slot] = 'None';
            });
            return;
        }
        const instanceOutfits = outfitStore.getBotOutfit(this.characterId, this.outfitInstanceId);
        this.slots.forEach(slot => {
            const value = instanceOutfits[slot] !== undefined ? instanceOutfits[slot] : 'None';
            this.currentValues[slot] = value;
        });
    }
    saveOutfit() {
        if (!this.characterId || !this.outfitInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot save outfit - missing characterId or outfitInstanceId');
            return;
        }
        const botOutfit = {};
        this.slots.forEach(slot => {
            botOutfit[slot] = this.currentValues[slot] || 'None';
        });
        outfitStore.setBotOutfit(this.characterId, this.outfitInstanceId, botOutfit);
        outfitStore.saveState();
    }
    savePreset(presetName, instanceId = null) {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[NewBotOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        outfitStore.savePreset(this.character, actualInstanceId, presetName, presetData, 'bot');
        outfitStore.saveState(); // Ensure the presets are saved to persistent storage
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Saved "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }
    loadPreset(presetName_1) {
        return __awaiter(this, arguments, void 0, function* (presetName, instanceId = null) {
            if (!presetName || typeof presetName !== 'string') {
                return `[Outfit System] Invalid preset name: ${presetName}`;
            }
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);
            if (!presets || !presets[presetName]) {
                return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
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
                return `${this.character} changed into the "${presetName}" outfit (instance: ${actualInstanceId}).`;
            }
            return `${this.character} was already wearing the "${presetName}" outfit (instance: ${actualInstanceId}).`;
        });
    }
    deletePreset(presetName, instanceId = null) {
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }
        outfitStore.deletePreset(this.character, actualInstanceId, presetName, 'bot');
        outfitStore.saveState(); // Ensure the presets are saved to persistent storage
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Deleted "${presetName}" outfit for instance ${actualInstanceId}.`;
        }
        return '';
    }
    getPresets(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);
        if (!presets) {
            return [];
        }
        return Object.keys(presets);
    }
    loadDefaultOutfit() {
        return __awaiter(this, arguments, void 0, function* (instanceId = null) {
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);
            if (!presets || !presets['default']) {
                return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}).`;
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
                return `${this.character} changed into the default outfit (instance: ${actualInstanceId}).`;
            }
            return `${this.character} was already wearing the default outfit (instance: ${actualInstanceId}).`;
        });
    }
    overwritePreset(presetName, instanceId = null) {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[NewBotOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot overwrite.`;
        }
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        outfitStore.savePreset(this.character, actualInstanceId, presetName, presetData, 'bot');
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Overwrote "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }
    getAllPresets(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        return outfitStore.getAllPresets(this.character, actualInstanceId, 'bot');
    }
    hasDefaultOutfit(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);
        return Boolean(presets && presets['default']);
    }
    getDefaultPresetName(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);
        if (presets && presets['default']) {
            return 'default';
        }
        return null;
    }
    setPresetAsDefault(presetName_1) {
        return __awaiter(this, arguments, void 0, function* (presetName, instanceId = null) {
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);
            if (!presets || !presets[presetName]) {
                return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot set as default.`;
            }
            const presetToSetAsDefault = presets[presetName];
            outfitStore.savePreset(this.character, actualInstanceId, 'default', presetToSetAsDefault, 'bot');
            outfitStore.saveState(); // Ensure the presets are saved to persistent storage
            if (outfitStore.getSetting('enableSysMessages')) {
                return `Set "${presetName}" as the default outfit for ${this.character} (instance: ${actualInstanceId}).`;
            }
            return '';
        });
    }
    clearDefaultPreset() {
        return __awaiter(this, arguments, void 0, function* (instanceId = null) {
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);
            if (!presets || !presets['default']) {
                return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}).`;
            }
            outfitStore.deletePreset(this.character, actualInstanceId, 'default', 'bot');
            outfitStore.saveState(); // Ensure the presets are saved to persistent storage
            if (outfitStore.getSetting('enableSysMessages')) {
                return `Default outfit cleared for ${this.character} (instance: ${actualInstanceId}).`;
            }
            return '';
        });
    }
    loadOutfitFromInstanceId(instanceId) {
        if (!this.characterId || !instanceId) {
            console.warn('[NewBotOutfitManager] Cannot load outfit - missing characterId or instanceId');
            const defaultOutfit = {};
            this.slots.forEach(slot => {
                defaultOutfit[slot] = 'None';
            });
            return defaultOutfit;
        }
        return outfitStore.getBotOutfit(this.characterId, instanceId);
    }
    saveOutfitToInstanceId(outfitData, instanceId) {
        if (!this.characterId || !instanceId) {
            console.warn('[NewBotOutfitManager] Cannot save outfit - missing characterId or instanceId');
            return;
        }
        outfitStore.setBotOutfit(this.characterId, instanceId, outfitData);
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
