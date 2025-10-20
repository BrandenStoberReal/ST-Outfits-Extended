
import { OutfitManager } from './OutfitManager.js';

import { outfitStore } from '../common/Store.js';



export class NewBotOutfitManager extends OutfitManager {

    constructor(slots) {

        super(slots);

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

        outfitStore.saveSettings();

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

        

        const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);



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

        

        const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);



        if (!presets || !presets[presetName]) {

            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;

        }

        

        const key = `${this.character}_${actualInstanceId}`;

        delete outfitStore.getState().presets.bot[key][presetName];

        

        const instancePresets = outfitStore.getState().presets.bot[key] || {};

        if (Object.keys(instancePresets).length === 0) {

            delete outfitStore.getState().presets.bot[key];

            

            const characterPresets = outfitStore.getState().presets.bot || {};

            if (Object.keys(characterPresets).length === 0) {

                delete outfitStore.getState().presets.bot;

            }

        }

        

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

    

    async loadDefaultOutfit(instanceId = null) {

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        

        const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);



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

}
