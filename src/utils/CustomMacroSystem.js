/**
 * Custom Macro System for ST-Outfits
 * Completely removes global variables and uses custom {{char_topwear}} style macros
 */

import { outfitStore } from '../common/Store.js';

class CustomMacroSystem {
    constructor() {
        // Define the macro pattern for {{char_slotname}} and {{user_slotname}}
        this.macroPattern = /\{\{(\w+)(?:_(\w+(?:-\w+)*))?\}\}/g;
        
        // Define valid slot names
        this.clothingSlots = [
            'headwear', 'topwear', 'topunderwear', 'bottomwear',
            'bottomunderwear', 'footwear', 'footunderwear'
        ];
        
        this.accessorySlots = [
            'head-accessory', 'ears-accessory', 'eyes-accessory', 'mouth-accessory',
            'neck-accessory', 'body-accessory', 'arms-accessory', 'hands-accessory',
            'waist-accessory', 'bottom-accessory', 'legs-accessory', 'foot-accessory'
        ];
        
        this.allSlots = [...this.clothingSlots, ...this.accessorySlots];
    }

    /**
     * Replace all custom macros in text with current outfit values
     * @param {string} text - The text containing macros to replace
     * @returns {string} - Text with macros replaced by current values
     */
    replaceMacrosInText(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        let processedText = text;

        try {
            // Find all macro matches
            const matches = [...processedText.matchAll(this.macroPattern)];
            
            // Process matches in reverse order to avoid index shifting issues
            for (let i = matches.length - 1; i >= 0; i--) {
                const match = matches[i];
                const fullMatch = match[0];
                const macroType = match[1]; // 'char', 'bot', 'user', or specific character name
                const slotName = match[2]; // The slot name like 'topwear'

                let replacementValue = 'None';

                // Handle different macro types
                if (slotName && this.allSlots.includes(slotName)) {
                    // This is a slot macro like {{char_topwear}} or {{user_topwear}}
                    if (macroType === 'char' || macroType === 'bot' || macroType === 'user') {
                        replacementValue = this.getCurrentSlotValue(macroType, slotName);
                    } else if (macroType) {
                        // This is a character-specific macro like {{Emma_topwear}}
                        // For now, treat character-specific macros similarly to 'char'
                        replacementValue = this.getCurrentSlotValue('char', slotName);
                    }
                } else if (macroType === 'user') {
                    // This is a simple {{user}} macro - get the current user name
                    replacementValue = this.getCurrentUserName();
                }

                // Replace the macro with the actual value
                processedText = processedText.replace(new RegExp(escapeRegExp(fullMatch), 'g'), replacementValue);
            }
        } catch (error) {
            console.error('Error replacing custom macros in text:', error);
        }

        return processedText;
    }

    /**
     * Get the current value for a specific slot
     * @param {string} macroType - 'char', 'bot', or 'user'
     * @param {string} slotName - The slot name (e.g., 'topwear')
     * @returns {string} - The current value for the slot
     */
    getCurrentSlotValue(macroType, slotName) {
        if (!this.allSlots.includes(slotName)) {
            return 'None';
        }

        try {
            const state = outfitStore.getState();
            const characterId = state.currentCharacterId;
            const instanceId = state.currentOutfitInstanceId;

            if (!instanceId) {
                return 'None';
            }

            if (macroType === 'char' || macroType === 'bot') {
                if (characterId) {
                    const outfitData = outfitStore.getBotOutfit(characterId, instanceId);

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
        const matches = [...text.matchAll(this.macroPattern)];

        for (const match of matches) {
            macros.push({
                fullMatch: match[0],
                type: match[1],
                slot: match[2],
                startIndex: match.index
            });
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
                outfitInfo += '\n**<BOT>\'s Current Outfit**\n';

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
                outfitInfo += '\n**<BOT>\'s Current Accessories**\n';

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

// Helper function to escape special regex characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Create a single instance of the custom macro system
const customMacroSystem = new CustomMacroSystem();

// Export the system instance and methods
export { customMacroSystem };