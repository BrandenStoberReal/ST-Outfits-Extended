import {OutfitManager} from './OutfitManager';
import {outfitStore} from '../common/Store';

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

    saveOutfit(): void {
        if (!this.outfitInstanceId) {
            console.warn('[NewUserOutfitManager] Cannot save outfit - missing outfitInstanceId');
            return;
        }

        const userOutfit: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            userOutfit[slot] = this.currentValues[slot] || 'None';
        });

        outfitStore.setUserOutfit(this.outfitInstanceId, userOutfit);
        outfitStore.saveState();
    }

    async setOutfitItem(slot: string, value: string): Promise<string | null> {
        const message = await super.setOutfitItem(slot, value);
        if (message) {
            return message.replace(this.character, 'You');
        }
        return null;
    }

    savePreset(presetName: string, instanceId: string | null = null): string {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[NewUserOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presetData: { [key: string]: string } = {};

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

    async loadPreset(presetName: string, instanceId: string | null = null): Promise<string> {
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

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
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

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
        } else {
            message = `Deleted your "${presetName}" outfit for instance ${actualInstanceId}.`;
        }

        outfitStore.deletePreset('user', actualInstanceId, presetName, 'user');
        outfitStore.saveState(); // Ensure the presets are saved to persistent storage

        if (outfitStore.getSetting('enableSysMessages')) {
            return message;
        }

        return '';
    }

    getPresets(instanceId: string | null = null): string[] {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

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
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

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
            console.error('[NewUserOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for user (instance: ${actualInstanceId}). Cannot overwrite.`;
        }

        const presetData: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });

        outfitStore.savePreset('user', actualInstanceId, presetName, presetData, 'user');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Overwrote your "${presetName}" outfit (instance: ${actualInstanceId}).`;
        }

        return '';
    }

    getAllPresets(instanceId: string | null = null): { [key: string]: { [key: string]: string; }; } {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        return outfitStore.getAllPresets('user', actualInstanceId, 'user');
    }

    setPromptInjectionEnabled(enabled: boolean, instanceId: string | null = null): void {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!actualInstanceId) {
            console.warn('[NewUserOutfitManager] Cannot set prompt injection - missing instanceId');
            return;
        }

        if (!outfitStore.state.userInstances[actualInstanceId]) {
            outfitStore.state.userInstances[actualInstanceId] = {};
        }

        const updatedInstanceData = {
            ...outfitStore.state.userInstances[actualInstanceId],
            promptInjectionEnabled: Boolean(enabled)
        };

        outfitStore.state.userInstances[actualInstanceId] = updatedInstanceData;

        outfitStore.notifyListeners();
        outfitStore.saveState();
    }

    getPromptInjectionEnabled(instanceId: string | null = null): boolean {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!actualInstanceId) {
            console.warn('[NewUserOutfitManager] Cannot get prompt injection - missing instanceId');
            return true;
        }

        const instanceData = outfitStore.state.userInstances[actualInstanceId];

        return instanceData?.promptInjectionEnabled !== undefined ?
            instanceData.promptInjectionEnabled : true;
    }

    hasDefaultOutfit(instanceId: string | null = null): boolean {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

        return Boolean(presets && presets['default']);
    }

    getDefaultPresetName(instanceId: string | null = null): string | null {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

        if (presets && presets['default']) {
            return 'default';
        }

        return null;
    }

    async setPresetAsDefault(presetName: string, instanceId: string | null = null): Promise<string> {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

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
        outfitStore.saveState();
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