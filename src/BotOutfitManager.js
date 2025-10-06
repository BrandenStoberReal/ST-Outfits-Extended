// extension_settings is expected to be available in the global scope once the extension initializes
import { safeGet, safeSet } from './StringProcessor.js';

export class BotOutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.character = 'Unknown';
        this.currentValues = {};
        this.slots.forEach(slot => this.currentValues[slot] = '');
    }

    setCharacter(name) {
        if (name === this.character) return;
        
        // Validate the character name
        if (!name || typeof name !== 'string') {
            console.warn('[BotOutfitManager] Invalid character name provided, using "Unknown"');
            name = 'Unknown';
        }
        
        this.character = name;
        // Ensure all slots have proper values (not empty) when loading
        this.loadOutfit();
        // Check if any slots are still empty and initialize them to 'None'
        for (const slot of this.slots) {
            const varName = this.getVarName(slot);
            const value = this.getGlobalVariable(varName);
            // If the value is empty or undefined, set it to 'None'
            if (value === undefined || value === null || value === '') {
                this.setGlobalVariable(varName, 'None');
                this.currentValues[slot] = 'None';
            }
        }
    }

    initializeOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            if (this.getGlobalVariable(varName) === 'None' || this.getGlobalVariable(varName) === '') {
                this.setGlobalVariable(varName, 'None');
            }
        });
        this.loadOutfit();
    }

    getVarName(slot) {
        // Ensure the character name is properly formatted for variable names
        const formattedCharacterName = this.character.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        return `${formattedCharacterName}_${slot}`;
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            const value = this.getGlobalVariable(varName);
            // Make sure empty strings and other falsy values become 'None'
            this.currentValues[slot] = (value !== undefined && value !== null && value !== '') ? value : 'None';
            // Also ensure the global variable itself is not empty
            if (value === undefined || value === null || value === '') {
                this.setGlobalVariable(varName, 'None');
                this.currentValues[slot] = 'None';
            }
        });
    }

    getGlobalVariable(name) {
        try {
            // Access extension_settings from the global window object
            const globalVars = safeGet(window, 'extension_settings.variables.global', {});
            return globalVars[name] || window[name] || 'None';
        } catch (error) {
            console.error('[BotOutfitManager] Error accessing global variable:', name, error);
            return 'None';
        }
    }

    setGlobalVariable(name, value) {
        try {
            window[name] = value;
            if (!window.extension_settings?.variables) {
                if (!window.extension_settings) window.extension_settings = {};
                window.extension_settings.variables = { global: {} };
            }
            window.extension_settings.variables.global[name] = value;
        } catch (error) {
            console.error('[BotOutfitManager] Error setting global variable:', name, value, error);
        }
    }

    async setOutfitItem(slot, value) {
        // Validate inputs
        if (!this.slots.includes(slot)) {
            console.error(`[BotOutfitManager] Invalid slot: ${slot}`);
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
            console.warn(`[BotOutfitManager] Value truncated to ${MAX_VALUE_LENGTH} characters for slot ${slot}`);
        }
        
        const previousValue = this.currentValues[slot];
        const varName = this.getVarName(slot);
        this.setGlobalVariable(varName, value);
        this.currentValues[slot] = value;
    
        if (previousValue === 'None' && value !== 'None') {
            return `${this.character} put on ${value}.`;
        } else if (value === 'None') {
            return `${this.character} removed ${previousValue}.`;
        } else {
            return `${this.character} changed from ${previousValue} to ${value}.`;
        }
    }

    async changeOutfitItem(slot) {
        // Validate the slot
        if (!this.slots.includes(slot)) {
            console.error(`[BotOutfitManager] Invalid slot: ${slot}`);
            return null;
        }
        
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, "");
            // Handle empty input as 'None'
            if (newValue === null) return null; // User cancelled the prompt
            if (newValue === "") newValue = 'None'; // User entered empty string
        } else {
            const choice = prompt(
                `${this.character}'s ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
                ""
            );

            if (choice === null) return null; // User cancelled the prompt
            // Handle empty input as 'None'
            if (choice === "") {
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
            value: (this.currentValues[slot] !== undefined && this.currentValues[slot] !== null && this.currentValues[slot] !== '') 
                ? this.currentValues[slot] 
                : 'None',
            varName: this.getVarName(slot)
        }));
    }

    savePreset(presetName) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[BotOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        
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
        
        // Save or update preset
        safeSet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${presetName}`, presetData);
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Saved "${presetName}" outfit for ${this.character}.`;
        }
        return '';
    }
    
    async loadPreset(presetName) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`);
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found.`;
        }
        
        const preset = presets[presetName];
        let changed = false;
        
        for (const [slot, value] of Object.entries(preset)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                const varName = this.getVarName(slot);
                this.setGlobalVariable(varName, value);
                this.currentValues[slot] = value;
                changed = true;
            }
        }
        
        if (changed) {
            return `${this.character} changed into the "${presetName}" outfit.`;
        }
        return `${this.character} was already wearing the "${presetName}" outfit.`;
    }
    
    deletePreset(presetName) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`);
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found.`;
        }
        
        // Delete the preset
        delete safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`)[presetName];
        
        // Cleanup character if no presets left
        const characterPresets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`, {});
        if (Object.keys(characterPresets).length === 0) {
            delete safeGet(window, 'extension_settings.outfit_tracker.presets.bot')[this.character];
        }
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Deleted "${presetName}" outfit.`;
        }
        return '';
    }
    
    getPresets() {
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`);
        if (!presets) {
            return [];
        }
        return Object.keys(presets);
    }
    
    setDefaultOutfit() {
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
        
        // Save as default preset
        safeSet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.default`, presetData);
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Set default outfit for ${this.character}.`;
        }
        return '';
    }
    
    setPresetAsDefault(presetName) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }
        
        // Initialize presets if needed
        if (!safeGet(window, 'extension_settings.outfit_tracker.presets')) {
            safeSet(window, 'extension_settings.outfit_tracker.presets', { bot: {}, user: {} });
        }
        
        // Ensure character presets exist
        if (!safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`)) {
            safeSet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`, {});
        }
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`);
        // Check if the preset exists
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found.`;
        }
        
        // Get the preset data
        const presetData = presets[presetName];
        
        // Save as default preset
        safeSet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.default`, presetData);
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Set "${presetName}" as default outfit for ${this.character}.`;
        }
        return '';
    }
    
    loadDefaultOutfit() {
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`);
        if (!presets || !presets['default']) {
            return `[Outfit System] No default outfit set for ${this.character}.`;
        }
        
        const preset = presets['default'];
        let changed = false;
        
        for (const [slot, value] of Object.entries(preset)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                const varName = this.getVarName(slot);
                this.setGlobalVariable(varName, value);
                this.currentValues[slot] = value;
                changed = true;
            }
        }
        
        for (const slot of this.slots) {
            if (!preset.hasOwnProperty(slot) && this.currentValues[slot] !== 'None') {
                const varName = this.getVarName(slot);
                this.setGlobalVariable(varName, 'None');
                this.currentValues[slot] = 'None';
                changed = true;
            }
        }
        
        if (changed) {
            return `${this.character} changed into their default outfit.`;
        }
        return `${this.character} was already wearing their default outfit.`;
    }
    
    hasDefaultOutfit() {
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`);
        return !!(presets && presets['default']);
    }
    
    // Identify which preset is the default by comparing data
    getDefaultPresetName() {
        if (!this.hasDefaultOutfit()) {
            return null;
        }
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`);
        if (!presets || !presets['default']) {
            return null;
        }
        
        const defaultPreset = presets['default'];
        
        // Find which preset matches the default data
        for (const [presetName, presetData] of Object.entries(presets)) {
            if (presetName !== 'default') {  // Skip the default entry itself
                let isMatch = true;
                
                // Compare all slots in the preset
                for (const slot of this.slots) {
                    if (defaultPreset[slot] !== presetData[slot]) {
                        isMatch = false;
                        break;
                    }
                }
                
                // If all slots match, this is our default preset
                if (isMatch) {
                    // Check that all non-slot properties also match (for completeness)
                    const defaultKeys = Object.keys(defaultPreset);
                    const presetKeys = Object.keys(presetData);
                    
                    if (defaultKeys.length === presetKeys.length) {
                        return presetName;
                    }
                }
            }
        }
        
        // If no matching preset found, return a special value to indicate the default exists but doesn't match any preset
        return 'default';
    }
}