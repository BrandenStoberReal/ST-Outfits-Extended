
import { outfitStore } from '../common/Store.js';
import { ALL_SLOTS } from '../config/constants.js';

export class NewUserOutfitManager {
    constructor(slots = ALL_SLOTS) {
        this.slots = slots;
        this.currentValues = {};
        this.outfitInstanceId = null;

        // Initialize currentValues to ensure we have all slots defined
        this.slots.forEach(slot => {
            this.currentValues[slot] = 'None';
        });
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

    // Load outfit from the store
    loadOutfit() {
        if (!this.outfitInstanceId) {
            console.warn('[NewUserOutfitManager] Cannot load outfit - missing outfitInstanceId');
            // Set all slots to 'None' as default
            this.slots.forEach(slot => {
                this.currentValues[slot] = 'None';
            });
            return;
        }

        // Get the user outfits from the store
        const userOutfit = outfitStore.getUserOutfit(this.outfitInstanceId);

        // Load the slot values
        this.slots.forEach(slot => {
            const value = userOutfit[slot] !== undefined ? userOutfit[slot] : 'None';

            this.currentValues[slot] = value;
        });
    }
    
    // Save outfit to the store
    saveOutfit() {
        if (!this.outfitInstanceId) {
            console.warn('[NewUserOutfitManager] Cannot save outfit - missing outfitInstanceId');
            return;
        }

        // Create the outfit data to save
        const userOutfit = {};

        this.slots.forEach(slot => {
            userOutfit[slot] = this.currentValues[slot] || 'None';
        });
        
        // Save to the store
        outfitStore.setUserOutfit(this.outfitInstanceId, userOutfit);
        
        // Persist settings to ensure data is saved for reload
        outfitStore.saveSettings();
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
        
        // Create preset data for all slots
        const presetData = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Save to the store
        outfitStore.savePreset('user', actualInstanceId, presetName, presetData, 'user');
        
        if (outfitStore.getSetting('enableSysMessages')) {
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
        
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);

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
        
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for user instance ${actualInstanceId}.`;
        }
        
        // Delete the preset from the store
        delete outfitStore.getState().presets.user[actualInstanceId][presetName];
        
        // Cleanup instance if no presets left
        const instancePresets = outfitStore.getState().presets.user[actualInstanceId] || {};

        if (Object.keys(instancePresets).length === 0) {
            delete outfitStore.getState().presets.user[actualInstanceId];
            
            // Also cleanup the user if no instances left
            const userPresets = outfitStore.getState().presets.user || {};

            if (Object.keys(userPresets).length === 0) {
                delete outfitStore.getState().presets.user;
            }
        }
        
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Deleted your "${presetName}" outfit for instance ${actualInstanceId}.`;
        }
        return '';
    }
    
    getPresets(instanceId = null) {
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);

        if (!presets) {
            return [];
        }
        return Object.keys(presets);
    }
    
    // Load default outfit for the current instance
    async loadDefaultOutfit(instanceId = null) {
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);

        if (!presets || !presets['default']) {
            return `[Outfit System] No default outfit set for user (instance: ${actualInstanceId}).`;
        }
        
        const preset = presets['default'];
        let changed = false;
        
        for (const [slot, value] of Object.entries(preset)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                await this.setOutfitItem(slot, value);
                changed = true;
            }
        }
        
        for (const slot of this.slots) {
            if (!Object.prototype.hasOwnProperty.call(preset, slot) && this.currentValues[slot] !== 'None') {
                await this.setOutfitItem(slot, 'None');
                changed = true;
            }
        }
        
        if (changed) {
            return `You changed into your default outfit (instance: ${actualInstanceId}).`;
        }
        return `You were already wearing your default outfit (instance: ${actualInstanceId}).`;
    }
    
    // Overwrite an existing preset with current outfit
    overwritePreset(presetName, instanceId = null) {
        // Validate the preset name
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[NewUserOutfitManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        
        // Use either the provided instanceId or the current one
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        
        // Check if preset exists
        const { user: presets } = outfitStore.getPresets('user', actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for user (instance: ${actualInstanceId}). Cannot overwrite.`;
        }
        
        // Create preset data for all slots
        const presetData = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Save to the store (this will overwrite the existing preset)
        outfitStore.savePreset('user', actualInstanceId, presetName, presetData, 'user');
        
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Overwrote your "${presetName}" outfit (instance: ${actualInstanceId}).`;
        }
        return '';
    }
}