
import { outfitStore } from '../common/Store.js';

export class NewBotOutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.character = 'Unknown';
        this.characterId = null;
        this.currentValues = {};
        this.outfitInstanceId = null;

        this.slots.forEach(slot => { 
            this.currentValues[slot] = 'None'; 
        });
    }



    setCharacter(name, characterId = null) {
        if (name === this.character) { return; }
        
        // Validate the character name
        if (!name || typeof name !== 'string') {
            console.warn('[NewBotOutfitManager] Invalid character name provided, using "Unknown"');
            name = 'Unknown';
        }
        
        this.character = name;
        this.characterId = characterId;
        
        // Load outfit data for the character
        this.loadOutfit();
    }

    // Set outfit instance ID based on first message
    setOutfitInstanceId(instanceId) {
        // Before switching, save current values to the current namespace if we have an old instance ID
        if (this.outfitInstanceId) {
            this.saveOutfit();
        }
        
        this.outfitInstanceId = instanceId;
        this.loadOutfit();
    }
    
    // Get current instance ID
    getOutfitInstanceId() {
        return this.outfitInstanceId;
    }

    // Get the variable name for a slot in the current instance
    getVarName(slot) {
        if (!this.characterId || !this.outfitInstanceId) {
            // If we don't have proper IDs, return a default pattern
            // This might happen during initialization
            return `OUTFIT_INST_${this.characterId || 'unknown'}_temp_${slot}`;
        }
        return `OUTFIT_INST_${this.characterId}_${this.outfitInstanceId}_${slot}`;
    }

    // Load outfit from the store
    loadOutfit() {
        if (!this.characterId || !this.outfitInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot load outfit - missing characterId or outfitInstanceId');
            // Set all slots to 'None' as default
            this.slots.forEach(slot => {
                this.currentValues[slot] = 'None';
            });
            return;
        }

        // Get the outfits from the store
        const instanceOutfits = outfitStore.getBotOutfit(this.characterId, this.outfitInstanceId);

        // Load the slot values
        this.slots.forEach(slot => {
            const value = instanceOutfits[slot] !== undefined ? instanceOutfits[slot] : 'None';

            this.currentValues[slot] = value;
        });
    }
    
    // Save outfit to the store
    saveOutfit() {
        if (!this.characterId || !this.outfitInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot save outfit - missing characterId or outfitInstanceId');
            return;
        }

        // Create the outfit data to save
        const botOutfit = {};

        this.slots.forEach(slot => {
            botOutfit[slot] = this.currentValues[slot] || 'None';
        });
        
        // Save to the store
        outfitStore.setBotOutfit(this.characterId, this.outfitInstanceId, botOutfit);
        
        // Persist settings to ensure data is saved for reload
        outfitStore.saveSettings();
    }
    


    async setOutfitItem(slot, value) {
        // Validate inputs
        if (!this.slots.includes(slot)) {
            console.error(`[NewBotOutfitManager] Invalid slot: ${slot}`);
            return null;
        }
        
        // Ensure empty values are stored as 'None'
        if (value === undefined || value === null || value === '') {
            value = 'None';
        }
        
        // Ensure the value is a string
        if (typeof value !== 'string') {
            value = String(value);
        }
        
        // Limit the length of values to prevent storage issues
        const MAX_VALUE_LENGTH = 1000;

        if (value.length > MAX_VALUE_LENGTH) {
            value = value.substring(0, MAX_VALUE_LENGTH);
            console.warn(`[NewBotOutfitManager] Value truncated to ${MAX_VALUE_LENGTH} characters for slot ${slot}`);
        }
        
        const previousValue = this.currentValues[slot];
        
        // Update internal state
        this.currentValues[slot] = value;
        
        // Update in the instance data
        if (this.characterId && this.outfitInstanceId) {
            // Save the entire outfit to persist the change
            this.saveOutfit();
        }

        if (previousValue === 'None' && value !== 'None') {
            return `${this.character} put on ${value}.`;
        } else if (value === 'None') {
            return `${this.character} removed ${previousValue}.`;
        } 
        return `${this.character} changed from ${previousValue} to ${value}.`;
    }

    async changeOutfitItem(slot) {
        // Validate the slot
        if (!this.slots.includes(slot)) {
            console.error(`[NewBotOutfitManager] Invalid slot: ${slot}`);
            return null;
        }
        
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, '');
            // Handle empty input as 'None'
            if (newValue === null) { return null; } // User cancelled the prompt
            if (newValue === '') { newValue = 'None'; } // User entered empty string
        } else {
            const choice = prompt(
                `${this.character}'s ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
                ''
            );

            if (choice === null) { return null; } // User cancelled the prompt
            // Handle empty input as 'None'
            if (choice === '') {
                newValue = 'None';
            } else {
                newValue = choice.toLowerCase() === 'remove' ? 'None' : choice;
            }
        }

        if (newValue !== currentValue) {
            return this.setOutfitItem(slot, newValue);
        }
        return null;
    }

    getOutfitData(slots) {
        return slots.map(slot => ({
            name: slot,
            value: this.currentValues[slot],
            varName: this.getVarName(slot)
        }));
    }
    
    // Methods for presets
    savePreset(presetName, instanceId = null) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[NewBotOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        // Create preset data for all slots
        const presetData = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Save to the store
        outfitStore.savePreset(this.character, actualInstanceId, presetName, presetData, 'bot');
        
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Saved "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }
    
    async loadPreset(presetName, instanceId = null) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }
        
        // Use either the provided instanceId or the current one
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
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }
        
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }
        
        // Delete the preset from the store
        const key = `${this.character}_${actualInstanceId}`;

        delete outfitStore.getState().presets.bot[key][presetName];
        
        // Cleanup character instance if no presets left
        const instancePresets = outfitStore.getState().presets.bot[key] || {};

        if (Object.keys(instancePresets).length === 0) {
            delete outfitStore.getState().presets.bot[key];
            
            // Also cleanup the character if no instances left
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
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        const { bot: presets } = outfitStore.getPresets(this.character, actualInstanceId);

        if (!presets) {
            return [];
        }
        return Object.keys(presets);
    }
}