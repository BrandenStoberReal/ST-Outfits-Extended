// src/OutfitManager.js
import { extension_settings } from "../../../../extensions.js";
import { executeSlashCommands } from "../../../../script.js";

export class OutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.character = 'Unknown';
        this.currentValues = {};
        this.isFirstRun = true; // Track first initialization
    }

    setCharacter(name) {
        if (this.character === name && !this.isFirstRun) return;
        this.character = name;
        this.loadOutfit();
        this.isFirstRun = false;
    }

    getVarName(slot) {
        return `${this.character.replace(/\s+/g, '_')}_${slot}`;
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            const value = this.getGlobalVariable(varName);

            // Initialize to "None" if not set
            if (value === undefined || value === null) {
                this.setGlobalVariable(varName, 'None');
                this.currentValues[slot] = 'None';
            } else {
                this.currentValues[slot] = value;
            }
        });
    }

    getGlobalVariable(name) {
        return extension_settings.variables?.global?.[name] || 'None';
    }

    setGlobalVariable(name, value) {
        if (!extension_settings.variables) {
            extension_settings.variables = { global: {} };
        }
        extension_settings.variables.global[name] = value;
    }

    async setOutfitItem(slot, value) {
        const previousValue = this.currentValues[slot];
        const varName = this.getVarName(slot);

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

        // Post system message using slash command
        executeSlashCommands(`/sys compact=true ${message}`);
        return true;
    }

    async changeOutfitItem(slot) {
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, "");
            if (newValue === null) return false; // User canceled
        } else {
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
    }

    getOutfitData() {
        return this.slots.map(slot => ({
            name: slot,
            value: this.currentValues[slot],
            varName: this.getVarName(slot)
        }));
    }
}
