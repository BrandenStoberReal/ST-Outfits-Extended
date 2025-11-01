import {outfitStore} from '../common/Store';
import {ACCESSORY_SLOTS, CLOTHING_SLOTS} from '../config/constants';
import {macroProcessor} from '../processors/MacroProcessor';
import {getCharacters} from '../utils/CharacterUtils';
import {generateInstanceIdFromText} from '../utils/utilities';

declare const window: any;

interface MacroCacheEntry {
    value: string;
    timestamp: number;
}

interface CustomMacro {
    fullMatch: string;
    type: string;
    slot: string | null;
    startIndex: number;
}

class CustomMacroService {
    public macroValueCache: Map<string, MacroCacheEntry>;
    private clothingSlots: string[];
    private accessorySlots: string[];
    private allSlots: string[];
    private cacheExpiryTime: number;

    constructor() {
        this.clothingSlots = CLOTHING_SLOTS;
        this.accessorySlots = ACCESSORY_SLOTS;
        this.allSlots = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];
        this.macroValueCache = new Map<string, MacroCacheEntry>();
        this.cacheExpiryTime = 5 * 60 * 1000;
    }

    registerMacros(context: any): void {
        const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());

        if (ctx && ctx.registerMacro) {
            ctx.registerMacro('char', () => this.getCurrentCharName());
            ctx.registerMacro('user', () => this.getCurrentUserName());

            this.allSlots.forEach(slot => {
                ctx.registerMacro(`char_${slot}`, async () => await this.getCurrentSlotValue('char', slot));
                ctx.registerMacro(`user_${slot}`, async () => await this.getCurrentSlotValue('user', slot));
            });
        }
    }

    deregisterMacros(context: any): void {
        const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());

        if (ctx && ctx.unregisterMacro) {
            ctx.unregisterMacro('char');
            ctx.unregisterMacro('user');

            this.allSlots.forEach(slot => {
                ctx.unregisterMacro(`char_${slot}`);
                ctx.unregisterMacro(`user_${slot}`);
            });
        }
    }

    registerCharacterSpecificMacros(context: any): void {
        const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());
        const characters = getCharacters();

        if (ctx && ctx.registerMacro && characters) {
            for (const character of characters) {
                if (character && character.name) {
                    const characterName = character.name;

                    ctx.registerMacro(characterName, () => characterName);

                    this.allSlots.forEach(slot => {
                        const macroName = `${characterName}_${slot}`;
                        ctx.registerMacro(macroName, async () => await this.getCurrentSlotValue(characterName, slot, characterName));
                    });
                }
            }
        }
    }

    deregisterCharacterSpecificMacros(context: any): void {
        const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());
        const characters = getCharacters();

        if (ctx && ctx.unregisterMacro && characters) {
            for (const character of characters) {
                if (character && character.name) {
                    const characterName = character.name;

                    ctx.unregisterMacro(characterName);

                    this.allSlots.forEach(slot => {
                        const macroName = `${characterName}_${slot}`;
                        ctx.unregisterMacro(macroName);
                    });
                }
            }
        }
    }

    getCurrentCharName(): string {
        try {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

            if (context && context.chat) {
                for (let i = context.chat.length - 1; i >= 0; i--) {
                    const message = context.chat[i];
                    if (!message.is_user && !message.is_system && message.name) {
                        return message.name;
                    }
                }
            }

            return typeof window.name2 !== 'undefined' ? window.name2 : 'Character';
        } catch (error) {
            console.error('Error getting character name:', error);
            return 'Character';
        }
    }

    async getCurrentSlotValue(macroType: string, slotName: string, charNameParam: string | null = null): Promise<string> {
        if (!this.allSlots.includes(slotName)) {
            return 'None';
        }

        const cacheKey = this._generateCacheKey(macroType, slotName, charNameParam);
        const cachedValue = this.macroValueCache.get(cacheKey);

        if (cachedValue && Date.now() - cachedValue.timestamp < this.cacheExpiryTime) {
            return cachedValue.value;
        }

        try {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            const characters = getCharacters();
            let charId: any = null;

            if (charNameParam) {
                if (context && characters) {
                    const character = characters.find((c: any) => c.name === charNameParam);
                    if (character) {
                        charId = characters.indexOf(character);
                    } else if (context.characterId && context.getName) {
                        const currentCharName = context.getName();
                        if (currentCharName === charNameParam) {
                            charId = context.characterId;
                        }
                    }
                    if (charId === null) {
                        this._setCache(cacheKey, 'None');
                        return 'None';
                    }
                }
            } else if (macroType === 'char' || macroType === 'bot') {
                charId = context?.characterId || null;
            } else if (['user'].includes(macroType)) {
                charId = null;
            } else if (context && context.characterId && context.getName) {
                const currentCharName = context.getName();
                if (currentCharName === macroType) {
                    charId = context.characterId;
                }
            }

            const state = outfitStore.getState();
            let instanceId = state.currentOutfitInstanceId;
            if (!instanceId) {
                const firstBotMessage = context?.chat?.find((message: any) => !message.is_user && !message.is_system);
                if (firstBotMessage) {
                    const processedMessage = macroProcessor.cleanOutfitMacrosFromText(firstBotMessage.mes);
                    // Use the same function that is used in MacroProcessor to ensure consistency
                    instanceId = await generateInstanceIdFromText(processedMessage);
                    
                    if (charId !== null && (macroType === 'char' || macroType === 'bot' || charNameParam || (this.isValidCharacterName(macroType) && !['user'].includes(macroType)))) {
                        const charOutfitData = outfitStore.getBotOutfit(charId.toString(), instanceId);
                        if (charOutfitData && charOutfitData[slotName]) {
                            this._setCache(cacheKey, charOutfitData[slotName]);
                            return charOutfitData[slotName];
                        }
                    } else if (macroType === 'user') {
                        const userOutfitData = outfitStore.getUserOutfit(instanceId);
                        if (userOutfitData && userOutfitData[slotName]) {
                            this._setCache(cacheKey, userOutfitData[slotName]);
                            return userOutfitData[slotName];
                        }
                    }
                    this._setCache(cacheKey, 'None');
                    return 'None';
                }
                this._setCache(cacheKey, 'None');
                return 'None';
            }

            if (charId !== null && (macroType === 'char' || macroType === 'bot' || charNameParam || (this.isValidCharacterName(macroType) && !['user'].includes(macroType)))) {
                const botOutfitManager = window.outfitTracker.botOutfitPanel.outfitManager;
                if (!botOutfitManager.getPromptInjectionEnabled()) {
                    return 'None';
                }
                const outfitData = outfitStore.getBotOutfit(charId.toString(), instanceId);
                const result = outfitData[slotName] || 'None';
                this._setCache(cacheKey, result);
                return result;
            } else if (macroType === 'user') {
                const userOutfitManager = window.outfitTracker.userOutfitPanel.outfitManager;
                if (!userOutfitManager.getPromptInjectionEnabled()) {
                    return 'None';
                }
                const currentInstanceId = typeof outfitStore.getCurrentInstanceId === 'function' ? outfitStore.getCurrentInstanceId() : null;
                const userOutfitData = outfitStore.getUserOutfit(currentInstanceId || 'default');
                const result = userOutfitData[slotName] || 'None';
                this._setCache(cacheKey, result);
                return result;
            }
        } catch (error) {
            console.error('Error getting slot value:', error);
        }

        const result = 'None';
        this._setCache(cacheKey, result);
        return result;
    }

    clearCache(): void {
        this.macroValueCache.clear();
    }

    isValidCharacterName(name: string): boolean {
        return !['char', 'bot', 'user'].includes(name);
    }

    getCurrentUserName(): string {
        try {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

            if (context && context.chat) {
                for (let i = context.chat.length - 1; i >= 0; i--) {
                    const message = context.chat[i];
                    if (message.is_user && message.name) {
                        return message.name;
                    }
                }
            }

            if (typeof window.power_user !== 'undefined' && window.power_user &&
                typeof window.user_avatar !== 'undefined' && window.user_avatar) {
                const personaName = window.power_user.personas[window.user_avatar];
                return personaName || 'User';
            }

            return typeof window.name1 !== 'undefined' ? window.name1 : 'User';
        } catch (error) {
            console.error('Error getting user name:', error);
            return 'User';
        }
    }

    extractCustomMacros(text: string): CustomMacro[] {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const macros: CustomMacro[] = [];
        let index = 0;

        while (index < text.length) {
            const openIdx = text.indexOf('{{', index);
            if (openIdx === -1) break;

            const closeIdx = text.indexOf('}}', openIdx);
            if (closeIdx === -1) break;

            const macroContent = text.substring(openIdx + 2, closeIdx);
            const fullMatch = `{{${macroContent}}}`;

            const parts = macroContent.split('_');
            let macroType: string = '';
            let slot: string | null = null;

            if (parts.length === 1) {
                const singlePart = parts[0];
                if (this.allSlots.includes(singlePart)) {
                    macroType = 'char';
                    slot = singlePart;
                } else if (['user', 'char', 'bot'].includes(singlePart)) {
                    macroType = singlePart;
                    slot = null;
                } else {
                    index = closeIdx + 2;
                    continue;
                }
            } else {
                const potentialCharacterName = parts[0];
                let potentialSlot = parts.slice(1).join('_');

                if (this.allSlots.includes(potentialSlot)) {
                    macroType = potentialCharacterName;
                    slot = potentialSlot;
                } else {
                    slot = null; // Ensure slot is initialized
                    for (let i = 1; i < parts.length; i++) {
                        const prefix = parts.slice(0, i).join('_');
                        const suffix = parts.slice(i).join('_');
                        if (this.allSlots.includes(suffix)) {
                            macroType = prefix;
                            slot = suffix;
                            break;
                        }
                    }

                    if (slot === null || !this.allSlots.includes(slot)) {
                        index = closeIdx + 2;
                        continue;
                    }
                }
            }

            if (slot !== null) {
                macros.push({
                    fullMatch: fullMatch,
                    type: macroType,
                    slot: slot,
                    startIndex: openIdx
                });
            }

            index = closeIdx + 2;
        }

        return macros;
    }

    generateOutfitInfoString(botManager: any, userManager: any): string {
        try {
            const botOutfitData = botManager?.getOutfitData(this.allSlots) || [];
            const userOutfitData = userManager?.getOutfitData(this.allSlots) || [];

            let outfitInfo = '';

            outfitInfo += this._formatOutfitSection('{{char}}', 'Outfit', this.clothingSlots, botOutfitData, 'char');
            outfitInfo += this._formatOutfitSection('{{char}}', 'Accessories', this.accessorySlots, botOutfitData, 'char');
            outfitInfo += this._formatOutfitSection('{{user}}', 'Outfit', this.clothingSlots, userOutfitData, 'user');
            outfitInfo += this._formatOutfitSection('{{user}}', 'Accessories', this.accessorySlots, userOutfitData, 'user');

            return outfitInfo;
        } catch (error) {
            console.error('[CustomMacroSystem] Error generating outfit info string:', error);
            return '';
        }
    }

    async replaceMacrosInText(text: string): Promise<string> {
        if (!text || typeof text !== 'string') {
            return text;
        }

        const macros = this.extractCustomMacros(text);
        let result = text;

        for (let i = macros.length - 1; i >= 0; i--) {
            const macro = macros[i];
            let replacement: string;

            if (macro.slot) {
                replacement = await this.getCurrentSlotValue(macro.type, macro.slot,
                    ['char', 'bot', 'user'].includes(macro.type) ? null : macro.type);
            } else if (macro.type === 'char' || macro.type === 'bot') {
                replacement = this.getCurrentCharName();
            } else if (macro.type === 'user') {
                replacement = this.getCurrentUserName();
            } else {
                replacement = macro.type;
            }

            result = result.substring(0, macro.startIndex) +
                replacement +
                result.substring(macro.startIndex + macro.fullMatch.length);
        }

        return result;
    }

    private _generateCacheKey(macroType: string, slotName: string, characterName: string | null): string {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        const currentCharacterId = context?.characterId || 'unknown';
        const currentInstanceId = outfitStore.getCurrentInstanceId() || 'unknown';
        return `${macroType}_${slotName}_${characterName || 'null'}_${currentCharacterId}_${currentInstanceId}`;
    }

    private _setCache(cacheKey: string, value: string): void {
        this.macroValueCache.set(cacheKey, {
            value: value,
            timestamp: Date.now()
        });
    }

    private _cleanupExpiredCache(): void {
        for (const [key, entry] of this.macroValueCache.entries()) {
            if (Date.now() - entry.timestamp >= this.cacheExpiryTime) {
                this.macroValueCache.delete(key);
            }
        }
    }

    private _formatOutfitSection(entity: string, sectionTitle: string, slots: string[], outfitData: any[], macroPrefix: string): string {
        const hasItems = outfitData.some(data => slots.includes(data.name) && data.value !== 'None' && data.value !== '');

        if (!hasItems) {
            return '';
        }

        let section = `
**${entity}'s Current ${sectionTitle}**
`;

        slots.forEach(slot => {
            const slotData = outfitData.find((data: any) => data.name === slot);

            if (slotData && slotData.value !== 'None' && slotData.value !== '') {
                const formattedSlotName = this._formatSlotName(slot);
                section += `**${formattedSlotName}:** {{${macroPrefix}_${slotData.name}}}
`;
            }
        });
        return section;
    }

    private _formatSlotName(slot: string): string {
        let result = '';

        for (let i = 0; i < slot.length; i++) {
            if (i > 0 && slot[i] >= 'A' && slot[i] <= 'Z' && slot[i - 1] !== ' ') {
                result += ' ' + slot[i];
            } else {
                result += slot[i];
            }
        }

        result = result.charAt(0).toUpperCase() + result.slice(1);
        result = result.split('-').join(' ');

        return result;
    }
}

export const customMacroSystem = new CustomMacroService();

export const updateMacroCacheOnOutfitChange = (outfitType: string, characterId: string, instanceId: string, slotName: string): void => {
    customMacroSystem.clearCache();
};

export const invalidateSpecificMacroCaches = (outfitType: string, characterId: string, instanceId: string, slotName: string): void => {
    for (const [key, entry] of customMacroSystem.macroValueCache.entries()) {
        if (key.includes(characterId) && key.includes(instanceId) && key.includes(slotName)) {
            customMacroSystem.macroValueCache.delete(key);
        }
    }
};
