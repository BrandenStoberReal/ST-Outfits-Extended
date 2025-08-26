import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

export class BotOutfitManager {
    constructor(clothingSlots, accessorySlots) {
        // Debug logs for constructor
        console.log("BotOutfitManager created with slots:", { clothingSlots, accessorySlots });
        
        this.clothingSlots = clothingSlots;
        this.accessorySlots = accessorySlots;
        this.slots = [...clothingSlots, ...accessorySlots];
        this.character = 'Unknown';
        this.currentValues = {};
        this.slots.forEach(slot => this.currentValues[slot] = 'None');
    }

    setCharacter(name) {
        if (name === this.character) return;
        console.log(`BotOutfitManager character: ${name} (was: ${this.character})`);
        this.character = name;
        this.loadOutfit();
    }

    initializeOutfit() {
        console.log("Initializing outfit for character:", this.character);
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            if (this.getGlobalVariable(varName) === 'None') {
                this.setGlobalVariable(varName, 'None');
            }
        });
        this.loadOutfit();
    }

    getVarName(slot) {
        const varName = `oc_${this.character.replace(/\s+/g, '_')}_${slot}`;
        console.log(`Slot var name: ${slot} => ${varName}`);
        return varName;
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            this.currentValues[slot] = this.getGlobalVariable(varName) || 'None';
            console.log(`Loaded ${slot}: ${this.currentValues[slot]}`);
        });
    }

    getGlobalVariable(name) {
        const globalVars = extension_settings.variables?.global || {};
        return globalVars[name] || window[name] || 'None';
    }

    setGlobalVariable(name, value) {
        window[name] = value;
        if (!extension_settings.variables) extension_settings.variables = { global: {} };
        extension_settings.variables.global[name] = value;
    }

    async setOutfitItem(slot, value) {
        const previousValue = this.currentValues[slot];
        const varName = this.getVarName(slot);
        this.setGlobalVariable(varName, value);
        this.currentValues[slot] = value;

        let message = '';
        if (previousValue === 'None' && value !== 'None') {
            message = `[Outfit System] ${this.character} put on ${value}.`;
        } else if (value === 'None') {
            message = `[Outfit System] ${this.character} removed ${previousValue}.`;
        } else {
            message = `[Outfit System] ${this.character} changed from ${previousValue} to ${value}.`;
        }
        
        console.log(`Set outfit item: ${slot} to ${value}, message: ${message}`);
        return message;
    }

    async changeOutfitItem(slot) {
        const currentValue = this.currentValues[slot];
        console.log(`Changing outfit item: ${slot}, current: ${currentValue}`);
        
        let newValue = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, "");
            if (!newValue) return null;
        } else {
            const choice = prompt(
                `${this.character}'s ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
                ""
            );

            if (!choice) return null;
            newValue = choice.toLowerCase() === 'remove' ? 'None' : choice;
        }

        if (newValue !== currentValue) {
            return this.setOutfitItem(slot, newValue);
        }
        return null;
    }

    getOutfitData() {
        const data = this.slots.map(slot => ({
            name: slot,
            value: this.currentValues[slot],
            varName: this.getVarName(slot)
        }));
        
        console.log("Getting outfit data:", data);
        return data;
    }
    
    // PRESET FUNCTIONS
    savePreset(name) {
        console.log(`Saving preset: ${name} for ${this.character}`);
        
        if (!extension_settings.outfit_tracker.bot_presets) {
            extension_settings.outfit_tracker.bot_presets = {};
        }
        
        if (!extension_settings.outfit_tracker.bot_presets[this.character]) {
            extension_settings.outfit_tracker.bot_presets[this.character] = {};
        }
        
        extension_settings.outfit_tracker.bot_presets[this.character][name] = {
            ...this.currentValues
        };
        
        saveSettingsDebounced();
        
        const message = `[Outfit System] Outfit preset "${name}" saved for ${this.character}`;
        console.log(message);
        return message;
    }
    
    loadPreset(name) {
        console.log(`Loading preset: ${name} for ${this.character}`);
        
        const presets = extension_settings.outfit_tracker.bot_presets?.[this.character];
        if (!presets || !presets[name]) {
            console.log(`Preset ${name} not found for character ${this.character}`);
            return null;
        }
        
        const preset = presets[name];
        const changes = [];
        
        // Apply preset values
        for (const slot in preset) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== preset[slot]) {
                this.setGlobalVariable(this.getVarName(slot), preset[slot]);
                this.currentValues[slot] = preset[slot];
                changes.push(slot);
            }
        }
        
        const message = `[Outfit System] ${this.character} wore the "${name}" outfit.`;
        console.log(message, { changes });
        
        return {
            message,
            changes
        };
    }
    
    getPresetNames() {
        const presets = extension_settings.outfit_tracker.bot_presets?.[this.character] || {};
        const names = Object.keys(presets);
        console.log(`Preset names for ${this.character}:`, names);
        return names;
    }
    
    deletePreset(name) {
        console.log(`Deleting preset: ${name} for ${this.character}`);
        
        const presets = extension_settings.outfit_tracker.bot_presets?.[this.character];
        if (!presets || !presets[name]) {
            console.log(`Preset ${name} not found`);
            return false;
        }
        
        delete presets[name];
        saveSettingsDebounced();
        console.log(`Deleted preset: ${name}`);
        return true;
    }
}
