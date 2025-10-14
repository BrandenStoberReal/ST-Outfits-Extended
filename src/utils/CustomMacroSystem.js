/**
 * Custom Macro System for ST-Outfits
 * Completely removes global variables and uses custom {{char_topwear}} style macros
 */

import { outfitStore } from '../common/Store.js';
import { CLOTHING_SLOTS, ACCESSORY_SLOTS } from '../config/constants.js';

class CustomMacroSystem {
    constructor() {
        this.clothingSlots = CLOTHING_SLOTS;
        this.accessorySlots = ACCESSORY_SLOTS;
        this.allSlots = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];
    }

    /**
     * Replace all custom macros in text with current outfit values.
     * @param {string} text - The text containing macros to replace.
     * @returns {string} - Text with macros replaced by current values.
     */
    replaceMacrosInText(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        try {
            let result = text;
            let index = 0;

            while (index < result.length) {
                const openIdx = result.indexOf('{{', index);

                if (openIdx === -1) {
                    break; // No more potential macros
                }

                const closeIdx = result.indexOf('}}', openIdx);

                if (closeIdx === -1) {
                    break; // Malformed macro, no closing brackets
                }

                const macroContent = result.substring(openIdx + 2, closeIdx);
                const macroWithBrackets = '{{' + macroContent + '}}';

                // Split by underscore to identify potential prefix_slot pattern
                const parts = macroContent.split('_');
                let macroType, slotName;

                if (parts.length === 1) {
                    // Simple macro like {{topwear}} or {{user}} or {{char}}
                    const singlePart = parts[0];

                    if (this.allSlots.includes(singlePart)) {
                        // It's a slot-based macro with default 'char' type
                        macroType = 'char';
                        slotName = singlePart;
                    } else if (singlePart === 'user' || singlePart === 'char' || singlePart === 'bot') {
                        // Simple type macro
                        macroType = singlePart;
                        slotName = null;
                    } else {
                        // Not a valid macro, continue to next
                        index = closeIdx + 2;
                        continue;
                    }
                } else {
                    // prefix_slot format like {{char_topwear}} or {{Emma_topwear}}
                    const prefix = parts[0];
                    const potentialSlot = parts.slice(1).join('_'); // Handle slots with hyphens like 'head-accessory'

                    if (this.allSlots.includes(potentialSlot)) {
                        macroType = prefix;
                        slotName = potentialSlot;
                    } else {
                        // Check if it's just a character-specific slot (without type prefix)
                        // e.g., {{Amelia_topwear}}
                        const tempPrefix = parts.slice(0, parts.length - 1).join('_');
                        const tempSlot = parts[parts.length - 1];
                        
                        if (this.allSlots.includes(tempSlot)) {
                            macroType = tempPrefix;
                            slotName = tempSlot;
                        } else {
                            // Not a valid macro, continue to next
                            index = closeIdx + 2;
                            continue;
                        }
                    }
                }

                // Process the macro
                let replacementValue = macroWithBrackets; // Default to original if not valid

                if (slotName) {
                    if (macroType === 'char' || macroType === 'bot') {
                        replacementValue = this.getCurrentSlotValue('char', slotName);
                    } else if (macroType === 'user') {
                        replacementValue = this.getCurrentSlotValue('user', slotName);
                    } else {
                        // Handle character-specific macros like {{Amelia_topwear}}
                        replacementValue = this.getCurrentSlotValue('char', slotName, macroType);
                    }
                } else {
                    // Handle simple macros like {{user}} and {{char}}
                    if (macroType === 'user') {
                        replacementValue = this.getCurrentUserName();
                    } else if (macroType === 'char' || macroType === 'bot') {
                        replacementValue = this.getCurrentCharName();
                    }
                }

                // Replace the macro with its value
                result = result.substring(0, openIdx) + replacementValue + result.substring(closeIdx + 2);
                
                // Move index to the start of the replacement to handle overlapping replacements
                index = openIdx + replacementValue.length;
            }

            return result;
        } catch (error) {
            console.error('Error replacing custom macros in text:', error);
            return text;
        }
    }

    /**
     * Get the current character name for {{char}} macros.
     * @returns {string} - The current character name.
     */
    getCurrentCharName() {
        try {
            const context = window.getContext ? window.getContext() : null;
            
            if (context && context.chat) {
                const charMessages = context.chat.filter(message => !message.is_user && !message.is_system);

                if (charMessages.length > 0) {
                    const mostRecentCharMessage = charMessages[charMessages.length - 1];
                    
                    if (mostRecentCharMessage && mostRecentCharMessage.name) {
                        return mostRecentCharMessage.name;
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
     * @returns {string} - The current value for the slot
     */
    getCurrentSlotValue(macroType, slotName, characterName = null) {
        if (!this.allSlots.includes(slotName)) {
            return 'None';
        }

        try {
            const state = outfitStore.getState();
            let charId = state.currentCharacterId;

            if (characterName) {
                const context = window.getContext ? window.getContext() : null;

                if (context && context.characters) {
                    const character = context.characters.find(c => c.name === characterName);

                    if (character) {
                        charId = context.characters.indexOf(character);
                    } else {
                        return 'None'; // Character not found
                    }
                }
            }

            const instanceId = state.currentOutfitInstanceId;

            if (!instanceId) {
                return 'None';
            }

            if (macroType === 'char' || macroType === 'bot') {
                if (charId) {
                    const outfitData = outfitStore.getBotOutfit(charId, instanceId);

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
            const context = window.getContext ? window.getContext() : null;
            
            if (context && context.chat) {
                // Filter messages that are from the user to get their avatars
                const userMessages = context.chat.filter(message => message.is_user);

                if (userMessages.length > 0) {
                    // Get the most recent user message to determine current persona
                    const mostRecentUserMessage = userMessages[userMessages.length - 1];
                    
                    // Extract username from the message
                    if (mostRecentUserMessage && mostRecentUserMessage.mes) {
                        return mostRecentUserMessage.name || 'User';
                    }
                }
            }

            // Fallback to power_user if available
            if (typeof window.power_user !== 'undefined' && window.power_user && 
                typeof window.user_avatar !== 'undefined' && window.user_avatar) {
                const personaName = window.power_user.personas[window.user_avatar];

                return personaName || 'User';
            }

            // Final fallback
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
                break; // No more potential macros
            }

            const closeIdx = text.indexOf('}}', openIdx);

            if (closeIdx === -1) {
                break; // Malformed macro, no closing brackets
            }

            const macroContent = text.substring(openIdx + 2, closeIdx);
            const fullMatch = '{{' + macroContent + '}}';

            // Split by underscore to identify potential prefix_slot pattern
            const parts = macroContent.split('_');
            let macroType, slot;

            if (parts.length === 1) {
                // Simple macro like {{topwear}} or {{user}} or {{char}}
                const singlePart = parts[0];

                if (this.allSlots.includes(singlePart)) {
                    // It's a slot-based macro with default 'char' type
                    macroType = 'char';
                    slot = singlePart;
                } else if (singlePart === 'user' || singlePart === 'char' || singlePart === 'bot') {
                    // Simple type macro
                    macroType = singlePart;
                    slot = null;
                } else {
                    // Not a valid macro, continue to next
                    index = closeIdx + 2;
                    continue;
                }
            } else {
                // prefix_slot format like {{char_topwear}} or {{Emma_topwear}}
                const prefix = parts[0];
                const potentialSlot = parts.slice(1).join('_'); // Handle slots with hyphens like 'head-accessory'

                if (this.allSlots.includes(potentialSlot)) {
                    macroType = prefix;
                    slot = potentialSlot;
                } else {
                    // Check if it's just a character-specific slot (without type prefix)
                    // e.g., {{Amelia_topwear}}
                    const tempPrefix = parts.slice(0, parts.length - 1).join('_');
                    const tempSlot = parts[parts.length - 1];
                    
                    if (this.allSlots.includes(tempSlot)) {
                        macroType = tempPrefix;
                        slot = tempSlot;
                    } else {
                        // Not a valid macro, continue to next
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
            let outfitInfo = '';

            // Get current outfit data from managers
            const botOutfitData = botManager && botManager.getOutfitData ?
                botManager.getOutfitData(this.allSlots) : [];
            const userOutfitData = userManager && userManager.getOutfitData ?
                userManager.getOutfitData(this.allSlots) : [];

            // Check if bot has any non-empty clothing items
            const botHasClothing = botOutfitData.some(data =>
                this.clothingSlots.includes(data.name) && data.value !== 'None' && data.value !== ''
            );

            if (botHasClothing) {
                outfitInfo += '\n**{{char}}\'s Current Outfit**\n';

                // Add clothing info using custom macros
                this.clothingSlots.forEach(slot => {
                    const slotData = botOutfitData.find(data => data.name === slot);

                    if (slotData) {
                        const formattedSlotName = slot
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.charAt(0).toUpperCase())
                            .replace('underwear', 'Underwear');
                            
                        outfitInfo += `**${formattedSlotName}:** {{char_${slotData.name}}}\n`;
                    }
                });
            }

            // Check if bot has any non-empty accessories
            const botHasAccessories = botOutfitData.some(data =>
                this.accessorySlots.includes(data.name) && data.value !== 'None' && data.value !== ''
            );

            if (botHasAccessories) {
                outfitInfo += '\n**{{char}}\'s Current Accessories**\n';

                // Add accessory info using custom macros
                this.accessorySlots.forEach(slot => {
                    const slotData = botOutfitData.find(data => data.name === slot);

                    if (slotData && slotData.value !== 'None' && slotData.value !== '') {
                        let formattedSlotName = slot
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.charAt(0).toUpperCase())
                            .replace(/-/g, ' ')
                            .replace('accessory', 'Accessory');

                        outfitInfo += `**${formattedSlotName}:** {{char_${slotData.name}}}\n`;
                    }
                });
            }

            // Check if user has any non-empty clothing items
            const userHasClothing = userOutfitData.some(data =>
                this.clothingSlots.includes(data.name) && data.value !== 'None' && data.value !== ''
            );

            if (userHasClothing) {
                outfitInfo += '\n**{{user}}\'s Current Outfit**\n';

                // Add user clothing info using custom macros
                this.clothingSlots.forEach(slot => {
                    const slotData = userOutfitData.find(data => data.name === slot);

                    if (slotData) {
                        const formattedSlotName = slot
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.charAt(0).toUpperCase())
                            .replace('underwear', 'Underwear');
                            
                        outfitInfo += `**${formattedSlotName}:** {{user_${slotData.name}}}\n`;
                    }
                });
            }

            // Check if user has any non-empty accessories
            const userHasAccessories = userOutfitData.some(data =>
                this.accessorySlots.includes(data.name) && data.value !== 'None' && data.value !== ''
            );

            if (userHasAccessories) {
                outfitInfo += '\n**{{user}}\'s Current Accessories**\n';

                // Add user accessory info using custom macros
                this.accessorySlots.forEach(slot => {
                    const slotData = userOutfitData.find(data => data.name === slot);

                    if (slotData && slotData.value !== 'None' && slotData.value !== '') {
                        let formattedSlotName = slot
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.charAt(0).toUpperCase())
                            .replace(/-/g, ' ')
                            .replace('accessory', 'Accessory');

                        outfitInfo += `**${formattedSlotName}:** {{user_${slotData.name}}}\n`;
                    }
                });
            }

            return outfitInfo;
        } catch (error) {
            console.error('[CustomMacroSystem] Error generating outfit info string:', error);
            return '';
        }
    }
}


// Create a single instance of the custom macro system
const customMacroSystem = new CustomMacroSystem();

// Export the system instance and methods
export { customMacroSystem };