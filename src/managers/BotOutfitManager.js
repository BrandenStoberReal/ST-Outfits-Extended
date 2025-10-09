// extension_settings is expected to be available in the global scope once the extension initializes

// Import utility functions for safe object property access
import { safeGet, safeSet } from '../utils/StringProcessor.js';

export class BotOutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.character = 'Unknown';
        this.characterId = null;
        this.chatId = null;
        this.currentValues = {};
        this.outfitInstanceId = null; // New: unique identifier for the outfit instance
        this.updateCharacterVariablesCallback = null; // Callback to update character variables
        this.slots.forEach(slot => { this.currentValues[slot] = ''; });
    }

    // Method to set the callback for updating character variables
    setUpdateCharacterVariablesCallback(callback) {
        this.updateCharacterVariablesCallback = callback;
    }

    setCharacter(name, characterId = null, chatId = null) {
        if (name === this.character) {return;}
        
        // Validate the character name
        if (!name || typeof name !== 'string') {
            console.warn('[BotOutfitManager] Invalid character name provided, using "Unknown"');
            name = 'Unknown';
        }
        
        this.character = name;
        this.characterId = characterId;
        // NOTE: We still store chatId for compatibility with any existing code that might reference it,
        // but the variable naming no longer uses chatId to persist across chat resets
        this.chatId = chatId;
        
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

    // New method: set outfit instance ID based on first message or scenario
    setOutfitInstanceId(instanceId) {
        const oldInstanceId = this.outfitInstanceId;
        
        // Only update if the instance ID is actually changing
        if (this.outfitInstanceId !== instanceId) {
            console.log(`[BotOutfitManager] Changing outfit instance from "${this.outfitInstanceId}" to "${instanceId}"`);
            
            // Before switching, save current values to the current namespace
            if (this.outfitInstanceId) {
                console.log(`[BotOutfitManager] Saving current values to namespace ${this.outfitInstanceId}`);
                for (const slot of this.slots) {
                    // Use the helper method to get the variable name for the old instance
                    const oldVarName = this.getVarNameForInstance(slot, this.outfitInstanceId);

                    this.setGlobalVariable(oldVarName, this.currentValues[slot]);
                    console.log(`[BotOutfitManager] Saved ${slot} as ${this.currentValues[slot]} in ${oldVarName}`);
                }
            }
            
            // Only migrate data if transitioning from a temporary ID to a permanent one
            // Don't migrate when switching between different permanent instance IDs (e.g., different first messages)
            if (oldInstanceId && instanceId && oldInstanceId.startsWith('temp_') && !instanceId.startsWith('temp_')) {
                console.log('[BotOutfitManager] Starting migration from temporary to permanent instance');
                this.migrateOutfitData(oldInstanceId, instanceId);
            }
            
            this.outfitInstanceId = instanceId;
            
            // Load outfit data for this specific instance
            // But first, make sure we have the right data loaded for our slots
            this.loadOutfit();
        }
    }
    
    // Method to migrate outfit data from an old instance ID to a new one
    migrateOutfitData(oldInstanceId, newInstanceId) {
        console.log(`[BotOutfitManager] Migrating outfit data from "${oldInstanceId}" to "${newInstanceId}"`);
        
        // For each slot, copy the data from the old instance to the new instance
        this.slots.forEach(slot => {
            const oldVarName = `OUTFIT_INST_${this.characterId || 'unknown'}_${oldInstanceId}_${slot}`;
            const newVarName = `OUTFIT_INST_${this.characterId || 'unknown'}_${newInstanceId}_${slot}`;
            
            // Get the value directly from extension_settings to ensure we get the actual stored value
            let value = null;
            let valueFound = false;
            
            if (window.extension_settings?.variables?.global && 
                Object.prototype.hasOwnProperty.call(window.extension_settings.variables.global, oldVarName)) {
                value = window.extension_settings.variables.global[oldVarName];
                valueFound = true;
                console.log(`[BotOutfitManager] Found value in extension_settings for ${oldVarName}: ${value}`);
            }
            
            // If value is in window object but not in extension_settings, look there
            if (!valueFound && Object.prototype.hasOwnProperty.call(window, oldVarName)) {
                value = window[oldVarName];
                valueFound = true;
                console.log(`[BotOutfitManager] Found value in window object for ${oldVarName}: ${value}`);
            }
            
            console.log(`[BotOutfitManager] Processing migration for ${slot}: oldVarName=${oldVarName}, value=${value}, valueFound=${valueFound}`);
            
            // Only migrate if we have a valid non-empty value
            if (valueFound && value !== undefined && value !== null && value !== '' && value !== 'None') {
                // Copy the value to the new instance
                this.setGlobalVariable(newVarName, value);
                console.log(`[BotOutfitManager] Migrated ${slot} from ${oldVarName} to ${newVarName}: ${value}`);
                
                // Remove the old variable to clean up
                if (window.extension_settings?.variables?.global) {
                    delete window.extension_settings.variables.global[oldVarName];
                    console.log(`[BotOutfitManager] Cleaned up old variable: ${oldVarName}`);
                }
            } else if (!valueFound || value === '' || value === undefined || value === null) {
                // If the old value doesn't exist, ensure the new variable uses 'None' instead of empty
                this.setGlobalVariable(newVarName, 'None');
                console.log(`[BotOutfitManager] Set ${newVarName} to 'None' since old value was not found, empty, undefined, or null`);
            } else {
                console.log(`[BotOutfitManager] Skipping migration for ${slot} from ${oldVarName} - value is 'None'`);
            }
        });
    }
    
    // Method to cleanup old temporary instance variables
    cleanupTempInstances() {
        const allVars = this.getAllVariables();
        const tempVarPattern = new RegExp(`^OUTFIT_INST_${this.characterId || 'unknown'}_temp_`);
        
        for (const varName in allVars) {
            if (tempVarPattern.test(varName)) {
                delete window.extension_settings.variables.global[varName];
                console.log(`[BotOutfitManager] Cleaned up temporary variable: ${varName}`);
            }
        }
    }

    // New method: get current instance ID
    getOutfitInstanceId() {
        return this.outfitInstanceId;
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
        // Create a unique namespace for this outfit instance
        // Format: OUTFIT_INST_<characterId>_<instanceId>_<slot> - removed chatId to persist across chat resets
        if (this.outfitInstanceId && !this.outfitInstanceId.startsWith('temp_')) {
            const instanceNamespace = `OUTFIT_INST_${this.characterId || 'unknown'}_${this.outfitInstanceId}`;

            return `${instanceNamespace}_${slot}`;
        } else if (this.outfitInstanceId && this.outfitInstanceId.startsWith('temp_')) {
            // For temporary IDs, use a format that will be migrated when the real ID is set
            const instanceNamespace = `OUTFIT_INST_${this.characterId || 'unknown'}_${this.outfitInstanceId}`;

            return `${instanceNamespace}_${slot}`;
        } 
        // Fallback to original format if no instance ID is set
        const formattedCharacterName = this.character.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

        return `${formattedCharacterName}_${slot}`;
        
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            let value = this.getGlobalVariable(varName);
            
            console.log(`[BotOutfitManager] Loading ${slot} from ${varName}, got value: ${value}`);
            
            // Only use a temporary fallback when we're using a temp instance ID and no value exists
            // Look for existing outfit data for this character from previous instances
            if (this.outfitInstanceId && this.outfitInstanceId.startsWith('temp_') && (value === undefined || value === null || value === '' || value === 'None')) {
                console.log(`[BotOutfitManager] Looking for previous outfit instance values for ${slot} (current value is "${value}")`);
                
                // First check if there is a default outfit for this character and instance that we should use
                // This ensures that if the user has set a default outfit, it takes precedence over random previous instances
                const defaultOutfits = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`, {});
                
                if (defaultOutfits && Object.keys(defaultOutfits).length > 0) {
                    // Look for default outfit in any instance
                    value = this.findDefaultOutfitValue(defaultOutfits, slot, value);
                    
                    // If still no value from defaults, look for any matching preset that contains this slot
                    if ((value === undefined || value === null || value === '' || value === 'None') && defaultOutfits) {
                        value = this.findAnyPresetValue(defaultOutfits, slot, value);
                    }
                }
                
                // Only fall back to previous instance if we still don't have a value from presets
                if (value === undefined || value === null || value === '' || value === 'None') {
                    // Try to find any previous outfit instance values for this specific character to migrate
                    const allVars = this.getAllVariables();
                    const matchingVars = Object.keys(allVars).filter(key => 
                        key.startsWith(`OUTFIT_INST_${this.characterId || 'unknown'}_`) && 
                        key.endsWith(`_${slot}`) &&
                        !key.includes('temp_') && // Exclude temp vars to avoid circular checks
                        key !== varName // Exclude the current var to prevent self-reference
                    );
                    
                    console.log(`[BotOutfitManager] Found ${matchingVars.length} previous instances for ${slot}`);
                    
                    if (matchingVars.length > 0) {
                        // Use the value from the most recently used matching variable
                        // To do this properly, we need to track the actual creation/modification time
                        // Since we don't have that, we'll try to infer based on the instance ID structure
                        // If instance IDs contain timestamps, we'll use those; otherwise, we'll take the first one
                        let previousVarName;
                        let mostRecentTimestamp = 0;
                        
                        for (const varName of matchingVars) {
                            // Extract potential timestamp from the instance ID part
                            const parts = varName.split('_');

                            if (parts.length >= 4) { // OUTFIT_INST_<characterId>_<instanceId>_<slot>
                                const instanceIdPart = parts[2]; // The instance ID is the 3rd part (0-indexed: 2)
                                
                                // Attempt to extract a timestamp from the instance ID
                                // Instance IDs may be in formats like: greeting_hello_world_abc123 or scenario_abc123
                                // In these cases, a timestamp might be at the end of the instance ID
                                const idParts = instanceIdPart.split('_');
                                const lastPart = idParts[idParts.length - 1];
                                
                                // Check if the last part looks like a timestamp (numeric)
                                const potentialTimestamp = parseInt(lastPart);

                                if (!isNaN(potentialTimestamp) && potentialTimestamp > mostRecentTimestamp) {
                                    mostRecentTimestamp = potentialTimestamp;
                                    previousVarName = varName;
                                }
                            }
                        }
                        
                        // If no timestamp was found, just use the first one
                        if (mostRecentTimestamp === 0) {
                            previousVarName = matchingVars[0];
                        }
                        
                        value = allVars[previousVarName];
                        console.log(`[BotOutfitManager] Migrating ${slot} value from previous instance: ${previousVarName} = ${value}`);
                    } else {
                        // If no previous instance was found for this character, just set to 'None'
                        console.log(`[BotOutfitManager] No previous instance found for ${slot}, using 'None'`);
                        value = 'None';
                    }
                }
            }
            
            // Make sure empty strings and other falsy values become 'None'
            this.currentValues[slot] = (value !== undefined && value !== null && value !== '' && value !== 'None') ? value : 'None';
            console.log(`[BotOutfitManager] Set current value for ${slot} to: ${this.currentValues[slot]}`);
            
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
            console.error('[BotOutfitManager] Error accessing global variables:', error);
            return {};
        }
    }

    getGlobalVariable(name) {
        try {
            // Access extension_settings from the global window object - only look in extension settings
            const globalVars = safeGet(window, 'extension_settings.variables.global', {});

            return globalVars[name] || 'None';
        } catch (error) {
            console.error('[BotOutfitManager] Error accessing global variable:', name, error);
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
        } 
        return `${this.character} changed from ${previousValue} to ${value}.`;
        
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
            newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, '');
            // Handle empty input as 'None'
            if (newValue === null) {return null;} // User cancelled the prompt
            if (newValue === '') {newValue = 'None';} // User entered empty string
        } else {
            const choice = prompt(
                `${this.character}'s ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
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
        if (this.outfitInstanceId) {
            return `OUTFIT_INST_${this.characterId || 'unknown'}_${this.outfitInstanceId}`;
        }
        return null;
    }
    
    // Helper method to get variable name for a specific instance
    getVarNameForInstance(slot, instanceId) {
        if (instanceId && !instanceId.startsWith('temp_')) {
            const instanceNamespace = `OUTFIT_INST_${this.characterId || 'unknown'}_${instanceId}`;

            return `${instanceNamespace}_${slot}`;
        } else if (instanceId && instanceId.startsWith('temp_')) {
            const instanceNamespace = `OUTFIT_INST_${this.characterId || 'unknown'}_${instanceId}`;

            return `${instanceNamespace}_${slot}`;
        } 
        // Fallback to original format if no instance ID is set
        const formattedCharacterName = this.character.replace(/\\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

        return `${formattedCharacterName}_${slot}`;
        
    }

    // New method: get all outfit instances for this character
    getAllOutfitInstances() {
        const allVars = safeGet(window, 'extension_settings.variables.global', {});
        const instanceVars = {};
        
        for (const [varName, value] of Object.entries(allVars)) {
            if (varName.startsWith(`OUTFIT_INST_${this.characterId || 'unknown'}_`)) {
                // Extract instance ID from the variable name
                const parts = varName.split('_');

                if (parts.length >= 4) { // OUTFIT_INST, characterId, instanceId, slot
                    const instanceId = parts[2]; // The instance ID is the 3rd part (0-indexed: 2)

                    if (!instanceVars[instanceId]) {
                        instanceVars[instanceId] = {};
                    }
                    // Extract slot name which should be the last part
                    const slot = varName.substring(varName.indexOf(`_${instanceId}_`) + instanceId.length + 2);

                    instanceVars[instanceId][slot] = value;
                }
            }
        }
        
        return instanceVars;
    }

    // New method: save preset with instance ID
    savePreset(presetName, instanceId = null) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[BotOutfitManager] Invalid preset name provided');
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
    
    overwritePreset(presetName, instanceId = null) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[BotOutfitManager] Invalid preset name provided');
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
        
        // Overwrite the existing preset with instance ID
        safeSet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}.${presetName}`, presetData);
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Overwrote "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
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
                const varName = this.getVarName(slot); // This will use the current instance ID

                this.setGlobalVariable(varName, value);
                this.currentValues[slot] = value;
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
    
    setDefaultOutfit(instanceId = null) {
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
        
        // Save as default preset for this instance
        safeSet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}.default`, presetData);
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Set default outfit for ${this.character} (instance: ${actualInstanceId}).`;
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
        
        // Ensure character presets exist
        if (!safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`)) {
            safeSet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}`, {});
        }
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}`);

        // Check if the preset exists
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }
        
        // Get the preset data
        const presetData = presets[presetName];
        
        // Save as default preset for this instance
        safeSet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}.default`, presetData);
        
        if (safeGet(window, 'extension_settings.outfit_tracker.enableSysMessages')) {
            return `Set "${presetName}" as default outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }
    
    loadDefaultOutfit(instanceId = null) {
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}`);

        if (!presets || !presets['default']) {
            return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}).`;
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
            return `${this.character} changed into their default outfit (instance: ${actualInstanceId}).`;
        }
        return `${this.character} was already wearing their default outfit (instance: ${actualInstanceId}).`;
    }
    
    hasDefaultOutfit(instanceId = null) {
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}`);

        return Boolean(presets && presets['default']);
    }
    
    // Identify which preset is the default by comparing data for a specific instance
    getDefaultPresetName(instanceId = null) {
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        if (!this.hasDefaultOutfit(actualInstanceId)) {
            return null;
        }
        
        const presets = safeGet(window, `extension_settings.outfit_tracker.presets.bot.${this.character}.${actualInstanceId}`);

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
    
    findDefaultOutfitValue(defaultOutfits, slot, currentValue) {
        let value = currentValue;

        // Look for default outfit in any instance
        for (const [, instancePresets] of Object.entries(defaultOutfits)) {
            if (instancePresets && instancePresets['default'] && instancePresets['default'][slot]) {
                value = instancePresets['default'][slot];
                console.log(`[BotOutfitManager] Found default outfit value for ${slot}: ${value}`);
                break;
            }
        }
        return value;
    }
    
    findAnyPresetValue(defaultOutfits, slot, currentValue) {
        let value = currentValue;

        // Look through all instances and presets to find a matching value for this slot
        for (const [, instancePresets] of Object.entries(defaultOutfits)) {
            if (instancePresets) {
                // Check first for the specifically named 'default' preset
                if (instancePresets['default'] && instancePresets['default'][slot]) {
                    value = instancePresets['default'][slot];
                    console.log(`[BotOutfitManager] Found default preset value for ${slot}: ${value}`);
                    break;
                }
                
                // If no default preset, look for other presets that have this slot filled
                for (const [presetName, presetData] of Object.entries(instancePresets)) {
                    if (presetName !== 'default' && presetData && presetData[slot] && presetData[slot] !== 'None' && presetData[slot] !== '') {
                        value = presetData[slot];
                        console.log(`[BotOutfitManager] Found preset value for ${slot} in preset ${presetName}: ${value}`);
                        break;
                    }
                }
                
                if (value !== undefined && value !== null && value !== '' && value !== 'None') {
                    break; // Found a value, stop searching
                }
            }
        }
        return value;
    }
}