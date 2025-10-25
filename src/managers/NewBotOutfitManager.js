import {OutfitManager} from './OutfitManager.js';

import {outfitStore} from '../common/Store.js';


export class NewBotOutfitManager extends OutfitManager {

    constructor(slots) {

        super(slots);

    }

    /**
     * Sets whether prompt injection is enabled for this outfit instance
     * @param {boolean} enabled - Whether prompt injection should be enabled
     * @param {string|null} [instanceId=null] - The instance ID to set for (defaults to current instance ID)
     * @returns {void}
     */
    setPromptInjectionEnabled(enabled, instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot set prompt injection - missing characterId or instanceId');
            return;
        }

        // Update the bot instance data in the store to include the prompt injection setting
        if (!outfitStore.state.botInstances[this.characterId]) {
            outfitStore.state.botInstances[this.characterId] = {};
        }
        if (!outfitStore.state.botInstances[this.characterId][actualInstanceId]) {
            outfitStore.state.botInstances[this.characterId][actualInstanceId] = {bot: {}, user: {}};
        }

        // Create a new object to ensure React-style state updates
        const updatedInstanceData = {
            ...outfitStore.state.botInstances[this.characterId][actualInstanceId],
            promptInjectionEnabled: Boolean(enabled)
        };

        outfitStore.state.botInstances[this.characterId][actualInstanceId] = updatedInstanceData;

        // Notify listeners of the state change
        outfitStore.notifyListeners();

        // Save the updated state
        outfitStore.saveState();
    }

    /**
     * Gets whether prompt injection is enabled for this outfit instance
     * @param {string|null} [instanceId=null] - The instance ID to get for (defaults to current instance ID)
     * @returns {boolean} Whether prompt injection is enabled
     */
    getPromptInjectionEnabled(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot get prompt injection - missing characterId or instanceId');
            return true; // Default to true (enabled) if we can't access the data
        }

        // Get the instance data from the store
        const instanceData = outfitStore.state.botInstances[this.characterId]?.[actualInstanceId];

        // Return the stored value or default to true (enabled)
        return instanceData?.promptInjectionEnabled !== undefined ?
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


        if (outfitStore.getSetting('enableSysMessages')) {

            return `Saved "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;

        }

        return '';

    }


    async loadPreset(presetName, instanceId = null) {

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

                await this.setOutfitItem(slot, value);

                changed = true;

            }

        }


        if (changed) {

            return `${this.character} changed into the "${presetName}" outfit (instance: ${actualInstanceId}).`;

        }

        return `${this.character} was already wearing the "${presetName}" outfit (instance: ${actualInstanceId}).`;

    }


    deletePreset(presetName, instanceId = null) {

        if (!presetName || typeof presetName !== 'string') {

            return `[Outfit System] Invalid preset name: ${presetName}`;

        }


        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';


        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);


        if (!presets || !presets[presetName]) {

            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;

        }


        // Use the proper store method to delete the preset
        outfitStore.deletePreset(this.character, actualInstanceId, presetName, 'bot');


        if (outfitStore.getSetting('enableSysMessages')) {

            return `Deleted "${presetName}" outfit for instance ${actualInstanceId}.`;

        }

        return '';

    }


    getPresets(instanceId = null) {

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';


        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);


        if (!presets) {

            return [];

        }

        return Object.keys(presets);

    }


    async loadDefaultOutfit(instanceId = null) {

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';


        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);


        if (!presets || !presets['default']) {

            return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}).`;

        }


        const preset = presets['default'];

        let changed = false;


        for (const [slot, value] of Object.entries(preset)) {

            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {

                await this.setOutfitItem(slot, value);

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


    overwritePreset(presetName, instanceId = null) {

        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {

            console.error('[NewBotOutfitManager] Invalid preset name provided');

            return '[Outfit System] Invalid preset name provided.';

        }


        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';


        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);


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

    /**
     * Checks if there is a default outfit for this instance
     * @param {string|null} [instanceId=null] - The instance ID to check (defaults to current instance ID)
     * @returns {boolean} Whether there is a default outfit
     */
    hasDefaultOutfit(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        return Boolean(presets && presets['default']);
    }

    /**
     * Gets the name of the default preset for this instance
     * @param {string|null} [instanceId=null] - The instance ID to get default for (defaults to current instance ID)
     * @returns {string|null} The name of the default preset or null if none is set
     */
    getDefaultPresetName(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        // The "default" preset is a special preset that represents the current outfit as default
        if (presets && presets['default']) {
            return 'default';
        }

        return null;
    }

    /**
     * Sets a preset as the default preset for this instance
     * @param {string} presetName - The name of the preset to set as default
     * @param {string|null} [instanceId=null] - The instance ID to set default for (defaults to current instance ID)
     * @returns {Promise<string>} A message describing the result
     */
    async setPresetAsDefault(presetName, instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Get the preset data that we want to set as default
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot set as default.`;
        }

        // Copy the preset data to the 'default' preset
        const presetToSetAsDefault = presets[presetName];

        // Save this preset data as the 'default' preset
        outfitStore.savePreset(this.character, actualInstanceId, 'default', presetToSetAsDefault, 'bot');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Set "${presetName}" as the default outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }

    async clearDefaultPreset(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Check if a default preset exists
        const {bot: presets} = outfitStore.getPresets(this.character, actualInstanceId);

        if (!presets || !presets['default']) {
            return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}).`;
        }

        // Delete the 'default' preset
        outfitStore.deletePreset(this.character, actualInstanceId, 'default', 'bot');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Default outfit cleared for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }

    /**
     * Applies the default outfit for this instance after a chat reset
     * @param {string|null} [instanceId=null] - The instance ID to apply default for (defaults to current instance ID)
     * @returns {Promise<boolean>} Whether a default outfit was applied
     */
    async applyDefaultOutfitAfterReset(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Check if there's a default outfit for this character and instance
        if (this.hasDefaultOutfit(actualInstanceId)) {
            await this.loadDefaultOutfit(actualInstanceId);
            return true;
        }

        // If no specific default for this instance, try to load the default instance
        if (actualInstanceId !== 'default' && this.hasDefaultOutfit('default')) {
            await this.loadDefaultOutfit('default');
            return true;
        }

        return false;
    }

}
