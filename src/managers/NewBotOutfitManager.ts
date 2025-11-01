import {OutfitManager} from './OutfitManager';
import {outfitStore} from '../common/Store';

export class NewBotOutfitManager extends OutfitManager {

    constructor(slots: string[]) {
        super(slots);
    }

    setPromptInjectionEnabled(enabled: boolean, instanceId: string | null = null): void {
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

        const updatedInstanceData = {
            ...outfitStore.state.botInstances[this.characterId][actualInstanceId],
            promptInjectionEnabled: Boolean(enabled)
        };

        outfitStore.state.botInstances[this.characterId][actualInstanceId] = updatedInstanceData;

        outfitStore.notifyListeners();
        outfitStore.saveState();
    }

    getPromptInjectionEnabled(instanceId: string | null = null): boolean {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot get prompt injection - missing characterId or instanceId');
            return true;
        }

        const instanceData = outfitStore.state.botInstances[this.characterId]?.[actualInstanceId];

        return instanceData?.promptInjectionEnabled !== undefined ?
            instanceData.promptInjectionEnabled : true;
    }

    getVarName(slot: string): string {
        if (!this.characterId || !this.outfitInstanceId) {
            return `OUTFIT_INST_${this.characterId || 'unknown'}_temp_${slot}`;
        }

        return `OUTFIT_INST_${this.characterId}_${this.outfitInstanceId}_${slot}`;
    }

    loadOutfit(): void {
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

    saveOutfit(): void {
        if (!this.characterId || !this.outfitInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot save outfit - missing characterId or outfitInstanceId');
            return;
        }

        const botOutfit: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            botOutfit[slot] = this.currentValues[slot] || 'None';
        });

        outfitStore.setBotOutfit(this.characterId, this.outfitInstanceId, botOutfit);
        outfitStore.saveState();
    }

    savePreset(presetName: string, instanceId: string | null = null): string {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[NewBotOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presetData: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });

        outfitStore.savePreset(this.character, actualInstanceId, presetName, presetData, 'bot');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Saved "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }

        return '';
    }

    async loadPreset(presetName: string, instanceId: string | null = null): Promise<string> {
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
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
            return `${this.character} changed into the "${presetName}" outfit (instance: ${actualInstanceId}).`;
        }

        return `${this.character} was already wearing the "${presetName}" outfit (instance: ${actualInstanceId}).`;
    }

    deletePreset(presetName: string, instanceId: string | null = null): string {
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }

        outfitStore.deletePreset(this.character, actualInstanceId, presetName, 'bot');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Deleted "${presetName}" outfit for instance ${actualInstanceId}.`;
        }

        return '';
    }

    getPresets(instanceId: string | null = null): string[] {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        if (!presets) {
            return [];
        }

        return Object.keys(presets);
    }

    async loadDefaultOutfit(instanceId: string | null = null): Promise<string> {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        if (!presets || !presets['default']) {
            return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}).`;
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
            return `${this.character} changed into the default outfit (instance: ${actualInstanceId}).`;
        }

        return `${this.character} was already wearing the default outfit (instance: ${actualInstanceId}).`;
    }

    overwritePreset(presetName: string, instanceId: string | null = null): string {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[NewBotOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot overwrite.`;
        }

        const presetData: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });

        outfitStore.savePreset(this.character, actualInstanceId, presetName, presetData, 'bot');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Overwrote "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }

        return '';
    }

    getAllPresets(instanceId: string | null = null): { [key: string]: { [key: string]: string; }; } {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        return outfitStore.getAllPresets(this.character, actualInstanceId, 'bot');
    }

    hasDefaultOutfit(instanceId: string | null = null): boolean {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        return Boolean(presets && presets['default']);
    }

    getDefaultPresetName(instanceId: string | null = null): string | null {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        if (presets && presets['default']) {
            return 'default';
        }

        return null;
    }

    async setPresetAsDefault(presetName: string, instanceId: string | null = null): Promise<string> {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot set as default.`;
        }

        const presetToSetAsDefault = presets[presetName];

        outfitStore.savePreset(this.character, actualInstanceId, 'default', presetToSetAsDefault, 'bot');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Set "${presetName}" as the default outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }

    async clearDefaultPreset(instanceId: string | null = null): Promise<string> {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        if (!presets || !presets['default']) {
            return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}).`;
        }

        outfitStore.deletePreset(this.character, actualInstanceId, 'default', 'bot');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Default outfit cleared for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }

    loadOutfitFromInstanceId(instanceId: string): { [key: string]: string } {
        if (!this.characterId || !instanceId) {
            console.warn('[NewBotOutfitManager] Cannot load outfit - missing characterId or instanceId');
            const defaultOutfit: { [key: string]: string } = {};
            this.slots.forEach(slot => {
                defaultOutfit[slot] = 'None';
            });
            return defaultOutfit;
        }

        return outfitStore.getBotOutfit(this.characterId, instanceId);
    }

    saveOutfitToInstanceId(outfitData: { [key: string]: string }, instanceId: string): void {
        if (!this.characterId || !instanceId) {
            console.warn('[NewBotOutfitManager] Cannot save outfit - missing characterId or instanceId');
            return;
        }

        outfitStore.setBotOutfit(this.characterId, instanceId, outfitData);
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