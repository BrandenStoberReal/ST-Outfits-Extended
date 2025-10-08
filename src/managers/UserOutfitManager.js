// Import utility functions for safe object property access
import { safeGet, safeSet } from '../utils/StringProcessor.js';

export class UserOutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.currentValues = {};
        this.outfitInstanceId = null; // New: unique identifier for the outfit instance
        // Initialize currentValues to ensure we have all slots defined
        this.slots.forEach(slot => this.currentValues[slot] = 'None');
        this.initializeOutfit();
    }

    // New method: set outfit instance ID
    setOutfitInstanceId(instanceId) {
        const oldInstanceId = this.outfitInstanceId;
        
        // Only update if the instance ID is actually changing
        if (this.outfitInstanceId !== instanceId) {
            console.log(`[UserOutfitManager] Changing outfit instance from "${this.outfitInstanceId}" to "${instanceId}"`);
            
            // If transitioning from a temporary ID to a permanent one, migrate the data
            if (oldInstanceId && oldInstanceId.startsWith('temp_') && instanceId && !instanceId.startsWith('temp_')) {
                this.migrateOutfitData(oldInstanceId, instanceId);
            }
            
            this.outfitInstanceId = instanceId;
            // Load outfit data for this specific instance
            this.loadOutfit();
        }
    }
    
    // Method to migrate outfit data from an old instance ID to a new one
    migrateOutfitData(oldInstanceId, newInstanceId) {
        console.log(`[UserOutfitManager] Migrating outfit data from "${oldInstanceId}" to "${newInstanceId}"`);
        
        // For each slot, copy the data from the old instance to the new instance
        this.slots.forEach(slot => {
            const oldVarName = `OUTFIT_INST_USER_${oldInstanceId}_${slot}`;
            const newVarName = `OUTFIT_INST_USER_${newInstanceId}_${slot}`;
            
            const value = this.getGlobalVariable(oldVarName);
            if (value !== undefined && value !== null && value !== '') {
                // Copy the value to the new instance
                this.setGlobalVariable(newVarName, value);
                console.log(`[UserOutfitManager] Migrated ${slot} from ${oldVarName} to ${newVarName}: ${value}`);
                
                // Remove the old variable to clean up
                if (window.extension_settings?.variables?.global) {
                    delete window.extension_settings.variables.global[oldVarName];
                    console.log(`[UserOutfitManager] Cleaned up old variable: ${oldVarName}`);
                }
            }
        });
    }
    
    // Method to cleanup old temporary instance variables
    cleanupTempInstances() {
        const allVars = this.getAllVariables();
        const tempVarPattern = /^OUTFIT_INST_USER_temp_/;
        
        for (const varName in allVars) {
            if (tempVarPattern.test(varName)) {
                delete window.extension_settings.variables.global[varName];
                console.log(`[UserOutfitManager] Cleaned up temporary variable: ${varName}`);
            }
        }
    }

    // New method: get current instance ID
    getOutfitInstanceId() {
        return this.outfitInstanceId;
    }

    getVarName(slot) {
        // Create a unique namespace for this outfit instance
        // Format: OUTFIT_INST_USER_<instanceId>_<slot>
        if (this.outfitInstanceId && !this.outfitInstanceId.startsWith('temp_')) {
            return `OUTFIT_INST_USER_${this.outfitInstanceId}_${slot}`;
        } else if (this.outfitInstanceId && this.outfitInstanceId.startsWith('temp_')) {
            // For temporary IDs, use a format that will be migrated when the real ID is set
            return `OUTFIT_INST_USER_${this.outfitInstanceId}_${slot}`;
        } else {
            // Fallback to original format if no instance ID is set
            return `User_${slot}`;
        }
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            let value = this.getGlobalVariable(varName);
            
            // If we're using a temporary instance ID and the value doesn't exist,
            // check if there was a previous instance with this slot value
            if (this.outfitInstanceId && this.outfitInstanceId.startsWith('temp_') && (value === undefined || value === null || value === '')) {
                // Try to find any previous outfit instance values for this user to migrate
                const allVars = this.getAllVariables();
                const matchingVars = Object.keys(allVars).filter(key => 
                    key.startsWith('OUTFIT_INST_USER_') && 
                    key.endsWith(`_${slot}`) &&
                    !key.includes('temp_')  // Exclude temp vars to avoid circular checks
                );
                
                if (matchingVars.length > 0) {
                    // Use the value from the first matching variable found (most recent)
                    const previousVarName = matchingVars[0];
                    value = allVars[previousVarName];
                    console.log(`[UserOutfitManager] Migrating ${slot} value from previous instance: ${previousVarName} = ${value}`);
                }
            }
            
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
            const globalVars = safeGet(window, 'extension_settings.variables.global', {});
            return globalVars[name] || window[name] || 'None';
        } catch (error) {
            console.error('[UserOutfitManager] Error accessing global variable:', name, error);
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
        } else {
            return `You changed from ${previousValue} to ${value}.`;
        }
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

    // New method: get the namespace for this instance (for UI display)
    getInstanceNamespace() {
        if (this.outfitInstanceId) {
            return `OUTFIT_INST_USER_${this.outfitInstanceId}`;
        }
        return null;
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
            const userPresets = safeGet(window, `extension_settings.outfit_tracker.presets.user`, {});
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
            if (!preset.hasOwnProperty(slot) && this.currentValues[slot] !== 'None') {
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
        return !!(presets && presets['default']);
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