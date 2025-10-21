
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

        outfitStore.saveSettings();

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

        

        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);



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

        

        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);



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

        

        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);



        if (!presets) {

            return [];

        }

        return Object.keys(presets);

    }

    

    async loadDefaultOutfit(instanceId = null) {

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        

        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);



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

}
