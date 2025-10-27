import {ALL_SLOTS} from '../config/constants';
import {invalidateSpecificMacroCaches} from '../services/CustomMacroService';

export abstract class OutfitManager {
    slots: string[];
    currentValues: { [key: string]: string };
    outfitInstanceId: string | null;
    character: string;
    characterId: string | null;

    constructor(slots: string[] = ALL_SLOTS) {
        this.slots = slots;
        this.currentValues = {};
        this.outfitInstanceId = null;
        this.character = 'Unknown';
        this.characterId = null;

        this.slots.forEach(slot => {
            this.currentValues[slot] = 'None';
        });
    }

    setCharacter(name: string, characterId: string | null = null): void {
        if (name === this.character) {
            return;
        }

        if (!name || typeof name !== 'string') {
            console.warn(`[${this.constructor.name}] Invalid character name provided, using "Unknown"`);
            name = 'Unknown';
        }

        this.character = name;
        this.characterId = characterId;

        this.loadOutfit();
    }

    abstract applyDefaultOutfitAfterReset(instanceId?: string | null): Promise<boolean>;

    setOutfitInstanceId(instanceId: string): void {
        if (this.outfitInstanceId) {
            this.saveOutfit();
        }

        this.outfitInstanceId = instanceId;
        this.loadOutfit();
        // Load presets for this instance ID after setting it
        this.loadPresetsForInstanceId(instanceId);
    }

    getOutfitInstanceId(): string | null {
        return this.outfitInstanceId;
    }

    /**
     * Loads presets specifically for the given instance ID
     * @param instanceId The instance ID to load presets for
     */
    loadPresetsForInstanceId(instanceId: string): void {
        // This method can be overridden by subclasses if needed
        // For now, we just ensure the presets are available when the instance ID is set
    }

    getCurrentOutfit(): { [key: string]: string } {
        return {...this.currentValues};
    }

    setOutfit(outfitData: { [key: string]: string }): void {
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

    abstract getVarName(slot: string): string;

    loadOutfit(instanceId: string | null = null): void {
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

    abstract loadOutfitFromInstanceId(instanceId: string): { [key: string]: string };

    saveOutfit(instanceId: string | null = null): void {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            console.warn(`[${this.constructor.name}] Cannot save outfit - missing characterId or instanceId`);
            return;
        }

        const outfitData: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            outfitData[slot] = this.currentValues[slot] || 'None';
        });

        this.saveOutfitToInstanceId(outfitData, actualInstanceId);
    }

    abstract saveOutfitToInstanceId(outfitData: { [key: string]: string }, instanceId: string): void;

    async setOutfitItem(slot: string, value: string): Promise<string | null> {
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

            invalidateSpecificMacroCaches(
                this.constructor.name.includes('Bot') ? 'bot' : 'user',
                this.characterId,
                this.outfitInstanceId,
                slot
            );
        }

        if (previousValue === 'None' && value !== 'None') {
            return `${this.character} put on ${value}.`;
        } else if (value === 'None') {
            return `${this.character} removed ${previousValue}.`;
        }
        return `${this.character} changed from ${previousValue} to ${value}.`;
    }

    async changeOutfitItem(slot: string): Promise<string | null> {
        if (!this.slots.includes(slot)) {
            console.error(`[${this.constructor.name}] Invalid slot: ${slot}`);
            return null;
        }

        const currentValue = this.currentValues[slot];
        let newValue: string | null = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, '');
            if (newValue === null) {
                return null;
            }
            if (newValue === '') {
                newValue = 'None';
            }
        } else {
            const choice = prompt(
                `${this.character}'s ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
                ''
            );

            if (choice === null) {
                return null;
            }
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

    getOutfitData(slots: string[]): { name: string, value: string, varName: string }[] {
        return slots.map(slot => ({
            name: slot,
            value: this.currentValues[slot],
            varName: this.getVarName(slot)
        }));
    }

    abstract savePreset(presetName: string, instanceId?: string | null): string;

    abstract loadPreset(presetName: string, instanceId?: string | null): Promise<string>;

    abstract deletePreset(presetName: string, instanceId?: string | null): string;

    abstract getPresets(instanceId?: string | null): string[];

    abstract getAllPresets(instanceId?: string | null): { [key: string]: { [key: string]: string } };

    abstract loadDefaultOutfit(instanceId?: string | null): Promise<string>;

    abstract overwritePreset(presetName: string, instanceId?: string | null): string;

    abstract setPromptInjectionEnabled(enabled: boolean, instanceId?: string | null): void;

    abstract getPromptInjectionEnabled(instanceId?: string | null): boolean;

    abstract hasDefaultOutfit(instanceId?: string | null): boolean;

    abstract getDefaultPresetName(instanceId?: string | null): string | null;

    abstract setPresetAsDefault(presetName: string, instanceId?: string | null): Promise<string>;

    abstract applyDefaultOutfitAfterSetCharacter(): Promise<void>;
}