import { extension_settings } from "../../../../extensions.js";

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

        try {
            // Update global variable
            this.setGlobalVariable(varName, value);
            this.currentValues[slot] = value;

            // Generate system message
            let message;
            if (previousValue === 'None' && value !== 'None') {
                message = `${this.character} put on ${value}.`;
            } else if (value === 'None') {
                message = `${this.character} removed ${previousValue}.`;
            } else {
                message = `${this.character} changed from ${previousValue} to ${value}.`;
            }

            return message;
        } catch (error) {
            console.error("[OutfitManager] Set outfit item failed", error);
            return null;
        }
    }

    async changeOutfitItem(slot) {
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        try {
            if (currentValue === 'None') {
                // Wear something
                newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, "");
                if (newValue === null) return null; // User canceled
            } else {
                // Remove or replace
                const choice = prompt(
                    `${this.character}'s ${slot}: ${currentValue}\n\n` +
                    "Enter 'remove' to remove, or type new item:",
                    ""
                );

                if (choice === null) return null; // User canceled

                if (choice.toLowerCase() === 'remove') {
                    newValue = 'None';
                } else {
                    newValue = choice;
                }
            }

            if (newValue !== currentValue) {
                return this.setOutfitItem(slot, newValue);
            }
            return null;
        } catch (error) {
            console.error("[OutfitManager] Change outfit failed", error);
            return null;
        }
    }

    getOutfitData() {
        return this.slots.map(slot => ({
            name: slot,
            value: this.currentValues[slot],
            varName: this.getVarName(slot)
        }));
    }
}
