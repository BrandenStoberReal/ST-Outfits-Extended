var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ALL_SLOTS } from '../config/constants.js';
import { invalidateSpecificMacroCaches } from '../services/CustomMacroService.js';
import { debugLog } from '../logging/DebugLogger.js';
export class OutfitManager {
    constructor(slots = ALL_SLOTS) {
        this.slots = slots;
        this.currentValues = {};
        this.outfitInstanceId = null;
        this.character = 'Unknown';
        this.characterId = null;
        this.slots.forEach(slot => {
            this.currentValues[slot] = 'None';
        });
    }
    setCharacter(name, characterId = null) {
        if (name === this.character) {
            return;
        }
        if (!name || typeof name !== 'string') {
            debugLog(`Invalid character name provided, using "Unknown"`, null, 'warn');
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
        // Load presets for this instance ID after setting it
        this.loadPresetsForInstanceId(instanceId);
    }
    getOutfitInstanceId() {
        return this.outfitInstanceId;
    }
    /**
     * Loads presets specifically for the given instance ID
     * @param instanceId The instance ID to load presets for
     */
    loadPresetsForInstanceId(instanceId) {
        // This method can be overridden by subclasses if needed
        // For now, we just ensure the presets are available when the instance ID is set
    }
    getCurrentOutfit() {
        return Object.assign({}, this.currentValues);
    }
    setOutfit(outfitData) {
        if (!outfitData || typeof outfitData !== 'object') {
            debugLog(`Invalid outfit data provided to setOutfit`, null, 'warn');
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
    loadOutfit(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId;
        if (!this.characterId || !actualInstanceId) {
            debugLog(`Cannot load outfit - missing characterId or instanceId`, null, 'warn');
            this.slots.forEach(slot => {
                this.currentValues[slot] = 'None';
            });
            return;
        }
        const outfitData = this.loadOutfitFromInstanceId(actualInstanceId);
        this.setOutfit(outfitData);
    }
    saveOutfit(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId;
        if (!this.characterId || !actualInstanceId) {
            debugLog(`Cannot save outfit - missing characterId or instanceId`, null, 'warn');
            return;
        }
        const outfitData = {};
        this.slots.forEach(slot => {
            outfitData[slot] = this.currentValues[slot] || 'None';
        });
        this.saveOutfitToInstanceId(outfitData, actualInstanceId);
    }
    setOutfitItem(slot, value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.slots.includes(slot)) {
                debugLog(`Invalid slot: ${slot}`, null, 'error');
                return { message: null, newValue: value };
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
                debugLog(`Value truncated to ${MAX_VALUE_LENGTH} characters for slot ${slot}`, null, 'warn');
            }
            const previousValue = this.currentValues[slot];
            this.currentValues[slot] = value;
            if (this.characterId && this.outfitInstanceId) {
                this.saveOutfit();
                invalidateSpecificMacroCaches(this.constructor.name.includes('Bot') ? 'bot' : 'user', this.characterId, this.outfitInstanceId, slot);
            }
            let message = null;
            if (previousValue === 'None' && value !== 'None') {
                message = `${this.character} put on ${value}.`;
            }
            else if (value === 'None') {
                message = `${this.character} removed ${previousValue}.`;
            }
            else if (value !== previousValue) {
                message = `${this.character} changed from ${previousValue} to ${value}.`;
            }
            return { message, newValue: value };
        });
    }
    changeOutfitItem(slot) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.slots.includes(slot)) {
                debugLog(`Invalid slot: ${slot}`, null, 'error');
                return null;
            }
            const currentValue = this.currentValues[slot];
            let newValue = currentValue;
            if (currentValue === 'None') {
                newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, '');
                if (newValue === null) {
                    return null;
                }
                if (newValue === '') {
                    newValue = 'None';
                }
            }
            else {
                const choice = prompt(`${this.character}'s ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`, '');
                if (choice === null) {
                    return null;
                }
                if (choice === '') {
                    newValue = 'None';
                }
                else {
                    newValue = choice.toLowerCase() === 'remove' ? 'None' : choice;
                }
            }
            if (newValue !== currentValue) {
                return this.setOutfitItem(slot, newValue);
            }
            return null;
        });
    }
    getOutfitData(slots) {
        return slots.map(slot => ({
            name: slot,
            value: this.currentValues[slot],
            varName: this.getVarName(slot)
        }));
    }
}
