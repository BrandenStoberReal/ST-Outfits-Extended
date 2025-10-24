import { outfitStore } from '../common/Store.js';
import { ALL_SLOTS } from '../config/constants.js';

/**
 * OutfitManager - Abstract base class for managing character outfit data
 * This class provides a foundation for managing outfit information for both
 * bot and user characters, with methods for setting, loading, and saving outfits
 */
export class OutfitManager {
    /**
     * Creates a new OutfitManager instance
     * @param {Array<string>} [slots=ALL_SLOTS] - Array of slot names to manage
     */
    constructor(slots = ALL_SLOTS) {
        this.slots = slots;
        this.currentValues = {};
        this.outfitInstanceId = null;
        this.character = 'Unknown';

        this.slots.forEach(slot => { 
            this.currentValues[slot] = 'None'; 
        });
    }

    /**
     * Sets the character name and ID for the outfit manager
     * @param {string} name - The character name
     * @param {string|null} [characterId=null] - The character ID
     * @returns {void}
     */
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

    /**
     * Sets the outfit instance ID and loads outfit data for that instance
     * @param {string} instanceId - The outfit instance ID to set
     * @returns {void}
     */
    setOutfitInstanceId(instanceId) {
        if (this.outfitInstanceId) {
            this.saveOutfit();
        }
        
        this.outfitInstanceId = instanceId;
        this.loadOutfit();
    }
    
    /**
     * Gets the current outfit instance ID
     * @returns {string|null} The current outfit instance ID
     */
    getOutfitInstanceId() {
        return this.outfitInstanceId;
    }
    
    /**
     * Gets a copy of the current outfit values
     * @returns {object} A copy of the current outfit values
     */
    getCurrentOutfit() {
        return { ...this.currentValues };
    }
    
    /**
     * Sets outfit data for the manager
     * @param {object} outfitData - Object containing slot-value pairs to set
     * @returns {void}
     */
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

    /**
     * Gets the variable name for a slot (must be implemented by subclasses)
     * @param {string} slot - The slot name
     * @returns {string} The variable name for the slot
     * @throws {Error} If not implemented by a subclass
     */
    getVarName(slot) {
        throw new Error('getVarName must be implemented by subclasses');
    }

    /**
     * Loads outfit data for the specified instance ID
     * @param {string|null} [instanceId=null] - The instance ID to load from (defaults to current instance ID)
     * @returns {void}
     */
    loadOutfit(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            console.warn(`[${this.constructor.name}] Cannot load outfit - missing characterId or instanceId`);
            this.slots.forEach(slot => {
                this.currentValues[slot] = 'None';
            });
            return;
        }

        const outfitData = this.loadOutfitFromInstanceId(actualInstanceId);

        this.setOutfit(outfitData);
    }

    /**
     * Loads outfit data from a specific instance ID (must be implemented by subclasses)
     * @param {string} instanceId - The instance ID to load from
     * @returns {object} The outfit data for the specified instance
     * @throws {Error} If not implemented by a subclass
     */
    loadOutfitFromInstanceId(instanceId) {
        throw new Error('loadOutfitFromInstanceId must be implemented by subclasses');
    }
    
    /**
     * Saves the current outfit data to the specified instance ID
     * @param {string|null} [instanceId=null] - The instance ID to save to (defaults to current instance ID)
     * @returns {void}
     */
    saveOutfit(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            console.warn(`[${this.constructor.name}] Cannot save outfit - missing characterId or instanceId`);
            return;
        }

        const outfitData = {};

        this.slots.forEach(slot => {
            outfitData[slot] = this.currentValues[slot] || 'None';
        });

        this.saveOutfitToInstanceId(outfitData, actualInstanceId);
    }

    /**
     * Saves outfit data to a specific instance ID (must be implemented by subclasses)
     * @param {object} outfitData - The outfit data to save
     * @param {string} instanceId - The instance ID to save to
     * @returns {void}
     * @throws {Error} If not implemented by a subclass
     */
    saveOutfitToInstanceId(outfitData, instanceId) {
        throw new Error('saveOutfitToInstanceId must be implemented by subclasses');
    }

    /**
     * Sets the value for a specific outfit slot
     * @param {string} slot - The slot name to modify
     * @param {string} value - The value to set for the slot
     * @returns {Promise<string|null>} A message describing the change, or null if no change occurred
     */
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
    
    getAllPresets(instanceId = null) {
        throw new Error('getAllPresets must be implemented by subclasses');
    }
    
    async loadDefaultOutfit(instanceId = null) {
        throw new Error('loadDefaultOutfit must be implemented by subclasses');
    }
    
    overwritePreset(presetName, instanceId = null) {
        throw new Error('overwritePreset must be implemented by subclasses');
    }
}
