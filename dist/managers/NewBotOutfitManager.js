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
        var _a;
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[NewBotOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        // Use characterId instead of character name for bot presets
        let characterId = this.characterId;
        if (!characterId) {
            // Try to get characterId from global context if not available on manager
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext ? window.getContext() : null;
            if (context === null || context === void 0 ? void 0 : context.characterId) {
                characterId = context.characterId.toString();
                // Update the manager's characterId for future operations
                this.characterId = characterId;
                console.debug(`[NewBotOutfitManager] Retrieved characterId from context: ${characterId}`);
            }
        }
        if (!characterId) {
            console.error('[NewBotOutfitManager] Cannot save preset - missing characterId');
            return '[Outfit System] Cannot save preset - missing characterId';
        }
        outfitStore.savePreset(characterId, actualInstanceId, presetName, presetData, 'bot');
        outfitStore.saveState(); // Ensure the presets are saved to persistent storage
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Saved "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }
    loadPreset(presetName_1) {
        return __awaiter(this, arguments, void 0, function* (presetName, instanceId = null) {
            var _a;
            if (!presetName || typeof presetName !== 'string') {
                return `[Outfit System] Invalid preset name: ${presetName}`;
            }
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            let characterId = this.characterId;
            if (!characterId) {
                // Try to get characterId from global context if not available on manager
                const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext ? window.getContext() : null;
                if (context === null || context === void 0 ? void 0 : context.characterId) {
                    characterId = context.characterId.toString();
                    // Update the manager's characterId for future operations
                    this.characterId = characterId;
                    console.debug(`[NewBotOutfitManager] Retrieved characterId from context: ${characterId}`);
                }
            }
            if (!characterId) {
                console.error('[NewBotOutfitManager] Cannot load preset - missing characterId');
                return `[Outfit System] Cannot load preset - missing characterId`;
            }
            const { bot: presets } = outfitStore.getPresets(characterId, actualInstanceId);
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
        var _a;
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        let characterId = this.characterId;
        if (!characterId) {
            // Try to get characterId from global context if not available on manager
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext ? window.getContext() : null;
            if (context === null || context === void 0 ? void 0 : context.characterId) {
                characterId = context.characterId.toString();
                // Update the manager's characterId for future operations
                this.characterId = characterId;
                console.debug(`[NewBotOutfitManager] Retrieved characterId from context: ${characterId}`);
            }
        }
        if (!characterId) {
            console.error('[NewBotOutfitManager] Cannot delete preset - missing characterId');
            return `[Outfit System] Cannot delete preset - missing characterId`;
        }
        const { bot: presets } = outfitStore.getPresets(characterId, actualInstanceId);
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }
        // Check if the preset being deleted is the same as the current default preset
        const defaultPresetName = this.getDefaultPresetName(actualInstanceId);
        let message = '';
        if (defaultPresetName === presetName) {
            // If we're deleting the preset that's currently set as default, 
            // we need to clear the default status
            outfitStore.deletePreset(characterId, actualInstanceId, 'default', 'bot');
            message = `Deleted "${presetName}" and cleared it as the default outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        else {
            message = `Deleted "${presetName}" outfit for instance ${actualInstanceId}.`;
        }
        outfitStore.deletePreset(characterId, actualInstanceId, presetName, 'bot');
        outfitStore.saveState(); // Ensure the presets are saved to persistent storage
        if (outfitStore.getSetting('enableSysMessages')) {
            return message;
        }
        return '';
    }
    getPresets(instanceId = null) {
        var _a;
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        let characterId = this.characterId;
        if (!characterId) {
            // Try to get characterId from global context if not available on manager
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext ? window.getContext() : null;
            if (context === null || context === void 0 ? void 0 : context.characterId) {
                characterId = context.characterId.toString();
                // Update the manager's characterId for future operations
                this.characterId = characterId;
                console.debug(`[NewBotOutfitManager] Retrieved characterId from context: ${characterId}`);
            }
        }
        if (!characterId) {
            console.error('[NewBotOutfitManager] Cannot get presets - missing characterId');
            return [];
        }
        const { bot: presets } = outfitStore.getPresets(characterId, actualInstanceId);
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
            var _a;
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            let characterId = this.characterId;
            if (!characterId) {
                // Try to get characterId from global context if not available on manager
                const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext ? window.getContext() : null;
                if (context === null || context === void 0 ? void 0 : context.characterId) {
                    characterId = context.characterId.toString();
                    // Update the manager's characterId for future operations
                    this.characterId = characterId;
                    console.debug(`[NewBotOutfitManager] Retrieved characterId from context: ${characterId}`);
                }
            }
            if (!characterId) {
                console.error('[NewBotOutfitManager] Cannot load default outfit - missing characterId');
                return `[Outfit System] Cannot load default outfit - missing characterId`;
            }
            const { bot: presets } = outfitStore.getPresets(characterId, actualInstanceId);
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
        var _a;
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[NewBotOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        let characterId = this.characterId;
        if (!characterId) {
            // Try to get characterId from global context if not available on manager
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext ? window.getContext() : null;
            if (context === null || context === void 0 ? void 0 : context.characterId) {
                characterId = context.characterId.toString();
                // Update the manager's characterId for future operations
                this.characterId = characterId;
                console.debug(`[NewBotOutfitManager] Retrieved characterId from context: ${characterId}`);
            }
        }
        if (!characterId) {
            console.error('[NewBotOutfitManager] Cannot overwrite preset - missing characterId');
            return '[Outfit System] Cannot overwrite preset - missing characterId';
        }
        const { bot: presets } = outfitStore.getPresets(characterId, actualInstanceId);
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot overwrite.`;
        }
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        // characterId was already declared above
        outfitStore.savePreset(characterId, actualInstanceId, presetName, presetData, 'bot');
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Overwrote "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }
    getAllPresets(instanceId = null) {
        var _a;
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        let characterId = this.characterId;
        if (!characterId) {
            // Try to get characterId from global context if not available on manager
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext ? window.getContext() : null;
            if (context === null || context === void 0 ? void 0 : context.characterId) {
                characterId = context.characterId.toString();
                // Update the manager's characterId for future operations
                this.characterId = characterId;
                console.debug(`[NewBotOutfitManager] Retrieved characterId from context: ${characterId}`);
            }
        }
        if (!characterId) {
            console.error('[NewBotOutfitManager] Cannot get all presets - missing characterId');
            return {};
        }
        return outfitStore.getAllPresets(characterId, actualInstanceId, 'bot');
    }
    hasDefaultOutfit(instanceId = null) {
        var _a;
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        let characterId = this.characterId;
        if (!characterId) {
            // Try to get characterId from global context if not available on manager
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext ? window.getContext() : null;
            if (context === null || context === void 0 ? void 0 : context.characterId) {
                characterId = context.characterId.toString();
                // Update the manager's characterId for future operations
                this.characterId = characterId;
                console.debug(`[NewBotOutfitManager] Retrieved characterId from context: ${characterId}`);
            }
        }
        if (!characterId) {
            console.error('[NewBotOutfitManager] Cannot check default outfit - missing characterId');
            return false;
        }
        const { bot: presets } = outfitStore.getPresets(characterId, actualInstanceId);
        return Boolean(presets && presets['default']);
    }
    getDefaultPresetName(instanceId = null) {
        var _a;
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        let characterId = this.characterId;
        if (!characterId) {
            // Try to get characterId from global context if not available on manager
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext ? window.getContext() : null;
            if (context === null || context === void 0 ? void 0 : context.characterId) {
                characterId = context.characterId.toString();
                // Update the manager's characterId for future operations
                this.characterId = characterId;
                console.debug(`[NewBotOutfitManager] Retrieved characterId from context: ${characterId}`);
            }
        }
        if (!characterId) {
            console.error('[NewBotOutfitManager] Cannot get default preset name - missing characterId');
            return null;
        }
        const { bot: presets } = outfitStore.getPresets(characterId, actualInstanceId);
        if (presets && presets['default']) {
            return 'default';
        }
        return null;
    }
    setPresetAsDefault(presetName_1) {
        return __awaiter(this, arguments, void 0, function* (presetName, instanceId = null) {
            var _a;
            const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
            let characterId = this.characterId;
            if (!characterId) {
                // Try to get characterId from global context if not available on manager
                const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext ? window.getContext() : null;
                if (context === null || context === void 0 ? void 0 : context.characterId) {
                    characterId = context.characterId.toString();
                    // Update the manager's characterId for future operations
                    this.characterId = characterId;
                    console.debug(`[NewBotOutfitManager] Retrieved characterId from context: ${characterId}`);
                }
            }
            if (!characterId) {
                console.error('[NewBotOutfitManager] Cannot set preset as default - missing characterId');
                return '[Outfit System] Cannot set preset as default - missing characterId';
            }
            const { bot: presets } = outfitStore.getPresets(characterId, actualInstanceId);
            if (!presets || !presets[presetName]) {
                return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot set as default.`;
            }
            const presetToSetAsDefault = presets[presetName];
            // characterId was already declared above
            outfitStore.savePreset(characterId, actualInstanceId, 'default', presetToSetAsDefault, 'bot');
            outfitStore.saveState(); // Ensure the presets are saved to persistent storage
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
