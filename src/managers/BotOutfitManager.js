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
        this.slots.forEach(slot => this.currentValues[slot] = '');
    }

    setCharacter(name, characterId = null, chatId = null) {
        if (name === this.character) return;
        
        // Validate the character name
        if (!name || typeof name !== 'string') {
            console.warn('[BotOutfitManager] Invalid character name provided, using "Unknown"');
            name = 'Unknown';
        }
        
        this.character = name;
        this.characterId = characterId;
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
            
            // Only migrate data if transitioning from a temporary ID to a permanent one
            // Don't migrate when switching between different permanent instance IDs (e.g., different first messages)
            if (oldInstanceId && instanceId && oldInstanceId.startsWith('temp_') && !instanceId.startsWith('temp_')) {
                this.migrateOutfitData(oldInstanceId, instanceId);
            }
            
            this.outfitInstanceId = instanceId;
            // Load outfit data for this specific instance
            this.loadOutfit();
        }
    }
    
    // Method to migrate outfit data from an old instance ID to a new one
    migrateOutfitData(oldInstanceId, newInstanceId) {
        console.log(`[BotOutfitManager] Migrating outfit data from "${oldInstanceId}" to "${newInstanceId}"`);
        
        // For each slot, copy the data from the old instance to the new instance
        this.slots.forEach(slot => {
            const oldVarName = `OUTFIT_INST_${this.characterId || 'unknown'}_${this.chatId || 'unknown'}_${oldInstanceId}_${slot}`;
            const newVarName = `OUTFIT_INST_${this.characterId || 'unknown'}_${this.chatId || 'unknown'}_${newInstanceId}_${slot}`;
            
            const value = this.getGlobalVariable(oldVarName);
            if (value !== undefined && value !== null && value !== '') {
                // Copy the value to the new instance
                this.setGlobalVariable(newVarName, value);
                console.log(`[BotOutfitManager] Migrated ${slot} from ${oldVarName} to ${newVarName}: ${value}`);
                
                // Remove the old variable to clean up
                if (window.extension_settings?.variables?.global) {
                    delete window.extension_settings.variables.global[oldVarName];
                    console.log(`[BotOutfitManager] Cleaned up old variable: ${oldVarName}`);
                }
            }
        });
    }
    
    // Method to cleanup old temporary instance variables
    cleanupTempInstances() {
        const allVars = this.getAllVariables();
        const tempVarPattern = new RegExp(`^OUTFIT_INST_${this.characterId || 'unknown'}_${this.chatId || 'unknown'}_temp_`);
        
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
        // Format: OUTFIT_INST_<characterId>_<chatId>_<instanceId>_<slot>
        if (this.outfitInstanceId && !this.outfitInstanceId.startsWith('temp_')) {
            const instanceNamespace = `OUTFIT_INST_${this.characterId || 'unknown'}_${this.chatId || 'unknown'}_${this.outfitInstanceId}`;
            return `${instanceNamespace}_${slot}`;
        } else if (this.outfitInstanceId && this.outfitInstanceId.startsWith('temp_')) {
            // For temporary IDs, use a format that will be migrated when the real ID is set
            const instanceNamespace = `OUTFIT_INST_${this.characterId || 'unknown'}_${this.chatId || 'unknown'}_${this.outfitInstanceId}`;
            return `${instanceNamespace}_${slot}`;
        } else {
            // Fallback to original format if no instance ID is set
            const formattedCharacterName = this.character.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            return `${formattedCharacterName}_${slot}`;
        }
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            let value = this.getGlobalVariable(varName);
            
            // Only use a temporary fallback when we're using a temp instance ID and no value exists
            // But we only want to use a fallback if there's a previous outfit instance for the same character/chat
            // that matches the same characterId and chatId, not just any instance
            if (this.outfitInstanceId && this.outfitInstanceId.startsWith('temp_') && (value === undefined || value === null || value === '')) {
                // Try to find any previous outfit instance values for this specific character/chat to migrate
                const allVars = this.getAllVariables();
                const matchingVars = Object.keys(allVars).filter(key => 
                    key.startsWith(`OUTFIT_INST_${this.characterId || 'unknown'}_${this.chatId || 'unknown'}_`) && 
                    key.endsWith(`_${slot}`) &&
                    !key.includes('temp_') && // Exclude temp vars to avoid circular checks
                    key !== varName // Exclude the current var to prevent self-reference
                );
                
                if (matchingVars.length > 0) {
                    // Use the value from the first matching variable found (most recent)
                    // Sort by instance ID to get the most recent one if multiple exist
                    const sortedVars = matchingVars.sort((a, b) => {
                        // Extract timestamp from instance ID if it's in the format scenario_hash_timestamp
                        const extractTimestamp = (varKey) => {
                            const parts = varKey.split('_');
                            const instanceIdPart = parts.slice(3, -1).join('_'); // Extract the instance ID part
                            const timestamp = parseInt(instanceIdPart.split('_').pop());
                            return isNaN(timestamp) ? 0 : timestamp;
                        };
                        return extractTimestamp(b) - extractTimestamp(a); // Sort in descending order (most recent first)
                    });
                    
                    const previousVarName = sortedVars[0];
                    value = allVars[previousVarName];
                    console.log(`[BotOutfitManager] Migrating ${slot} value from previous instance: ${previousVarName} = ${value}`);
                } else {
                    // If no previous instance was found for this character/chat, just set to 'None'
                    value = 'None';
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
            console.error('[BotOutfitManager] Error accessing global variables:', error);
            return {};
        }
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

    // New method: get the namespace for this instance (for UI display)
    getInstanceNamespace() {
        if (this.outfitInstanceId) {
            return `OUTFIT_INST_${this.characterId || 'unknown'}_${this.chatId || 'unknown'}_${this.outfitInstanceId}`;
        }
        return null;
    }

    // New method: get all outfit instances for this character
    getAllOutfitInstances() {
        const allVars = safeGet(window, 'extension_settings.variables.global', {});
        const instanceVars = {};
        
        for (const [varName, value] of Object.entries(allVars)) {
            if (varName.startsWith(`OUTFIT_INST_${this.characterId || 'unknown'}_${this.chatId || 'unknown'}_`)) {
                // Extract instance ID from the variable name
                const parts = varName.split('_');
                if (parts.length >= 5) { // OUTFIT_INST, characterId, chatId, instanceId, slot
                    const instanceId = parts[3]; // The instance ID is the 4th part (0-indexed: 3)
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
            if (!preset.hasOwnProperty(slot) && this.currentValues[slot] !== 'None') {
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
        return !!(presets && presets['default']);
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