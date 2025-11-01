import {presetManager} from './PresetManager';
import {OutfitManager} from './OutfitManager';
import {debouncedStore} from '../stores/DebouncedStore';
import {outfitStore} from '../stores/Store';
import {debugLog} from '../logging/DebugLogger';


export class NewUserOutfitManager extends OutfitManager {

    constructor(slots: string[]) {
        super(slots);
        this.character = 'User';
    }

    getVarName(slot: string): string {
        if (!this.outfitInstanceId) {
            return `OUTFIT_INST_USER_${slot}`;
        }
        return `OUTFIT_INST_USER_${this.outfitInstanceId}_${slot}`;
    }

    loadOutfit(): void {
        if (!this.outfitInstanceId) {
            debugLog('Cannot load outfit - missing outfitInstanceId', null, 'warn');
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

    saveOutfit(): void {
        if (!this.outfitInstanceId) {
            debugLog('Cannot save outfit - missing outfitInstanceId', null, 'warn');
            return;
        }

        debugLog('NewUserOutfitManager: Starting saveOutfit operation', {
            outfitInstanceId: this.outfitInstanceId,
            slotCount: this.slots.length
        }, 'debug');

        const userOutfit: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            userOutfit[slot] = this.currentValues[slot] || 'None';
        });

        debugLog('NewUserOutfitManager: Prepared outfit data for saving', {
            instanceId: this.outfitInstanceId,
            outfitData: userOutfit
        }, 'debug');

        outfitStore.setUserOutfit(this.outfitInstanceId, userOutfit);
        debugLog('NewUserOutfitManager: Set outfit in store, requesting debounced save', null, 'debug');
        debouncedStore.saveState();

        debugLog('NewUserOutfitManager: SaveOutfit operation completed', {
            instanceId: this.outfitInstanceId
        }, 'debug');
    }

    async setOutfitItem(slot: string, value: string): Promise<{ message: string | null, newValue: string }> {
        const result = await super.setOutfitItem(slot, value);
        if (result.message) {
            result.message = result.message.replace(this.character, 'You');
        }
        return result;
    }

