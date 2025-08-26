import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

export class UserOutfitManager {
    constructor(clothingSlots, accessorySlots) {
        this.clothingSlots = clothingSlots;
        this.accessorySlots = accessorySlots;
        this.slots = [...clothingSlots, ...accessorySlots];
        this.currentValues = {};
        this.slots.forEach(slot => this.currentValues[slot] = 'None');
        this.loadOutfit();
    }

    getVarName(slot) {
        return `User_${slot}`;
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            this.currentValues[slot] = this.getGlobalVariable(varName) || 'None';
        });
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

        if (previousValue === 'None' && value !== 'None') {
            return `[Outfit System] {{user}} put on ${value}.`;
        } else if (value === 'None') {
            return `[Outfit System] {{user}} removed ${previousValue}.`;
        } else {
            return `[Outfit System] {{user}} changed from ${previousValue} to ${value}.`;
        }
    }

    async changeOutfitItem(slot) {
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What are you wearing on your ${slot}?`, "");
            if (!newValue) return null;
        } else {
            const choice = prompt(
                `Your ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
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
    
    // PRESET FUNCTIONS
    savePreset(name) {
        if (!extension_settings.outfit_tracker.user_presets) {
            extension_settings.outfit_tracker.user_presets = {};
        }
        
        extension_settings.outfit_tracker.user_presets[name] = {
            ...this.currentValues
        };
        
        saveSettingsDebounced();
        return `[Outfit System] Outfit preset "${name}" saved`;
    }
    
    loadPreset(name) {
        if (!extension_settings.outfit_tracker.user_presets?.[name]) {
            return null;
        }
        
        const preset = extension_settings.outfit_tracker.user_presets[name];
        const changes = [];
        
        // Apply preset values
        for (const slot in preset) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== preset[slot]) {
                // Directly set without triggering individual messages
                this.setGlobalVariable(this.getVarName(slot), preset[slot]);
                this.currentValues[slot] = preset[slot];
                changes.push(slot);
            }
        }
        
        return {
            message: `[Outfit System] {{user}} wore the "${name}" outfit.`,
            changes
        };
    }
    
    getPresetNames() {
        if (!extension_settings.outfit_tracker.user_presets) return [];
        return Object.keys(extension_settings.outfit_tracker.user_presets);
    }
    
    deletePreset(name) {
        if (!extension_settings.outfit_tracker.user_presets?.[name]) return false;
        
        delete extension_settings.outfit_tracker.user_presets[name];
        saveSettingsDebounced();
        return true;
    }
}
