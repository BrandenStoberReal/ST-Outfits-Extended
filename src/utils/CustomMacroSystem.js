/**
 * Custom Macro System for ST-Outfits
 * Completely removes global variables and uses custom {{char_topwear}} style macros
 */

import {outfitStore} from '../common/Store.js';
import {ACCESSORY_SLOTS, CLOTHING_SLOTS} from '../config/constants.js';
import {macroProcessor} from './MacroProcessor.js';

class CustomMacroSystem {
    constructor() {
        this.clothingSlots = CLOTHING_SLOTS;
        this.accessorySlots = ACCESSORY_SLOTS;
        this.allSlots = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];
        // Add a cache for macro values to improve performance of repeated lookups
        this.macroValueCache = new Map();
        // Cache expiry time in milliseconds (5 minutes)
        this.cacheExpiryTime = 5 * 60 * 1000;
    }

    registerMacros(context) {
        // Use provided context or fallback to window
        const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());

        if (ctx && ctx.registerMacro) {
            // Register {{char}} and {{user}} macros
            ctx.registerMacro('char', (macro, nonce) => this.getCurrentCharName());
            ctx.registerMacro('user', (macro, nonce) => this.getCurrentUserName());

            // Register slot-based macros for char and user
            this.allSlots.forEach(slot => {
                ctx.registerMacro(`char_${slot}`, (macro, nonce) => this.getCurrentSlotValue('char', slot));
                ctx.registerMacro(`user_${slot}`, (macro, nonce) => this.getCurrentSlotValue('user', slot));
            });
        }
    }

    /**
     * Deregister all outfit-related macros to prepare for re-registration
     */
    deregisterMacros(context) {
        const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());

        if (ctx && ctx.unregisterMacro) {
            // Deregister {{char}} and {{user}} macros
            ctx.unregisterMacro('char');
            ctx.unregisterMacro('user');

            // Deregister slot-based macros for char and user
            this.allSlots.forEach(slot => {
                ctx.unregisterMacro(`char_${slot}`);
                ctx.unregisterMacro(`user_${slot}`);
            });
        }
    }

    /**
     * Dynamically register character-specific macros as characters become available
     * This should be called whenever character data changes
     */
    registerCharacterSpecificMacros(context) {
        // Use provided context or fallback to window
        const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());

        if (ctx && ctx.registerMacro && ctx.characters) {
            // Iterate through all available characters
            for (const character of ctx.characters) {
                if (character && character.name) {
                    const characterName = character.name;

                    // Register a macro for the character's name (e.g., {{Emma}})
                    ctx.registerMacro(characterName, (macro, nonce) => characterName);

                    // Register slot-based macros for this specific character (e.g., {{Emma_topwear}}, {{Emma_headwear}})
                    this.allSlots.forEach(slot => {
                        const macroName = `${characterName}_${slot}`;

                        ctx.registerMacro(macroName, (macro, nonce) => this.getCurrentSlotValue(characterName, slot, characterName));
                    });
                }
            }
        }
    }

    /**
     * Deregister character-specific macros to prepare for re-registration
     */
    deregisterCharacterSpecificMacros(context) {
        // Use provided context or fallback to window
        const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());

        if (ctx && ctx.unregisterMacro && ctx.characters) {
            // Iterate through all available characters
            for (const character of ctx.characters) {
                if (character && character.name) {
                    const characterName = character.name;

                    // Deregister the macro for the character's name (e.g., {{Emma}})
                    ctx.unregisterMacro(characterName);

                    // Deregister slot-based macros for this specific character
                    this.allSlots.forEach(slot => {
                        const macroName = `${characterName}_${slot}`;

                        ctx.unregisterMacro(macroName);
                    });
                }
            }
        }
    }

    /**
     * Get the current character name for {{char}} macros.
     * @returns {string} - The current character name.
     */
    getCurrentCharName() {
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

    /**
     * Get the current value for a specific slot with caching
     * @param {string} macroType - 'char', 'bot', 'user' or a character name
     * @param {string} slotName - The slot name (e.g., 'topwear')
     * @param {string|null} characterName - The specific character name to get the value for
     * @returns {string} - The current value for the slot
     */
    getCurrentSlotValue(macroType, slotName, characterName = null) {
        if (!this.allSlots.includes(slotName)) {
            return 'None';
        }

        // Generate a unique cache key based on the macro parameters
        const cacheKey = this._generateCacheKey(macroType, slotName, characterName);

        // Check if we have a cached value that hasn't expired
        const cachedValue = this.macroValueCache.get(cacheKey);

        if (cachedValue && Date.now() - cachedValue.timestamp < this.cacheExpiryTime) {
            return cachedValue.value;
        }

        try {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

            // Determine characterId based on macro type and character name
            let charId = null;

            if (characterName) {
                // Looking for a specific character by name
                if (context && context.characters) {
                    const character = context.characters.find(c => c.name === characterName);

                    if (character) {
                        charId = character.avatar;
                    } else if (context.characterId && context.getName) {
                        // If character not found in the list, try to match by the currently active character if macroType matches
                        const currentCharName = context.getName();

                        if (currentCharName === characterName) {
                            charId = context.characterId;
                        }
                    }

                    // If we still don't have a character ID, return None
                    if (!charId) {
                        // Cache the result to avoid repeated lookups
                        this._setCache(cacheKey, 'None');
                        return 'None'; // Character not found
                    }
                }
            } else if (macroType === 'char' || macroType === 'bot') {
                // Using current character context
                charId = context?.characterId || null;
            } else if (['user'].includes(macroType)) {
                // User-specific macro, don't need a character ID
                charId = null;
            } else if (context && context.characterId && context.getName) {
                // The macroType might be a character name (e.g. when macro is "Emma_topwear")
                // Try to match against current character
                const currentCharName = context.getName();

                if (currentCharName === macroType) {
                    charId = context.characterId;
                }
            }

            // Get the current instance ID from the store
            const state = outfitStore.getState();
            let instanceId = state.currentOutfitInstanceId;

            // If no instance ID is available yet, calculate it synchronously from the first message
            if (!instanceId) {
                const firstBotMessage = context?.chat?.find(message => !message.is_user && !message.is_system);

                if (firstBotMessage) {
                    // Use the global macro processor's function
                    const processedMessage = macroProcessor.cleanOutfitMacrosFromText(firstBotMessage.mes);

                    // Use the same simple hash algorithm as in utilities.js for consistency
                    let hash = 0;

                    for (let i = 0; i < processedMessage.length; i++) {
                        const char = processedMessage.charCodeAt(i);

                        hash = ((hash << 5) - hash) + char;
                        hash |= 0; // Convert to 32-bit integer
                    }

                    instanceId = Math.abs(hash).toString(36);

                    // Try to find stored outfit data with the calculated instance ID
                    if (charId && (macroType === 'char' || macroType === 'bot' || characterName || (this.isValidCharacterName(macroType) && !['user'].includes(macroType)))) {
                        const charOutfitData = outfitStore.getBotOutfit(charId.toString(), instanceId);

                        if (charOutfitData && charOutfitData[slotName]) {
                            // Cache the result before returning
                            this._setCache(cacheKey, charOutfitData[slotName]);
                            return charOutfitData[slotName];
                        }
                    } else if (macroType === 'user') {
                        const userOutfitData = outfitStore.getUserOutfit(instanceId);

                        if (userOutfitData && userOutfitData[slotName]) {
                            // Cache the result before returning
                            this._setCache(cacheKey, userOutfitData[slotName]);
                            return userOutfitData[slotName];
                        }
                    }

                    // If no data found for this calculated ID, return 'None'
                    // Cache the result to avoid repeated lookups
                    this._setCache(cacheKey, 'None');
                    return 'None';
                }

                // If no first message is available, return 'None'
                // Cache the result to avoid repeated lookups
                this._setCache(cacheKey, 'None');
                return 'None';
            }

            if (macroType === 'char' || macroType === 'bot' || characterName || (this.isValidCharacterName(macroType) && !['user'].includes(macroType))) {
                if (charId !== null && charId !== undefined) {
                    const outfitData = outfitStore.getBotOutfit(charId.toString(), instanceId);
                    const result = outfitData[slotName] || 'None';

                    // Cache the result before returning
                    this._setCache(cacheKey, result);
                    return result;
                }
            } else if (macroType === 'user') {
                const outfitData = outfitStore.getUserOutfit(instanceId);
                const result = outfitData[slotName] || 'None';

                // Cache the result before returning
                this._setCache(cacheKey, result);
                return result;
            }
        } catch (error) {
            console.error('Error getting slot value:', error);
        }

        // If we reach here, cache and return 'None'
        const result = 'None';

        this._setCache(cacheKey, result);
        return result;
    }

    /**
     * Generate a unique cache key for the macro parameters
     * @private
     * @param {string} macroType - The type of macro ('char', 'user', character name, etc.)
     * @param {string} slotName - The slot name
     * @param {string|null} characterName - The character name, if applicable
     * @returns {string} A unique cache key
     */
    _generateCacheKey(macroType, slotName, characterName) {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        const currentCharacterId = context?.characterId || 'unknown';
        const currentInstanceId = outfitStore.getCurrentInstanceId() || 'unknown';

        // Create a unique identifier based on all relevant parameters
        return `${macroType}_${slotName}_${characterName || 'null'}_${currentCharacterId}_${currentInstanceId}`;
    }

    /**
     * Set a value in the cache with a timestamp
     * @private
     * @param {string} cacheKey - The cache key to store the value under
     * @param {string} value - The value to cache
     */
    _setCache(cacheKey, value) {
        this.macroValueCache.set(cacheKey, {
            value: value,
            timestamp: Date.now()
        });
    }

    /**
     * Clear the macro value cache
     */
    clearCache() {
        this.macroValueCache.clear();
    }

    /**
     * Remove expired entries from the cache
     */
    _cleanupExpiredCache() {
        for (const [key, entry] of this.macroValueCache.entries()) {
            if (Date.now() - entry.timestamp >= this.cacheExpiryTime) {
                this.macroValueCache.delete(key);
            }
        }
    }

    /**
     * Check if a string looks like a valid character name (not a standard macro type)
     * @param {string} name - The name to check
     * @returns {boolean} - True if it looks like a character name
     */
    isValidCharacterName(name) {
        return !['char', 'bot', 'user'].includes(name);
    }

    /**
     * Get the current user name for {{user}} macros
     * @returns {string} - The current user name
     */
    getCurrentUserName() {
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

    /**
     * Extract all custom macros from text
     * @param {string} text - The text to extract macros from
     * @returns {Array} - Array of macro objects
     */
    extractCustomMacros(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const macros = [];
        let index = 0;

        while (index < text.length) {
            const openIdx = text.indexOf('{{', index);

            if (openIdx === -1) {
                break;
            }

            const closeIdx = text.indexOf('}}', openIdx);

            if (closeIdx === -1) {
                break;
            }

            const macroContent = text.substring(openIdx + 2, closeIdx);
            const fullMatch = `{{${macroContent}}}`;

            const parts = macroContent.split('_');
            let macroType, slot;

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
                // For slot-based macros (e.g., Emma_topwear, char_topwear, user_headwear)
                const potentialCharacterName = parts[0];
                const potentialSlot = parts.slice(1).join('_');

                // Check if the slot part matches any known slot (could be multi-part like 'head-accessory')
                if (this.allSlots.includes(potentialSlot)) {
                    macroType = potentialCharacterName;
                    slot = potentialSlot;
                } else {
                    // Check if it's a multi-part slot name that got split incorrectly
                    // Try different splits to find a valid slot
                    for (let i = 1; i < parts.length; i++) {
                        const prefix = parts.slice(0, i).join('_');
                        const suffix = parts.slice(i).join('_');

                        if (this.allSlots.includes(suffix)) {
                            macroType = prefix;
                            slot = suffix;
                            break;
                        }
                    }

                    // If we still don't have a valid slot, skip this macro
                    if (!this.allSlots.includes(slot)) {
                        index = closeIdx + 2;
                        continue;
                    }
                }
            }

            macros.push({
                fullMatch: fullMatch,
                type: macroType,
                slot: slot,
                startIndex: openIdx
            });

            index = closeIdx + 2;
        }

        return macros;
    }

    /**
     * Generate outfit info string using custom macros
     * @param {*} botManager - The bot outfit manager
     * @param {*} userManager - The user outfit manager
     * @returns {string} - Formatted outfit info string with custom macros
     */
    generateOutfitInfoString(botManager, userManager) {
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

    _formatOutfitSection(entity, sectionTitle, slots, outfitData, macroPrefix) {
        const hasItems = outfitData.some(data => slots.includes(data.name) && data.value !== 'None' && data.value !== '');

        if (!hasItems) {
            return '';
        }

        let section = `\n**${entity}'s Current ${sectionTitle}**\n`;

        slots.forEach(slot => {
            const slotData = outfitData.find(data => data.name === slot);

            if (slotData && slotData.value !== 'None' && slotData.value !== '') {
                const formattedSlotName = this._formatSlotName(slot);

                section += `**${formattedSlotName}:** {{${macroPrefix}_${slotData.name}}}\n`;
            }
        });
        return section;
    }

    _formatSlotName(slot) {
        // Insert a space before uppercase letters
        let result = '';

        for (let i = 0; i < slot.length; i++) {
            if (i > 0 && slot[i] >= 'A' && slot[i] <= 'Z' && slot[i - 1] !== ' ') {
                result += ' ' + slot[i];
            } else {
                result += slot[i];
            }
        }

        // Capitalize the first letter
        if (result.length > 0) {
            result = result.charAt(0).toUpperCase() + result.slice(1);
        }

        // Replace hyphens with spaces
        result = result.split('-').join(' ');

        return result;
    }

    /**
     * Replace all custom macros in text with their actual values
     * @param {string} text - The text to process
     * @returns {string} - The processed text with macros replaced
     */
    replaceMacrosInText(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        // Extract all custom macros from the text
        const macros = this.extractCustomMacros(text);

        // Process macros in reverse order to avoid index shifting issues
        let result = text;

        for (let i = macros.length - 1; i >= 0; i--) {
            const macro = macros[i];
            let replacement;

            if (macro.slot) {
                // This is a slot-based macro like {{char_topwear}}, {{user_headwear}}, or {{Emma_topwear}}
                replacement = this.getCurrentSlotValue(macro.type, macro.slot,
                    ['char', 'bot', 'user'].includes(macro.type) ? null : macro.type); // Pass character name if not a standard type
            } else if (macro.type === 'char' || macro.type === 'bot') {
                // This is a name-based macro like {{char}} or {{user}}
                replacement = this.getCurrentCharName();
            } else if (macro.type === 'user') {
                replacement = this.getCurrentUserName();
            } else {
                // This could be a character-specific macro name without a slot
                // In this case, just return the character name
                replacement = macro.type;
            }

            // Replace the macro in the text
            result = result.substring(0, macro.startIndex) +
                replacement +
                result.substring(macro.startIndex + macro.fullMatch.length);
        }

        return result;
    }
}

// Create and export a single instance of the CustomMacroSystem
export const customMacroSystem = new CustomMacroSystem();

// Also export a function to update macro cache when outfit data changes
export const updateMacroCacheOnOutfitChange = (outfitType, characterId, instanceId, slotName) => {
    // Clear the macro cache for the specific outfit that changed
    customMacroSystem.clearCache();
};

// Function to intelligently invalidate only the specific macro caches that would be affected by an outfit change
export const invalidateSpecificMacroCaches = (outfitType, characterId, instanceId, slotName) => {
    // Iterate through the cache and remove entries that would be affected by this outfit change
    for (const [key, entry] of customMacroSystem.macroValueCache.entries()) {
        // If the cache key contains the characterId, instanceId and slotName that changed, remove it
        if (key.includes(characterId) && key.includes(instanceId) && key.includes(slotName)) {
            customMacroSystem.macroValueCache.delete(key);
        }
    }
};