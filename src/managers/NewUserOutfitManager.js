import {OutfitManager} from './OutfitManager.js';

import {outfitStore} from '../common/Store.js';


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


    async setOutfitItem(slot, value) {

        const message = await super.setOutfitItem(slot, value);

        if (message) {

            return message.replace(this.character, 'You');

        }

        return null;

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


        if (outfitStore.getSetting('enableSysMessages')) {

            return `Saved "${presetName}" outfit for user character (instance: ${actualInstanceId}).`;

        }

        return '';

    }


    async loadPreset(presetName, instanceId = null) {

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

                await this.setOutfitItem(slot, value);

                changed = true;

            }

        }


        if (changed) {

            return `You changed into the "${presetName}" outfit (instance: ${actualInstanceId}).`;

        }

        return `You are already wearing the "${presetName}" outfit (instance: ${actualInstanceId}).`;

    }


    deletePreset(presetName, instanceId = null) {

        if (!presetName || typeof presetName !== 'string') {

            return `[Outfit System] Invalid preset name: ${presetName}`;

        }


        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';


        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);


        if (!presets || !presets[presetName]) {

            return `[Outfit System] Preset "${presetName}" not found for user instance ${actualInstanceId}.`;

        }


        // Use the proper store method to delete the preset
        outfitStore.deletePreset('user', actualInstanceId, presetName, 'user');


        if (outfitStore.getSetting('enableSysMessages')) {

            return `Deleted your "${presetName}" outfit for instance ${actualInstanceId}.`;

        }

        return '';

    }


    getPresets(instanceId = null) {

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';


        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);


        if (!presets) {

            return [];

        }

        return Object.keys(presets);

    }


    async loadDefaultOutfit(instanceId = null) {

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';


        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);


        if (!presets || !presets['default']) {

            return `[Outfit System] No default outfit set for user (instance: ${actualInstanceId}).`;

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

            return `You changed into your default outfit (instance: ${actualInstanceId}).`;

        }

        return `You were already wearing your default outfit (instance: ${actualInstanceId}).`;

    }


    overwritePreset(presetName, instanceId = null) {

        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {

            console.error('[NewUserOutfitManager] Invalid preset name provided');

            return '[Outfit System] Invalid preset name provided.';

        }


        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';


        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);


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

    /**
     * Sets whether prompt injection is enabled for this outfit instance (user panel doesn't use this)
     * @param {boolean} enabled - Whether prompt injection should be enabled
     * @param {string|null} [instanceId=null] - The instance ID to set for (defaults to current instance ID)
     * @returns {void}
     */
    setPromptInjectionEnabled(enabled, instanceId = null) {
        // User panel doesn't need this functionality
        console.warn('[NewUserOutfitManager] Prompt injection setting is not applicable for user panel');
    }

    /**
     * Gets whether prompt injection is enabled for this outfit instance (user panel doesn't use this)
     * @param {string|null} [instanceId=null] - The instance ID to get for (defaults to current instance ID)
     * @returns {boolean} Whether prompt injection is enabled (always true for user panel)
     */
    getPromptInjectionEnabled(instanceId = null) {
        // User panel doesn't need this functionality
        return true; // Default to true (enabled) for user panel
    }

    /**
     * Checks if there is a default outfit for this instance
     * @param {string|null} [instanceId=null] - The instance ID to check (defaults to current instance ID)
     * @returns {boolean} Whether there is a default outfit
     */
    hasDefaultOutfit(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

        return Boolean(presets && presets['default']);
    }

    /**
     * Gets the name of the default preset for this instance
     * @param {string|null} [instanceId=null] - The instance ID to get default for (defaults to current instance ID)
     * @returns {string|null} The name of the default preset or null if none is set
     */
    getDefaultPresetName(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

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
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for user instance ${actualInstanceId}. Cannot set as default.`;
        }

        // Copy the preset data to the 'default' preset
        const presetToSetAsDefault = presets[presetName];

        // Save this preset data as the 'default' preset
        outfitStore.savePreset('user', actualInstanceId, 'default', presetToSetAsDefault, 'user');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Set "${presetName}" as your default outfit (instance: ${actualInstanceId}).`;
        }
        return '';
    }

    async clearDefaultPreset(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Check if a default preset exists
        const {user: presets} = outfitStore.getPresets('user', actualInstanceId);

        if (!presets || !presets['default']) {
            return `[Outfit System] No default outfit set for user (instance: ${actualInstanceId}).`;
        }

        // Delete the 'default' preset
        outfitStore.deletePreset('user', actualInstanceId, 'default', 'user');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Default outfit cleared for user (instance: ${actualInstanceId}).`;
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

        // Check if there's a default outfit for the user and instance
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
