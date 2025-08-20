import { extension_settings, getContext } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

export class OutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.character = 'Unknown';
        this.currentValues = {};

        // Initialize slot values to "None"
        slots.forEach(slot => {
            this.currentValues[slot] = 'None';
        });
    }

    setCharacter(name) {
        if (name === this.character) return;
        this.character = name;
        this.loadOutfit();
    }

    getVarName(slot) {
        // Sanitize character name for variable
        return `${this.character.replace(/\s+/g, '_')}_${slot}`;
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            const value = this.getGlobalVariable(varName) || 'None';
            this.currentValues[slot] = value;
        });
    }

    getGlobalVariable(name) {
        return window[name] ||
               (extension_settings.variables?.global?.[name] || 'None');
    }

    setGlobalVariable(name, value) {
        try {
            // Set in both systems for compatibility
            window[name] = value;

            if (!extension_settings.variables) {
                extension_settings.variables = { global: {} };
            }

            extension_settings.variables.global[name] = value;
        } catch (error) {
            console.error("[OutfitManager] Variable set failed", name, value, error);
        }
    }
    
    async setOutfitItem(slot, value) {
        const previousValue = this.currentValues[slot];
        const varName = this.getVarName(slot);

        // Update global variable
        this.setGlobalVariable(varName, value);
        this.currentValues[slot] = value;

        // Save settings immediately since we're modifying global state
        saveSettingsDebounced();

        // Generate system message
        let message;
        if (previousValue === 'None' && value !== 'None') {
            message = `${this.character} put on ${value}.`;
        } else if (value === 'None') {
            message = `${this.character} removed ${previousValue}.`;
        } else {
            message = `${this.character} changed from ${previousValue} to ${value}.`;
        }

        // CORRECTED: Use ST's slash command processor
        const context = getContext();
        context.executeSlashCommandImmediately(`/sys compact=true ${message}`);

        return true;
    }

    async changeOutfitItem(slot) {
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        try {
            if (currentValue === 'None') {
                // Wear something
                newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, "");
                if (newValue === null) return false; // User canceled
            } else {
                // Remove or replace
                const choice = prompt(
                    `${this.character}'s ${slot}: ${currentValue}\n\n` +
                    "Enter 'remove' to remove, or type new item:",
                    ""
                );

                if (choice === null) return false; // User canceled

                if (choice.toLowerCase() === 'remove') {
                    newValue = 'None';
                } else {
                    newValue = choice;
                }
            }

            if (newValue !== currentValue) {
                return this.setOutfitItem(slot, newValue);
            }
            return false;
        } catch (error) {
            console.error("[OutfitManager] Change outfit failed", error);
            return false;
        }
    }

    getOutfitData() {
        return this.slots.map(slot => ({
            name: slot,
            value: this.currentValues[slot],
            varName: this.getVarName(slot)
        }));
    // Initialize all slots to "None" on first use
    ensureInitialized() {
        let initialized = false;

        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            const currentValue = this.getGlobalVariable(varName);

            if (currentValue === undefined || currentValue === null) {
                this.setGlobalVariable(varName, 'None');
                initialized = true;
            }
        });

        if (initialized) {
            saveSettingsDebounced();
            this.loadOutfit(); // Refresh local values
        }
    }

    // Call this after setting character
    setCharacter(name) {
        if (name === this.character) return;
        this.character = name;
        this.ensureInitialized(); // NEW: Initialize on character set
        this.loadOutfit();
    }
}
