// Import utility functions for safe object property access
import { safeGet, safeSet } from '../utils/StringProcessor.js';

export class UserOutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.currentValues = {};
        this.outfitInstanceId = null; // New: unique identifier for the outfit instance
        this.updateCharacterVariablesCallback = null; // Callback to update character variables
        // Initialize currentValues to ensure we have all slots defined
        this.slots.forEach(slot => {
            this.currentValues[slot] = 'None';
        });
        this.initializeOutfit();
    }

    // Method to set the callback for updating character variables
    setUpdateCharacterVariablesCallback(callback) {
        this.updateCharacterVariablesCallback = callback;
    }

    // New method: set outfit instance ID
    setOutfitInstanceId(instanceId) {
        // Only update if the instance ID is actually changing
        if (this.outfitInstanceId !== instanceId) {
            console.log(`[UserOutfitManager] Changing outfit instance from "${this.outfitInstanceId}" to "${instanceId}"`);
            
            // For user, we don't need instance-specific data since user outfits should persist across all instances
            // We just need to update the instance ID for tracking purposes
            this.outfitInstanceId = instanceId;
            // Load outfit data (will be the same for all instances)
            this.loadOutfit();
        }
    }
    
    // Method to migrate outfit data from an old instance ID to a new one - not needed since we're not using instance IDs anymore
    migrateOutfitData() {
        console.log('[UserOutfitManager] Migration not needed as user outfits are now persistent across all instances');
        
        // Since we're now using simple OUTFIT_INST_USER_<slot> format, we just need to make sure the values are saved
        for (const slot of this.slots) {
            const varName = this.getVarName(slot); // This will return OUTFIT_INST_USER_<slot>

            this.setGlobalVariable(varName, this.currentValues[slot]);
        }
    }
    
    // Method to cleanup old temporary instance variables
    cleanupTempInstances() {
        // Since we no longer use instance-specific variables for user, 
        // there's nothing to clean up in this case
        console.log('[UserOutfitManager] No temporary user instance variables to clean up');
    }

    // New method: get current instance ID
    getOutfitInstanceId() {
        return this.outfitInstanceId;
    }

    getVarName(slot) {
        // Create a unique namespace for this outfit instance
        // Format: OUTFIT_INST_USER_<slot> - tied to user but persistent across chat resets
        return `OUTFIT_INST_USER_${slot}`;
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            let value = this.getGlobalVariable(varName);
            

            
            // Make sure empty strings and other falsy values become 'None'
            this.currentValues[slot] = (value !== undefined && value !== null && value !== '') ? value : 'None';
            // Also ensure the global variable itself is not empty
            if (value === undefined || value === null || value === '') {
                this.setGlobalVariable(varName, 'None');
                this.currentValues[slot] = 'None';
            }
        });
    }
    
    // Helper function to get all global variables
    getAllVariables() {
        try {
            const globalVars = safeGet(window, 'extension_settings.variables.global', {});

            return globalVars;
        } catch (error) {
            console.error('[UserOutfitManager] Error accessing global variables:', error);
            return {};
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

    getGlobalVariable(name) {
        try {
            // Access extension_settings from the global window object - only look in extension settings
            const globalVars = safeGet(window, 'extension_settings.variables.global', {});

            return globalVars[name] || 'None';
        } catch (error) {
            console.error('[UserOutfitManager] Error accessing global variable:', name, error);
            return 'None';
        }
    }

    setGlobalVariable(name, value) {
        try {
            // Store in extension settings which is where SillyTavern expects global variables
            if (!window.extension_settings?.variables) {
                if (!window.extension_settings) {window.extension_settings = {};}
                window.extension_settings.variables = { global: {} };
            }
            window.extension_settings.variables.global[name] = value;

            // Call the callback if it's set to update character variables
            if (this.updateCharacterVariablesCallback && typeof this.updateCharacterVariablesCallback === 'function') {
                this.updateCharacterVariablesCallback();
            }
        } catch (error) {
            console.error('[UserOutfitManager] Error setting global variable:', name, value, error);
        }
    }

    async setOutfitItem(slot, value) {
        // Validate inputs
        if (!this.slots.includes(slot)) {
            console.error(`[UserOutfitManager] Invalid slot: ${slot}`);
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
            console.warn(`[UserOutfitManager] Value truncated to ${MAX_VALUE_LENGTH} characters for slot ${slot}`);
        }
        
        const previousValue = this.currentValues[slot];
        const varName = this.getVarName(slot);

        this.setGlobalVariable(varName, value);
        this.currentValues[slot] = value;
    
        if (previousValue === 'None' && value !== 'None') {
            return `You put on ${value}.`;
        } else if (value === 'None') {
            return `You removed ${previousValue}.`;
        } 
        return `You changed from ${previousValue} to ${value}.`;
        
    }

    async changeOutfitItem(slot) {
        // Validate the slot
        if (!this.slots.includes(slot)) {
            console.error(`[UserOutfitManager] Invalid slot: ${slot}`);
            return null;
        }
        
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What are you wearing on your ${slot}?`, '');
            // Handle empty input as 'None'
            if (newValue === null) {return null;} // User cancelled the prompt
            if (newValue === '') {newValue = 'None';} // User entered empty string
        } else {
            const choice = prompt(
                `Your ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
                ''
            );

            if (choice === null) {return null;} // User cancelled the prompt
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
            value: (this.currentValues[slot] !== undefined && this.currentValues[slot] !== null && this.currentValues[slot] !== '') 
                ? this.currentValues[slot] 
                : 'None',
            varName: this.getVarName(slot)
        }));
    }

    // New method: get the namespace for this instance (for UI display)
    getInstanceNamespace() {
        // For user, we use a simple namespace since outfits are persistent across instances
        return 'OUTFIT_INST_USER';
    }
    
    // New method: save preset with instance ID
    savePreset(presetName, instanceId = null) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[UserOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        // Initialize presets if needed
        if (!safeGet(window, 'extension_settings.outfit_tracker.presets')) {
            safeSet(window, 'extension_settings.outfit_tracker.presets', { bot: {}, user: {} });
        }
        
        // Create preset data for all slots
        const presetData = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Save or update preset with instance ID
        safeSet(window, `extension_settings.outfit_tracker.presets.user.${actualInstanceId}.${presetName}`, presetData);
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Saved "${presetName}" outfit for user character (instance: ${actualInstanceId}).`;
        }
        return '';
    }
    
    overwritePreset(presetName, instanceId = null) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[UserOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        // Initialize presets if needed
        if (!safeGet(window, 'extension_settings.outfit_tracker.presets')) {
            safeSet(window, 'extension_settings.outfit_tracker.presets', { bot: {}, user: {} });
        }
        
        // Create preset data for all slots
        const presetData = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Overwrite the existing preset with instance ID
        safeSet(window, `extension_settings.outfit_tracker.presets.user.${actualInstanceId}.${presetName}`, presetData);
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Overwrote "${presetName}" outfit for user character (instance: ${actualInstanceId}).`;
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
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.user.${actualInstanceId}`);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for user instance ${actualInstanceId}.`;
        }
        
        const preset = presets[presetName];
        let changed = false;
        
        for (const [slot, value] of Object.entries(preset)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                const varName = this.getVarName(slot); // This will use the current instance ID

                this.setGlobalVariable(varName, value);
                this.currentValues[slot] = value;
                changed = true;
            }
        }
        
        if (changed) {
            return `You changed into the "${presetName}" outfit (instance: ${actualInstanceId}).`;
        }
        return `You are already wearing the "${presetName}" outfit (instance: ${actualInstanceId}).`;
    }
    
    deletePreset(presetName, instanceId = null) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }
        
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.user.${actualInstanceId}`);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for user instance ${actualInstanceId}.`;
        }
        
        delete presets[presetName];
        
        // Cleanup instance if no presets left
        const instancePresets = safeGet(window, `extension_settings.outfit_tracker.presets.user.${actualInstanceId}`, {});

        if (Object.keys(instancePresets).length === 0) {
            delete safeGet(window, 'extension_settings.outfit_tracker.presets.user')[actualInstanceId];
            
            // Also cleanup the user if no instances left
            const userPresets = safeGet(window, 'extension_settings.outfit_tracker.presets.user', {});

            if (Object.keys(userPresets).length === 0) {
                delete window.extension_settings.outfit_tracker.presets.user;
            }
        }
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Deleted your "${presetName}" outfit for instance ${actualInstanceId}.`;
        }
        return '';
    }
    
    getPresets(instanceId = null) {
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.user.${actualInstanceId}`);

        if (!presets) {
            return [];
        }
        return Object.keys(presets);
    }
    
    setDefaultOutfit(instanceId = null) {
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        // Initialize presets if needed
        if (!safeGet(window, 'extension_settings.outfit_tracker.presets')) {
            safeSet(window, 'extension_settings.outfit_tracker.presets', { bot: {}, user: {} });
        }
        
        // Create preset data for all slots
        const presetData = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Save as default preset for this instance
        safeSet(window, 'extension_settings.outfit_tracker.presets.user.' + actualInstanceId + '.default', presetData);
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Set your default outfit for instance ${actualInstanceId}.`;
        }
        return '';
    }
    
    setPresetAsDefault(presetName, instanceId = null) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }
        
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        // Initialize presets if needed
        if (!safeGet(window, 'extension_settings.outfit_tracker.presets')) {
            safeSet(window, 'extension_settings.outfit_tracker.presets', { bot: {}, user: {} });
        }
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.user.${actualInstanceId}`);

        // Check if the preset exists
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }
        
        // Get the preset data
        const presetData = presets[presetName];
        
        // Save as default preset for this instance
        safeSet(window, 'extension_settings.outfit_tracker.presets.user.' + actualInstanceId + '.default', presetData);
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Set "${presetName}" as your default outfit for instance ${actualInstanceId}.`;
        }
        return '';
    }
    
    loadDefaultOutfit(instanceId = null) {
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.user.${actualInstanceId}`);

        if (!presets || !presets['default']) {
            return `[Outfit System] No default outfit set for user (instance: ${actualInstanceId}).`;
        }
        
        const preset = presets['default'];
        let changed = false;
        
        for (const [slot, value] of Object.entries(preset)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                const varName = this.getVarName(slot); // This will use the current instance ID

                this.setGlobalVariable(varName, value);
                this.currentValues[slot] = value;
                changed = true;
            }
        }
        
        for (const slot of this.slots) {
            if (!Object.prototype.hasOwnProperty.call(preset, slot) && this.currentValues[slot] !== 'None') {
                const varName = this.getVarName(slot); // This will use the current instance ID

                this.setGlobalVariable(varName, 'None');
                this.currentValues[slot] = 'None';
                changed = true;
            }
        }
        
        if (changed) {
            return `You changed into your default outfit (instance: ${actualInstanceId}).`;
        }
        return `You were already wearing your default outfit (instance: ${actualInstanceId}).`;
    }
    
    hasDefaultOutfit(instanceId = null) {
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.user.${actualInstanceId}`);

        return Boolean(presets && presets['default']);
    }
    
    // Identify which preset is the default by comparing data for a specific instance
    getDefaultPresetName(instanceId = null) {
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        if (!this.hasDefaultOutfit(actualInstanceId)) {
            return null;
        }
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.user.${actualInstanceId}`);

        if (!presets || !presets['default']) {
            return null;
        }
        
        const defaultPreset = presets['default'];
        
        // Find which preset matches the default data
        for (const [presetName, presetData] of Object.entries(presets)) {
            if (presetName !== 'default') { // Skip the default entry itself
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