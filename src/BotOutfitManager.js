// extension_settings is expected to be available in the global scope once the extension initializes

export class BotOutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.character = 'Unknown';
        this.currentValues = {};
        this.slots.forEach(slot => this.currentValues[slot] = '');
    }

    setCharacter(name) {
        if (name === this.character) return;
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
        return `${this.character.replace(/\s+/g, '_')}_${slot}`;
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
        // Access extension_settings from the global window object
        const globalVars = window.extension_settings?.variables?.global || {};
        return globalVars[name] || window[name] || 'None';
    }

    setGlobalVariable(name, value) {
        window[name] = value;
        if (!window.extension_settings.variables) window.extension_settings.variables = { global: {} };
        window.extension_settings.variables.global[name] = value;
    }

    async setOutfitItem(slot, value) {
        // Ensure empty values are stored as 'None'
        if (value === undefined || value === null || value === '') {
            value = 'None';
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
        // Initialize presets if needed
        if (!window.extension_settings.outfit_tracker.presets) {
            window.extension_settings.outfit_tracker.presets = { bot: {}, user: {} };
        }
        
        if (!window.extension_settings.outfit_tracker.presets.bot[this.character]) {
            window.extension_settings.outfit_tracker.presets.bot[this.character] = {};
        }
        
        // Create preset data for all slots
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Save or update preset
        window.extension_settings.outfit_tracker.presets.bot[this.character][presetName] = presetData;
        
        if (window.extension_settings.outfit_tracker.enableSysMessages) {
            return `Saved "${presetName}" outfit for ${this.character}.`;
        }
        return '';
    }
    
    async loadPreset(presetName) {
        if (!window.extension_settings.outfit_tracker.presets?.bot?.[this.character]?.[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found.`;
        }
        
        const preset = window.extension_settings.outfit_tracker.presets.bot[this.character][presetName];
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
        if (!window.extension_settings.outfit_tracker.presets?.bot?.[this.character]?.[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found.`;
        }
        
        delete window.extension_settings.outfit_tracker.presets.bot[this.character][presetName];
        
        // Cleanup character if no presets left
        if (Object.keys(window.extension_settings.outfit_tracker.presets.bot[this.character]).length === 0) {
            delete window.extension_settings.outfit_tracker.presets.bot[this.character];
        }
        
        if (window.extension_settings.outfit_tracker.enableSysMessages) {
            return `Deleted "${presetName}" outfit.`;
        }
        return '';
    }
    
    getPresets() {
        if (!window.extension_settings.outfit_tracker.presets?.bot?.[this.character]) {
            return [];
        }
        return Object.keys(window.extension_settings.outfit_tracker.presets.bot[this.character]);
    }
    
    setDefaultOutfit() {
        // Initialize presets if needed
        if (!window.extension_settings.outfit_tracker.presets) {
            window.extension_settings.outfit_tracker.presets = { bot: {}, user: {} };
        }
        
        if (!window.extension_settings.outfit_tracker.presets.bot[this.character]) {
            window.extension_settings.outfit_tracker.presets.bot[this.character] = {};
        }
        
        // Create preset data for all slots
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Save as default preset
        window.extension_settings.outfit_tracker.presets.bot[this.character]['default'] = presetData;
        
        if (window.extension_settings.outfit_tracker.enableSysMessages) {
            return `Set default outfit for ${this.character}.`;
        }
        return '';
    }
    
    setPresetAsDefault(presetName) {
        // Initialize presets if needed
        if (!window.extension_settings.outfit_tracker.presets) {
            window.extension_settings.outfit_tracker.presets = { bot: {}, user: {} };
        }
        
        if (!window.extension_settings.outfit_tracker.presets.bot[this.character]) {
            window.extension_settings.outfit_tracker.presets.bot[this.character] = {};
        }
        
        // Check if the preset exists
        if (!window.extension_settings.outfit_tracker.presets.bot[this.character][presetName]) {
            return `[Outfit System] Preset "${presetName}" not found.`;
        }
        
        // Get the preset data
        const presetData = window.extension_settings.outfit_tracker.presets.bot[this.character][presetName];
        
        // Save as default preset
        window.extension_settings.outfit_tracker.presets.bot[this.character]['default'] = presetData;
        
        if (window.extension_settings.outfit_tracker.enableSysMessages) {
            return `Set "${presetName}" as default outfit for ${this.character}.`;
        }
        return '';
    }
    
    loadDefaultOutfit() {
        if (!window.extension_settings.outfit_tracker.presets?.bot?.[this.character]?.['default']) {
            return `[Outfit System] No default outfit set for ${this.character}.`;
        }
        
        const preset = window.extension_settings.outfit_tracker.presets.bot[this.character]['default'];
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
        return !!window.extension_settings.outfit_tracker.presets?.bot?.[this.character]?.['default'];
    }
    
    // Identify which preset is the default by comparing data
    getDefaultPresetName() {
        if (!this.hasDefaultOutfit()) {
            return null;
        }
        
        const defaultPreset = window.extension_settings.outfit_tracker.presets.bot[this.character]['default'];
        const presets = window.extension_settings.outfit_tracker.presets.bot[this.character];
        
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