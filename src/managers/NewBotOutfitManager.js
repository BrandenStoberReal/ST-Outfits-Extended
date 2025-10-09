// Import utility functions for safe object property access
import { safeGet, safeSet } from '../utils/StringProcessor.js';

export class NewBotOutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.character = 'Unknown';
        this.characterId = null;
        this.currentValues = {};
        this.outfitInstanceId = null;
        this.updateCharacterVariablesCallback = null; // Callback to update character variables
        this.slots.forEach(slot => { 
            this.currentValues[slot] = 'None'; 
        });
    }

    // Method to set the callback for updating character variables
    setUpdateCharacterVariablesCallback(callback) {
        this.updateCharacterVariablesCallback = callback;
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

    // Load outfit from the extension settings
    loadOutfit() {
        if (!this.characterId || !this.outfitInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot load outfit - missing characterId or outfitInstanceId');
            // Set all slots to 'None' as default
            this.slots.forEach(slot => {
                this.currentValues[slot] = 'None';
                // Set in extension settings as well
                const varName = this.getVarName(slot);
                if (varName) {
                    this.setGlobalVariable(varName, 'None');
                }
            });
            return;
        }

        // Get the outfits from extension settings
        const instanceOutfits = safeGet(window, `extension_settings.outfit_tracker.instances.${this.characterId}.${this.outfitInstanceId}.bot`, {});
        
        // Load the slot values
        this.slots.forEach(slot => {
            const value = instanceOutfits[slot] !== undefined ? instanceOutfits[slot] : 'None';
            this.currentValues[slot] = value;
            
            // Also update the global variable with the instance-specific name
            const varName = this.getVarName(slot);
            if (varName) {
                this.setGlobalVariable(varName, value);
            }
        });
        
        // Update the global instance pointer
        this.updateGlobalInstancePointer();
        
        // Trigger callback to update character variables
        if (this.updateCharacterVariablesCallback && typeof this.updateCharacterVariablesCallback === 'function') {
            this.updateCharacterVariablesCallback();
        }
    }
    
    // Save outfit to the extension settings
    saveOutfit() {
        if (!this.characterId || !this.outfitInstanceId) {
            console.warn('[NewBotOutfitManager] Cannot save outfit - missing characterId or outfitInstanceId');
            return;
        }

        // Create the structure in extension settings
        if (!window.extension_settings.outfit_tracker.instances) {
            window.extension_settings.outfit_tracker.instances = {};
        }
        
        if (!window.extension_settings.outfit_tracker.instances[this.characterId]) {
            window.extension_settings.outfit_tracker.instances[this.characterId] = {};
        }
        
        if (!window.extension_settings.outfit_tracker.instances[this.characterId][this.outfitInstanceId]) {
            window.extension_settings.outfit_tracker.instances[this.characterId][this.outfitInstanceId] = { bot: {}, user: {} };
        }
        
        // Save the slot values from currentValues
        const botOutfit = {};
        this.slots.forEach(slot => {
            botOutfit[slot] = this.currentValues[slot] || 'None';
        });
        
        window.extension_settings.outfit_tracker.instances[this.characterId][this.outfitInstanceId].bot = botOutfit;
        
        // Also update the global variables for this instance
        for (const slot of this.slots) {
            const varName = this.getVarName(slot);
            if (varName) {
                this.setGlobalVariable(varName, botOutfit[slot]);
            }
        }
        
        // Ensure settings are saved
        if (window.saveSettingsDebounced) {
            window.saveSettingsDebounced();
        }
    }
    
    // Update the global pointer to the current instance
    updateGlobalInstancePointer() {
        if (!this.characterId || !this.outfitInstanceId) {
            window.currentBotOutfitInstance = null;
            return;
        }
        
        const instanceOutfits = safeGet(window, `extension_settings.outfit_tracker.instances.${this.characterId}.${this.outfitInstanceId}.bot`, {});
        window.currentBotOutfitInstance = instanceOutfits;
    }

    getGlobalVariable(name) {
        try {
            // Access extension_settings from the global window object
            const globalVars = safeGet(window, 'extension_settings.variables.global', {});
            return globalVars[name] || 'None';
        } catch (error) {
            console.error('[NewBotOutfitManager] Error accessing global variable:', name, error);
            return 'None';
        }
    }

    setGlobalVariable(name, value) {
        try {
            // Store in extension settings which is where SillyTavern expects global variables
            if (!window.extension_settings?.variables) {
                if (!window.extension_settings) { window.extension_settings = {}; }
                window.extension_settings.variables = { global: {} };
            }
            window.extension_settings.variables.global[name] = value;

            // Call the callback if it's set to update character variables
            if (this.updateCharacterVariablesCallback && typeof this.updateCharacterVariablesCallback === 'function') {
                this.updateCharacterVariablesCallback();
            }
        } catch (error) {
            console.error('[NewBotOutfitManager] Error setting global variable:', name, value, error);
        }
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
        
        // Update the instance-specific global variable too
        const varName = this.getVarName(slot);
        if (varName) {
            this.setGlobalVariable(varName, value);
        }
        
        // Update the global instance pointer
        this.updateGlobalInstancePointer();

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
        
        // Initialize presets if needed
        if (!safeGet(window, 'extension_settings.outfit_tracker.presets')) {
            safeSet(window, 'extension_settings.outfit_tracker.presets', { bot: {}, user: {} });
        }
        
        // Ensure character presets exist
        if (!safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`)) {
            safeSet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`, {});
        }
        
        // Create preset data for all slots
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Save or update preset with instance ID
        safeSet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}.${presetName}`, presetData);
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
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
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}`);

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
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}`);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }
        
        // Delete the preset
        delete safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}`)[presetName];
        
        // Cleanup character instance if no presets left
        const instancePresets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}`, {});
        if (Object.keys(instancePresets).length === 0) {
            delete safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`)[actualInstanceId];
            
            // Also cleanup the character if no instances left
            const characterPresets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`, {});
            if (Object.keys(characterPresets).length === 0) {
                delete safeGet(window, 'extension_settings.outfit_tracker.presets.bot')[this.character];
            }
        }
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Deleted "${presetName}" outfit for instance ${actualInstanceId}.`;
        }
        return '';
    }
    
    getPresets(instanceId = null) {
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}`);

        if (!presets) {
            return [];
        }
        return Object.keys(presets);
    }
}