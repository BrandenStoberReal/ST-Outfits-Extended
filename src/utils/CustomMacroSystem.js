/**
 * Custom Macro System for ST-Outfits
 * Completely removes global variables and uses custom {{char_topwear}} style macros
 */

import { outfitStore } from '../common/Store.js';
import { CLOTHING_SLOTS, ACCESSORY_SLOTS } from '../config/constants.js';
import { replaceAll } from './StringProcessor.js';

class CustomMacroSystem {
    constructor() {
        this.clothingSlots = CLOTHING_SLOTS;
        this.accessorySlots = ACCESSORY_SLOTS;
        this.allSlots = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];
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

            // Register character-specific slot-based macros
            // Note: Static registration of all characters may not work well if characters are loaded dynamically
            // So we'll also create a generic handler for character-specific macros
            if (ctx.characters) {
                ctx.characters.forEach(character => {
                    this.allSlots.forEach(slot => {
                        ctx.registerMacro(`${character.name}_${slot}`, (macro, nonce) => this.getCurrentSlotValue('char', slot, character.name));
                    });
                });
            }
            
            // Register a generic handler for any character-specific slot macros
            // This will catch character names that may not have been registered during initialization
            this.allSlots.forEach(slot => {
                // This creates a dynamic macro handler for any character name + slot combination
                // The macro name will be checked dynamically when used
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
            ctx.characters.forEach(character => {
                this.allSlots.forEach(slot => {
                    const macroName = `${character.name}_${slot}`;

                    // Unregister first if it exists to avoid duplicates
                    // Note: SillyTavern doesn't have an unregister function, so we just register again
                    ctx.registerMacro(macroName, (macro, nonce) => this.getCurrentSlotValue('char', slot, character.name));
                });
            });
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
     * Get the current value for a specific slot
     * @param {string} macroType - 'char', 'bot', or 'user'
     * @param {string} slotName - The slot name (e.g., 'topwear')
     * @param {string|null} characterName - The specific character name to get the value for
     * @returns {string} - The current value for the slot
     */
    getCurrentSlotValue(macroType, slotName, characterName = null) {
        if (!this.allSlots.includes(slotName)) {
            return 'None';
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
                    } else {
                        return 'None'; // Character not found
                    }
                }
            } else if (macroType === 'char' || macroType === 'bot') {
                // Using current character context
                charId = context?.characterId || null;
            }

            // Get appropriate instanceId based on the conversation context
            const state = outfitStore.getState();
            let instanceId = null;
            
            // Try to determine the appropriate instance ID based on current conversation
            if (context && context.chatId) {
                // Use the chatId to create a unique instance ID for this conversation
                instanceId = context.chatId;
            } else {
                // Fallback to current outfit instance ID if available
                instanceId = state.currentOutfitInstanceId;
            }
            
            if (!instanceId) {
                return 'None';
            }

            if (macroType === 'char' || macroType === 'bot' || characterName) {
                if (charId !== null && charId !== undefined) {
                    const outfitData = outfitStore.getBotOutfit(charId.toString(), instanceId);

                    return outfitData[slotName] || 'None';
                }
            } else if (macroType === 'user') {
                const outfitData = outfitStore.getUserOutfit(instanceId);

                return outfitData[slotName] || 'None';
            }
        } catch (error) {
            console.error('Error getting slot value:', error);
        }

        return 'None';
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

            if (openIdx === -1) {break;}

            const closeIdx = text.indexOf('}}', openIdx);

            if (closeIdx === -1) {break;}

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

        if (!hasItems) {return '';}

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
            if (i > 0 && slot[i] >= 'A' && slot[i] <= 'Z' && slot[i-1] !== ' ') {
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
            } else {
                // This is a name-based macro like {{char}} or {{user}}
                if (macro.type === 'char' || macro.type === 'bot') {
                    replacement = this.getCurrentCharName();
                } else if (macro.type === 'user') {
                    replacement = this.getCurrentUserName();
                } else {
                    // This could be a character-specific macro name without a slot
                    // In this case, just return the character name
                    replacement = macro.type;
                }
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