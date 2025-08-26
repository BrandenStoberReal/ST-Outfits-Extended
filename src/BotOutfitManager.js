import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

export class BotOutfitManager {
    constructor(clothingSlots, accessorySlots) {
        this.clothingSlots = clothingSlots;
        this.accessorySlots = accessorySlots;
        this.slots = [...clothingSlots, ...accessorySlots];
        this.character = 'Unknown';
        this.currentValues = {};
        this.slots.forEach(slot => this.currentValues[slot] = 'None');
    }

    setCharacter(name) {
        if (name === this.character) return;
        this.character = name;
        this.loadOutfit();
    }

    // Initialize variables for new characters
    initializeOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            if (this.getGlobalVariable(varName) === 'None') {
                this.setGlobalVariable(varName, 'None');
            }
        });
        this.loadOutfit();
    }

    getVarName(slot) {
        return `${this.character.replace(/\s+/g, '_')}_${slot}`;
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            this.currentValues[slot] = this.getGlobalVariable(varName) || 'None';
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

    savePreset(name) {
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
        return `[Outfit System] Outfit preset "${name}" saved for ${this.character}`;
    }
    
    loadPreset(name) {
        const presets = extension_settings.outfit_tracker.bot_presets?.[this.character];
        if (!presets || !presets[name]) return null;
        
        const preset = presets[name];
        const changes = [];
        
        // Apply preset values
        for (const slot in preset) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== preset[slot]) {
                this.setOutfitItem(slot, preset[slot]);
                changes.push(`${slot}: ${preset[slot]}`);
            }
        }
        
        return {
            message: `[Outfit System] ${this.character} wore the "${name}" outfit.`,
            changes
        };
    }
    
    getPresetNames() {
        const presets = extension_settings.outfit_tracker.bot_presets?.[this.character];
        return presets ? Object.keys(presets) : [];
    }
    
    deletePreset(name) {
        const presets = extension_settings.outfit_tracker.bot_presets?.[this.character];
        if (!presets || !presets[name]) return false;
        
        delete presets[name];
        saveSettingsDebounced();
        return true;
    }

    async setOutfitItem(slot, value) {
        const previousValue = this.currentValues[slot];
        const varName = this.getVarName(slot);
        this.setGlobalVariable(varName, value);
        this.currentValues[slot] = value;

        if (previousValue === 'None' && value !== 'None') {
            return `[Outfit System] ${this.character} put on ${value}.`;
        } else if (value === 'None') {
            return `[Outfit System] ${this.character} removed ${previousValue}.`;
        } else {
            return `[Outfit System] ${this.character} changed from ${previousValue} to ${value}.`;
        }
    }

    async changeOutfitItem(slot) {
        const currentValue = this.currentValues[slot];
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
        return this.slots.map(slot => ({
            name: slot,
            value: this.currentValues[slot],
            varName: this.getVarName(slot)
        }));
    }
}
