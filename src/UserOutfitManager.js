

export class UserOutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.currentValues = {};
        // Initialize currentValues to ensure we have all slots defined
        this.slots.forEach(slot => this.currentValues[slot] = 'None');
        this.initializeOutfit();
    }

    getVarName(slot) {
        return `User_${slot}`;
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

    initializeOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            if (this.getGlobalVariable(varName) === 'None' || this.getGlobalVariable(varName) === '') {
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
        // Ensure empty values are stored as 'None'
        if (value === undefined || value === null || value === '') {
            value = 'None';
        }
        
        const previousValue = this.currentValues[slot];
        const varName = this.getVarName(slot);
        this.setGlobalVariable(varName, value);
        this.currentValues[slot] = value;
    
        if (previousValue === 'None' && value !== 'None') {
            return `You put on ${value}.`;
        } else if (value === 'None') {
            return `You removed ${previousValue}.`;
        } else {
            return `You changed from ${previousValue} to ${value}.`;
        }
    }

    async changeOutfitItem(slot) {
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What are you wearing on your ${slot}?`, "");
            // Handle empty input as 'None'
            if (newValue === null) return null; // User cancelled the prompt
            if (newValue === "") newValue = 'None'; // User entered empty string
        } else {
            const choice = prompt(
                `Your ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
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
        if (!extension_settings.outfit_tracker.presets) {
            extension_settings.outfit_tracker.presets = { bot: {}, user: {} };
        }
        
        // Create preset data for all slots
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Save or update preset
        extension_settings.outfit_tracker.presets.user[presetName] = presetData;
        
        if (extension_settings.outfit_tracker.enableSysMessages) {
            return `Saved "${presetName}" outfit for user character.`;
        }
        return '';
    }
    
    async loadPreset(presetName) {
        if (!extension_settings.outfit_tracker.presets?.user?.[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found.`;
        }
        
        const preset = extension_settings.outfit_tracker.presets.user[presetName];
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
            return `You changed into the "${presetName}" outfit.`;
        }
        return `You are already wearing the "${presetName}" outfit.`;
    }
    
    deletePreset(presetName) {
        if (!extension_settings.outfit_tracker.presets?.user?.[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found.`;
        }
        
        delete extension_settings.outfit_tracker.presets.user[presetName];
        
        if (extension_settings.outfit_tracker.enableSysMessages) {
            return `Deleted your "${presetName}" outfit.`;
        }
        return '';
    }
    
    getPresets() {
        if (!extension_settings.outfit_tracker.presets?.user) {
            return [];
        }
        return Object.keys(extension_settings.outfit_tracker.presets.user);
    }
    
    setDefaultOutfit() {
        // Initialize presets if needed
        if (!extension_settings.outfit_tracker.presets) {
            extension_settings.outfit_tracker.presets = { bot: {}, user: {} };
        }
        
        // Create preset data for all slots
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Save as default preset
        extension_settings.outfit_tracker.presets.user['default'] = presetData;
        
        if (extension_settings.outfit_tracker.enableSysMessages) {
            return `Set your default outfit.`;
        }
        return '';
    }
    
    setPresetAsDefault(presetName) {
        // Initialize presets if needed
        if (!extension_settings.outfit_tracker.presets) {
            extension_settings.outfit_tracker.presets = { bot: {}, user: {} };
        }
        
        // Check if the preset exists
        if (!extension_settings.outfit_tracker.presets.user[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found.`;
        }
        
        // Get the preset data
        const presetData = extension_settings.outfit_tracker.presets.user[presetName];
        
        // Save as default preset
        extension_settings.outfit_tracker.presets.user['default'] = presetData;
        
        if (extension_settings.outfit_tracker.enableSysMessages) {
            return `Set "${presetName}" as your default outfit.`;
        }
        return '';
    }
    
    loadDefaultOutfit() {
        if (!extension_settings.outfit_tracker.presets?.user?.['default']) {
            return `[Outfit System] No default outfit set for user.`;
        }
        
        const preset = extension_settings.outfit_tracker.presets.user['default'];
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
            return `You changed into your default outfit.`;
        }
        return `You were already wearing your default outfit.`;
    }
    
    hasDefaultOutfit() {
        return !!extension_settings.outfit_tracker.presets?.user?.['default'];
    }
    
    // Identify which preset is the default by comparing data
    getDefaultPresetName() {
        if (!this.hasDefaultOutfit()) {
            return null;
        }
        
        const defaultPreset = extension_settings.outfit_tracker.presets.user['default'];
        const presets = extension_settings.outfit_tracker.presets.user;
        
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
