// Import utility functions for safe object property access
import { safeGet, safeSet } from '../utils/StringProcessor.js';

export class NewUserOutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.currentValues = {};
        this.outfitInstanceId = null;
        this.updateCharacterVariablesCallback = null; // Callback to update character variables
        // Initialize currentValues to ensure we have all slots defined
        this.slots.forEach(slot => {
            this.currentValues[slot] = 'None';
        });
    }

    // Method to set the callback for updating character variables
    setUpdateCharacterVariablesCallback(callback) {
        this.updateCharacterVariablesCallback = callback;
    }

    // Set outfit instance ID based on first message (for consistency with bot)
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
        if (!this.outfitInstanceId) {
            // If no instance ID, use a default user format
            return `OUTFIT_INST_USER_${slot}`;
        }
        return `OUTFIT_INST_USER_${this.outfitInstanceId}_${slot}`;
    }

    // Load outfit from the extension settings
    loadOutfit() {
        if (!this.outfitInstanceId) {
            console.warn('[NewUserOutfitManager] Cannot load outfit - missing outfitInstanceId');
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
        // User outfits are stored in the same structure as bot outfits
        const allInstances = safeGet(window, 'extension_settings.outfit_tracker.instances', {});
        let userOutfit = {};
        
        // First check if there's outfit data for this specific instance
        let found = false;
        for (const [charId, charInstances] of Object.entries(allInstances)) {
            if (charInstances[this.outfitInstanceId] && charInstances[this.outfitInstanceId].user) {
                userOutfit = charInstances[this.outfitInstanceId].user;
                found = true;
                break;
            }
        }
        
        // If not found in instance-specific data, look for user-specific data
        if (!found) {
            const userInstances = safeGet(window, 'extension_settings.outfit_tracker.user_instances', {});
            if (userInstances[this.outfitInstanceId]) {
                userOutfit = userInstances[this.outfitInstanceId];
                found = true;
            }
        }
        
        // If still not found, try to find user data from any instance
        if (!found) {
            for (const [charId, charInstances] of Object.entries(allInstances)) {
                for (const [instanceId, instanceData] of Object.entries(charInstances)) {
                    if (instanceData.user) {
                        userOutfit = instanceData.user;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
        }
        
        // If still not found, try the default user instance structure
        if (!found) {
            userOutfit = safeGet(window, `extension_settings.outfit_tracker.instances.user.${this.outfitInstanceId}`, {});
        }
        
        // Load the slot values
        this.slots.forEach(slot => {
            const value = userOutfit[slot] !== undefined ? userOutfit[slot] : 'None';
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
        if (!this.outfitInstanceId) {
            console.warn('[NewUserOutfitManager] Cannot save outfit - missing outfitInstanceId');
            return;
        }

        // Create the structure in extension settings
        if (!window.extension_settings.outfit_tracker.user_instances) {
            window.extension_settings.outfit_tracker.user_instances = {};
        }
        
        // Save the slot values from currentValues
        const userOutfit = {};
        this.slots.forEach(slot => {
            userOutfit[slot] = this.currentValues[slot] || 'None';
        });
        
        window.extension_settings.outfit_tracker.user_instances[this.outfitInstanceId] = userOutfit;
        
        // Also update the global variables for this instance
        for (const slot of this.slots) {
            const varName = this.getVarName(slot);
            if (varName) {
                this.setGlobalVariable(varName, userOutfit[slot]);
            }
        }
        
        // Ensure settings are saved
        if (window.saveSettingsDebounced) {
            window.saveSettingsDebounced();
        }
    }
    
    // Update the global pointer to the current instance
    updateGlobalInstancePointer() {
        if (!this.outfitInstanceId) {
            window.currentUserOutfitInstance = null;
            return;
        }
        
        // Get user outfit from the dedicated user instances structure
        const userInstances = safeGet(window, 'extension_settings.outfit_tracker.user_instances', {});
        const userOutfit = userInstances[this.outfitInstanceId] || {};
        
        window.currentUserOutfitInstance = userOutfit;
    }

    getGlobalVariable(name) {
        try {
            // Access extension_settings from the global window object
            const globalVars = safeGet(window, 'extension_settings.variables.global', {});
            return globalVars[name] || 'None';
        } catch (error) {
            console.error('[NewUserOutfitManager] Error accessing global variable:', name, error);
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
            console.error('[NewUserOutfitManager] Error setting global variable:', name, value, error);
        }
    }

    async setOutfitItem(slot, value) {
        // Validate inputs
        if (!this.slots.includes(slot)) {
            console.error(`[NewUserOutfitManager] Invalid slot: ${slot}`);
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
            console.warn(`[NewUserOutfitManager] Value truncated to ${MAX_VALUE_LENGTH} characters for slot ${slot}`);
        }
        
        const previousValue = this.currentValues[slot];
        
        // Update internal state
        this.currentValues[slot] = value;
        
        // Save the entire outfit to persist the change
        if (this.outfitInstanceId) {
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
            return `You put on ${value}.`;
        } else if (value === 'None') {
            return `You removed ${previousValue}.`;
        } 
        return `You changed from ${previousValue} to ${value}.`;
    }

    async changeOutfitItem(slot) {
        // Validate the slot
        if (!this.slots.includes(slot)) {
            console.error(`[NewUserOutfitManager] Invalid slot: ${slot}`);
            return null;
        }
        
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What are you wearing on your ${slot}?`, '');
            // Handle empty input as 'None'
            if (newValue === null) { return null; } // User cancelled the prompt
            if (newValue === '') { newValue = 'None'; } // User entered empty string
        } else {
            const choice = prompt(
                `Your ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
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
            console.error('[NewUserOutfitManager] Invalid preset name provided');
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
                await this.setOutfitItem(slot, value);
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
}