    savePreset(presetName: string, instanceId: string | null = null): string {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            debugLog('Invalid preset name provided', null, 'error');
            return '[Outfit System] Invalid preset name provided.';
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presetData: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });

        presetManager.savePreset(actualInstanceId, presetName, presetData, 'user');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Saved "${presetName}" outfit for user character (instance: ${actualInstanceId}).`;
        }

        return '';
    }

    async loadPreset(presetName: string, instanceId: string | null = null): Promise<string> {
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'user');

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for user instance ${actualInstanceId}.`;
        }

        const preset = presets[presetName];
        let changed = false;

        for (const [slot, value] of Object.entries(preset)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                await this.setOutfitItem(slot, value as string);
                changed = true;
            }
        }

        if (changed) {
            return `You changed into the "${presetName}" outfit (instance: ${actualInstanceId}).`;
        }

        return `You are already wearing the "${presetName}" outfit (instance: ${actualInstanceId}).`;
    }

    deletePreset(presetName: string, instanceId: string | null = null): string {
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'user');

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for user instance ${actualInstanceId}.`;
        }

        // Check if the preset being deleted is the same as the current default preset
        const defaultPresetName = this.getDefaultPresetName(actualInstanceId);
        let message = '';

        if (defaultPresetName === presetName) {
            // If we're deleting the preset that's currently set as default, 
            // we need to clear the default status
            presetManager.deletePreset(actualInstanceId, 'default', 'user');
            message = `Deleted "${presetName}" and cleared it as your default outfit (instance: ${actualInstanceId}).`;
        } else {
            message = `Deleted your "${presetName}" outfit for instance ${actualInstanceId}.`;
        }

        presetManager.deletePreset(actualInstanceId, presetName, 'user');

        if (outfitStore.getSetting('enableSysMessages')) {
            return message;
        }

        return '';
    }

    getPresets(instanceId: string | null = null): string[] {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'user');

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
    async loadDefaultOutfit(instanceId: string | null = null): Promise<string> {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'user');

        if (!presets || !presets['default']) {
            return `[Outfit System] No default outfit set for user (instance: ${actualInstanceId}). Having a default outfit is HEAVILY encouraged.`;
        }

        const preset = presets['default'];
        let changed = false;

        for (const [slot, value] of Object.entries(preset)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                await this.setOutfitItem(slot, value as string);
                changed = true;
            }
        }

        for (const slot of this.slots) {
            if (!Object.prototype.hasOwnProperty.call(preset, slot) && this.currentValues[slot] !== 'None') {
                await this.setOutfitItem(slot, 'None');
                changed = true;
            }
        }

        if (changed) {
            return `You changed into your default outfit (instance: ${actualInstanceId}).`;
        }

        return `You were already wearing your default outfit (instance: ${actualInstanceId}).`;
    }

    overwritePreset(presetName: string, instanceId: string | null = null): string {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            debugLog('Invalid preset name provided', null, 'error');
            return '[Outfit System] Invalid preset name provided.';
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'user');

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for user (instance: ${actualInstanceId}). Cannot overwrite.`;
        }

        const presetData: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });

        presetManager.savePreset(actualInstanceId, presetName, presetData, 'user');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Overwrote your "${presetName}" outfit (instance: ${actualInstanceId}).`;
        }

        return '';
    }

    getAllPresets(instanceId: string | null = null): { [key: string]: { [key: string]: string; }; } {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        return presetManager.getPresets(actualInstanceId, 'user');
    }

    setPromptInjectionEnabled(enabled: boolean, instanceId: string | null = null): void {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!actualInstanceId) {
            debugLog('Cannot set prompt injection - missing instanceId', null, 'warn');
            return;
        }

        debugLog('NewUserOutfitManager: Setting prompt injection enabled', {
            instanceId: actualInstanceId,
            enabled: enabled
        }, 'debug');

        // Get current user outfit data for this instance to preserve it
        const currentUserOutfit = outfitStore.getUserOutfit(actualInstanceId);

        // Create or update the instance data with preserved outfit data
        if (!outfitStore.state.userInstances[actualInstanceId]) {
            debugLog('NewUserOutfitManager: Creating new user instance data', {instanceId: actualInstanceId}, 'debug');
            // Create new instance data preserving the outfit and adding prompt injection setting
            outfitStore.state.userInstances[actualInstanceId] = {
                ...currentUserOutfit,
                promptInjectionEnabled: Boolean(enabled)
            };
        } else {
            debugLog('NewUserOutfitManager: Updating existing user instance data', {instanceId: actualInstanceId}, 'debug');
            // Update existing instance data, preserving outfit data but updating prompt injection setting
            outfitStore.state.userInstances[actualInstanceId] = {
                ...currentUserOutfit, // Ensure we preserve all outfit slot data
                promptInjectionEnabled: Boolean(enabled)
            };
        }

        outfitStore.notifyListeners();
        debugLog('NewUserOutfitManager: Requesting debounced save after prompt injection setting change', null, 'debug');
        debouncedStore.saveState();

        debugLog('NewUserOutfitManager: Prompt injection setting updated and save requested', {
            instanceId: actualInstanceId,
            enabled: enabled
        }, 'debug');
    }

    getPromptInjectionEnabled(instanceId: string | null = null): boolean {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!actualInstanceId) {
            debugLog('Cannot get prompt injection - missing instanceId', null, 'warn');
            return true;
        }

        const instanceData = outfitStore.state.userInstances[actualInstanceId];

        return instanceData?.promptInjectionEnabled !== undefined ?
            instanceData.promptInjectionEnabled : true;
    }

    hasDefaultOutfit(instanceId: string | null = null): boolean {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'user');

        return Boolean(presets && presets['default']);
    }

    getDefaultPresetName(instanceId: string | null = null): string | null {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'user');

        if (presets && presets['default']) {
            return 'default';
        }

        return null;
    }

    async setPresetAsDefault(presetName: string, instanceId: string | null = null): Promise<string> {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presets = presetManager.getPresets(actualInstanceId, 'user');

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for user instance ${actualInstanceId}. Cannot set as default.`;
        }

        const presetToSetAsDefault = presets[presetName];

        presetManager.savePreset(actualInstanceId, 'default', presetToSetAsDefault, 'user');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Set "${presetName}" as your default outfit (instance: ${actualInstanceId}).`;
        }
        return '';
    }


    async applyDefaultOutfitAfterSetCharacter(): Promise<void> {
        if (this.outfitInstanceId) {
            await this.applyDefaultOutfitAfterReset(this.outfitInstanceId);
        }
    }

    loadOutfitFromInstanceId(instanceId: string): { [key: string]: string } {
        if (!instanceId) {
            console.warn('[NewUserOutfitManager] Cannot load outfit - missing instanceId');
            const defaultOutfit: { [key: string]: string } = {};
            this.slots.forEach(slot => {
                defaultOutfit[slot] = 'None';
            });
            return defaultOutfit;
        }

        return outfitStore.getUserOutfit(instanceId);
    }

    saveOutfitToInstanceId(outfitData: { [key: string]: string }, instanceId: string): void {
        if (!instanceId) {
            console.warn('[NewUserOutfitManager] Cannot save outfit - missing instanceId');
            return;
        }

        outfitStore.setUserOutfit(instanceId, outfitData);
        debouncedStore.saveState();
    }

    async applyDefaultOutfitAfterReset(instanceId: string | null = null): Promise<boolean> {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        if (this.hasDefaultOutfit(actualInstanceId)) {
            await this.loadDefaultOutfit(actualInstanceId);
            return true;
        }

        if (actualInstanceId !== 'default' && this.hasDefaultOutfit('default')) {
            await this.loadDefaultOutfit('default');
            return true;
        }

        return false;
    }
}