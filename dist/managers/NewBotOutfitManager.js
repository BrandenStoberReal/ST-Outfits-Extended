var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { presetManager } from './PresetManager.js';
import { OutfitManager } from './OutfitManager.js';
import { debouncedStore } from '../stores/DebouncedStore.js';
import { outfitStore } from '../stores/Store.js';
import { debugLog } from '../logging/DebugLogger.js';
export class NewBotOutfitManager extends OutfitManager {
    constructor(slots) {
        super(slots);
    }
    setPromptInjectionEnabled(enabled, instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId;
        if (!this.characterId || !actualInstanceId) {
            debugLog('Cannot set prompt injection - missing characterId or instanceId', null, 'warn');
            return;
        }
        debugLog('NewBotOutfitManager: Setting prompt injection enabled', {
            characterId: this.characterId,
            instanceId: actualInstanceId,
            enabled: enabled
        }, 'debug');
        // Get current bot outfit data for this instance to preserve it
        const currentBotOutfit = outfitStore.getBotOutfit(this.characterId, actualInstanceId);
        // Update the instance data - the save will be handled by the store's method when state changes
        if (!outfitStore.state.botInstances[this.characterId]) {
            debugLog('NewBotOutfitManager: Initializing botInstances for character', { characterId: this.characterId }, 'debug');
            outfitStore.state.botInstances[this.characterId] = {};
        }
        if (!outfitStore.state.botInstances[this.characterId][actualInstanceId]) {
            debugLog('NewBotOutfitManager: Creating new instance data', { instanceId: actualInstanceId }, 'debug');
            outfitStore.state.botInstances[this.characterId][actualInstanceId] = {
                bot: currentBotOutfit,
                user: {},
                promptInjectionEnabled: Boolean(enabled)
            };
        }
        else {
            debugLog('NewBotOutfitManager: Updating existing instance data', { instanceId: actualInstanceId }, 'debug');
            // Preserve existing bot and user data, only update promptInjectionEnabled
            outfitStore.state.botInstances[this.characterId][actualInstanceId] = Object.assign(Object.assign({}, outfitStore.state.botInstances[this.characterId][actualInstanceId]), { bot: currentBotOutfit, promptInjectionEnabled: Boolean(enabled) });
        }
        outfitStore.notifyListeners();
        debugLog('NewBotOutfitManager: Requesting debounced save after prompt injection setting change', null, 'debug');
        debouncedStore.saveState();
        debugLog('NewBotOutfitManager: Prompt injection setting updated and save requested', {
            characterId: this.characterId,
            instanceId: actualInstanceId,
            enabled: enabled
        }, 'debug');
    }
    getPromptInjectionEnabled(instanceId = null) {
        var _a;
        const actualInstanceId = instanceId || this.outfitInstanceId;
        if (!this.characterId || !actualInstanceId) {
            debugLog('Cannot get prompt injection - missing characterId or instanceId', null, 'warn');
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
            debugLog('Cannot load outfit - missing characterId or outfitInstanceId', null, 'warn');
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
            debugLog('Cannot save outfit - missing characterId or outfitInstanceId', null, 'warn');
            return;
        }
        debugLog('NewBotOutfitManager: Starting saveOutfit operation', {
            characterId: this.characterId,
            outfitInstanceId: this.outfitInstanceId,
            slotCount: this.slots.length
        }, 'debug');
        const botOutfit = {};
        this.slots.forEach(slot => {
            botOutfit[slot] = this.currentValues[slot] || 'None';
        });
        debugLog('NewBotOutfitManager: Prepared outfit data for saving', {
            characterId: this.characterId,
            instanceId: this.outfitInstanceId,
            outfitData: botOutfit
        }, 'debug');
        outfitStore.setBotOutfit(this.characterId, this.outfitInstanceId, botOutfit);
        debugLog('NewBotOutfitManager: Set outfit in store, requesting debounced save', null, 'debug');
        debouncedStore.saveState();
        debugLog('NewBotOutfitManager: SaveOutfit operation completed', {
            characterId: this.characterId,
            instanceId: this.outfitInstanceId
        }, 'debug');
    }
    savePreset(presetName, instanceId = null) {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            debugLog('Invalid preset name provided', null, 'error');
            return '[Outfit System] Invalid preset name provided.';
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        debugLog('NewBotOutfitManager: Starting savePreset operation', {
            presetName: presetName,
            instanceId: actualInstanceId,
            character: this.character
        }, 'debug');
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        debugLog('NewBotOutfitManager: Prepared preset data for saving', {
            presetName: presetName,
            instanceId: actualInstanceId,
            slotCount: Object.keys(presetData).length
        }, 'debug');
        presetManager.savePreset(actualInstanceId, presetName, presetData, 'bot');
        if (outfitStore.getSetting('enableSysMessages')) {
            const message = `Saved "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
            debugLog('NewBotOutfitManager: Preset saved successfully', { message }, 'debug');
            return message;
        }
        debugLog('NewBotOutfitManager: Preset saved successfully (system messages disabled)', null, 'debug');
        return '';
    }
    loadPreset(presetName_1) {
        return __awaiter(this, arguments, void 0, function* (presetName, instanceId = null) {
            if (!presetName || typeof presetName !== 'string') {
                return `[Outfit System] Invalid preset name: ${presetName}`;
            }
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            const presets = presetManager.getPresets(actualInstanceId, 'bot');
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
        const presets = presetManager.getPresets(actualInstanceId, 'bot');
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }
        // Check if the preset being deleted is the same as the current default preset
        const defaultPresetName = this.getDefaultPresetName(actualInstanceId);
        let message = '';
        if (defaultPresetName === presetName) {
            // If we're deleting the preset that's currently set as default, 
            // we need to clear the default status
            presetManager.deletePreset(actualInstanceId, 'default', 'bot');
            message = `Deleted "${presetName}" and cleared it as the default outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        else {
            message = `Deleted "${presetName}" outfit for instance ${actualInstanceId}.`;
        }
        presetManager.deletePreset(actualInstanceId, presetName, 'bot');
        if (outfitStore.getSetting('enableSysMessages')) {
            return message;
        }
        return '';
    }
    getPresets(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'bot');
        if (!presets) {
            return [];
        }
        return Object.keys(presets);
    }
    /**
     * Loads the default outfit for this character.
     * Default outfits are HEAVILY encouraged and provide a fallback appearance for characters.
     * @param {string | null} instanceId - The instance ID to load the default outfit for
     * @returns {Promise<string>} A message indicating the result of loading the default outfit
     */
    loadDefaultOutfit() {
        return __awaiter(this, arguments, void 0, function* (instanceId = null) {
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            const presets = presetManager.getPresets(actualInstanceId, 'bot');
            if (!presets || !presets['default']) {
                return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}). Having a default outfit is HEAVILY encouraged.`;
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
            debugLog('Invalid preset name provided', null, 'error');
            return '[Outfit System] Invalid preset name provided.';
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'bot');
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot overwrite.`;
        }
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        presetManager.savePreset(actualInstanceId, presetName, presetData, 'bot');
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Overwrote "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }
    getAllPresets(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        return presetManager.getPresets(actualInstanceId, 'bot');
    }
    hasDefaultOutfit(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'bot');
        return Boolean(presets && presets['default']);
    }
    getDefaultPresetName(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'bot');
        if (presets && presets['default']) {
            return 'default';
        }
        return null;
    }
    setPresetAsDefault(presetName_1) {
        return __awaiter(this, arguments, void 0, function* (presetName, instanceId = null) {
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            const presets = presetManager.getPresets(actualInstanceId, 'bot');
            if (!presets || !presets[presetName]) {
                return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot set as default.`;
            }
            const presetToSetAsDefault = presets[presetName];
            presetManager.savePreset(actualInstanceId, 'default', presetToSetAsDefault, 'bot');
            if (outfitStore.getSetting('enableSysMessages')) {
                return `Set "${presetName}" as the default outfit for ${this.character} (instance: ${actualInstanceId}).`;
            }
            return '';
        });
    }
    applyDefaultOutfitAfterSetCharacter() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.outfitInstanceId) {
                yield this.applyDefaultOutfitAfterReset(this.outfitInstanceId);
            }
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
        debouncedStore.saveState();
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
