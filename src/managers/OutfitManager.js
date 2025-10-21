import { outfitStore } from '../common/Store.js';
import { ALL_SLOTS } from '../config/constants.js';

export class OutfitManager {
    constructor(slots = ALL_SLOTS) {
        this.slots = slots;
        this.currentValues = {};
        this.outfitInstanceId = null;
        this.character = 'Unknown';

        this.slots.forEach(slot => { 
            this.currentValues[slot] = 'None'; 
        });
    }

    setCharacter(name, characterId = null) {
        if (name === this.character) { return; }
        
        if (!name || typeof name !== 'string') {
            console.warn(`[${this.constructor.name}] Invalid character name provided, using "Unknown"`);
            name = 'Unknown';
        }
        
        this.character = name;
        this.characterId = characterId;
        
        this.loadOutfit();
    }

    setOutfitInstanceId(instanceId) {
        if (this.outfitInstanceId) {
            this.saveOutfit();
        }
        
        this.outfitInstanceId = instanceId;
        this.loadOutfit();
    }
    
    getOutfitInstanceId() {
        return this.outfitInstanceId;
    }
    
    getCurrentOutfit() {
        return { ...this.currentValues };
    }
    
    setOutfit(outfitData) {
        if (!outfitData || typeof outfitData !== 'object') {
            console.warn(`[${this.constructor.name}] Invalid outfit data provided to setOutfit`);
            return;
        }
        
        let changed = false;
        
        for (const [slot, value] of Object.entries(outfitData)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                this.currentValues[slot] = value || 'None';
                changed = true;
            }
        }
        
        if (changed && this.characterId && this.outfitInstanceId) {
            this.saveOutfit();
        }
    }

    getVarName(slot) {
        throw new Error('getVarName must be implemented by subclasses');
    }

    loadOutfit() {
        throw new Error('loadOutfit must be implemented by subclasses');
    }
    
    saveOutfit() {
        throw new Error('saveOutfit must be implemented by subclasses');
    }

    async setOutfitItem(slot, value) {
        if (!this.slots.includes(slot)) {
            console.error(`[${this.constructor.name}] Invalid slot: ${slot}`);
            return null;
        }
        
        if (value === undefined || value === null || value === '') {
            value = 'None';
        }
        
        if (typeof value !== 'string') {
            value = String(value);
        }
        
        const MAX_VALUE_LENGTH = 1000;

        if (value.length > MAX_VALUE_LENGTH) {
            value = value.substring(0, MAX_VALUE_LENGTH);
            console.warn(`[${this.constructor.name}] Value truncated to ${MAX_VALUE_LENGTH} characters for slot ${slot}`);
        }
        
        const previousValue = this.currentValues[slot];
        
        this.currentValues[slot] = value;
        
        if (this.characterId && this.outfitInstanceId) {
            this.saveOutfit();
        }

        if (previousValue === 'None' && value !== 'None') {
            return `${this.character} put on ${value}.`;
        } else if (value === 'None') {
            return `${this.character} removed ${previousValue}.`;
        } 
        return `${this.character} changed from ${previousValue} to ${value}.`;
    }

    async changeOutfitItem(slot) {
        if (!this.slots.includes(slot)) {
            console.error(`[${this.constructor.name}] Invalid slot: ${slot}`);
            return null;
        }
        
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, '');
            if (newValue === null) { return null; }
            if (newValue === '') { newValue = 'None'; }
        } else {
            const choice = prompt(
                `${this.character}'s ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
                ''
            );

            if (choice === null) { return null; }
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
    
    savePreset(presetName, instanceId = null) {
        throw new Error('savePreset must be implemented by subclasses');
    }
    
    async loadPreset(presetName, instanceId = null) {
        throw new Error('loadPreset must be implemented by subclasses');
    }
    
    deletePreset(presetName, instanceId = null) {
        throw new Error('deletePreset must be implemented by subclasses');
    }
    
    getPresets(instanceId = null) {
        throw new Error('getPresets must be implemented by subclasses');
    }
    
    async loadDefaultOutfit(instanceId = null) {
        throw new Error('loadDefaultOutfit must be implemented by subclasses');
    }
    
    overwritePreset(presetName, instanceId = null) {
        throw new Error('overwritePreset must be implemented by subclasses');
    }
}
