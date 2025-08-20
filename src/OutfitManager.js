import { getContext, extension_settings, saveSettingsDebounced } from "../../../../extensions.js";
import { executeSlashCommands } from "../../../../script.js";

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
        this.character = name;
        this.loadOutfit();
    }

    getVarName(slot) {
        return `${this.character}_${slot}`;
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            const value = extension_settings.variables?.global?.[varName] || 'None';
            this.currentValues[slot] = value;
        });
    }

    async setOutfitItem(slot, value) {
        const previousValue = this.currentValues[slot];
        const varName = this.getVarName(slot);

        // Update global variable
        executeSlashCommands(`/setglobalvar key="${varName}" ${JSON.stringify(value)}`);
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

        executeSlashCommands(`/sys compact=true ${message}`);
        return true;
    }

    async changeOutfitItem(slot) {
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        if (currentValue === 'None') {
            // Wear something
            newValue = await callPopup(`What is ${this.character} wearing on their ${slot}?`, 'input');
        } else {
            // Remove or replace
            const choice = await callPopup(`Change ${this.character}'s ${slot}:`, 'buttons', [
                { text: 'Remove', value: 'remove' },
                { text: 'Replace', value: 'replace' }
            ]);

            if (choice === 'remove') {
                newValue = 'None';
            } else if (choice === 'replace') {
                newValue = await callPopup(`Replace ${currentValue} with:`, 'input');
            }
        }

        if (newValue !== null && newValue !== currentValue) {
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
