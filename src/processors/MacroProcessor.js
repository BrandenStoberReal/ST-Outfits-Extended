/**

 * Global Macro Processor for ST-Outfits

 * Unified functions for processing macros in first messages

 */


import * as SillyTavernUtility from '../utils/SillyTavernUtility.js';
import {generateInstanceIdFromText} from '../utils/SillyTavernUtility.js';

import {outfitStore} from '../common/Store.js';

import {ALL_SLOTS} from '../config/constants.js';


class MacroProcessor {

    constructor() {

        this.allSlots = ALL_SLOTS;

        // Add a cache for outfit values to improve performance of repeated lookups

        this.outfitValuesCache = new Map();

        // Add a cache for cleaned text to avoid re-processing the same text

        this.textProcessingCache = new Map();

        // Cache expiry time in milliseconds (5 minutes)

        this.cacheExpiryTime = 5 * 60 * 1000;

    }


    /**

     * Clear the internal caches

     */

    clearCache() {

        this.outfitValuesCache.clear();

        this.textProcessingCache.clear();

    }


    /**

     * Processes the first message in a conversation to generate a unique instance ID.

     * This function cleans macros from the first bot message and generates an instance ID

     * based on the cleaned message content, which allows the system to track outfits

     * per conversation instance.

     * @param {object} context - Optional SillyTavern context. If not provided, will try to get from global context.

     * @returns {Promise<void>} A promise that resolves when the processing is complete

     */

    async processMacrosInFirstMessage(context) {

        try {

            // Use provided context or fallback to global context

            const ctx = context || SillyTavernUtility.getContext();


            if (!ctx || !ctx.chat) {

                return;

            }


            const firstBotMessage = SillyTavernUtility.findMessagesByCharacter(SillyTavernUtility.getCharacterName())[0];


            if (firstBotMessage) {

                // Use the existing cleanOutfitMacrosFromText function to remove macro patterns

                const processedMessage = this.cleanOutfitMacrosFromText(firstBotMessage.mes);


                // Collect all possible outfit values for this character to remove from the message before hashing

                // This includes values from all known outfit instances and presets for this character

                const outfitValues = this.getAllOutfitValuesForCharacter(ctx.characterId);


                // Generate instance ID with outfit values removed from the processed message

                // This ensures consistent instance IDs even when outfit values change

                const instanceId = await generateInstanceIdFromText(processedMessage, outfitValues);


                outfitStore.setCurrentInstanceId(instanceId);


                // Update the managers with the new instance ID so they can load the correct outfit data

                if (window.botOutfitPanel?.outfitManager) {

                    window.botOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);

                }

                if (window.userOutfitPanel?.outfitManager) {

                    // For user manager, we might want to use a specific instance ID

                    window.userOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);

                }

            }

        } catch (error) {

            console.error('[OutfitTracker] Error processing macros in first message:', error);

        }

    }


    /**

     * Gets all outfit values for a character across all instances and presets.

     * This function collects all outfit values for a specific character to help

     * ensure consistent instance ID generation regardless of outfit changes.

     * @param {string|number} characterId - The ID of the character to get outfit values for

     * @returns {Array<string>} An array of all unique outfit values for the character

     */

    getAllOutfitValuesForCharacter(characterId) {

        if (!characterId) {

            return [];

        }


        const actualCharacterId = characterId.toString();

        const state = outfitStore.getState();

        const outfitValues = new Set();


        // Look through bot outfits for this character

        if (state.botInstances && state.botInstances[actualCharacterId]) {

            Object.values(state.botInstances[actualCharacterId]).forEach(instanceData => {

                if (instanceData && instanceData.bot) {

                    Object.values(instanceData.bot).forEach(value => {

                        if (value && typeof value === 'string' && value !== 'None') {

                            outfitValues.add(value);

                        }

                    });

                }

            });

        }


        // Look through presets for this character

        if (state.presets && state.presets.bot) {

            Object.keys(state.presets.bot).forEach(key => {

                if (key.startsWith(actualCharacterId + '_')) { // Character-specific instance

                    const presets = state.presets.bot[key];


                    if (presets) {

                        Object.values(presets).forEach(preset => {

                            if (preset) {

                                Object.values(preset).forEach(value => {

                                    if (value && typeof value === 'string' && value !== 'None') {

                                        outfitValues.add(value);

                                    }

                                });

                            }

                        });

                    }

                }

            });

        }


        return Array.from(outfitValues);

    }


    /**

     * Checks if a string contains only alphanumeric characters and underscores.

     * This helper function is used to validate macro patterns and other alphanumeric strings.

     * @param {string} str - The string to validate

     * @returns {boolean} True if the string contains only alphanumeric characters and underscores, false otherwise

     */

    isAlphaNumericWithUnderscores(str) {

        if (!str || typeof str !== 'string') {

            return false;

        }


        for (let i = 0; i < str.length; i++) {

            const char = str[i];

            const code = char.charCodeAt(0);


            // Check if character is uppercase letter (A-Z)

            if (code >= 65 && code <= 90) {

                continue;

            }

            // Check if character is lowercase letter (a-z)

            if (code >= 97 && code <= 122) {

                continue;

            }

            // Check if character is digit (0-9)

            if (code >= 48 && code <= 57) {

                continue;

            }

            // Check if character is underscore (_)

            if (code === 95) {

                continue;

            }


            // If character is none of the above, it's invalid

            return false;

        }


        return true;

    }


    /**

     * Checks if a string contains only lowercase alphanumeric characters, underscores, and hyphens.

     * This helper function is used to validate slot names in macro patterns.

     * @param {string} str - The string to validate

     * @returns {boolean} True if the string contains only lowercase alphanumeric characters, underscores, and hyphens, false otherwise

     */

    isLowerAlphaNumericWithUnderscoresAndHyphens(str) {

        if (!str || typeof str !== 'string') {

            return false;

        }


        for (let i = 0; i < str.length; i++) {

            const char = str[i];

            const code = char.charCodeAt(0);


            // Check if character is lowercase letter (a-z)

            if (code >= 97 && code <= 122) {

                continue;

            }

            // Check if character is digit (0-9)

            if (code >= 48 && code <= 57) {

                continue;

            }

            // Check if character is underscore (_)

            if (code === 95) {

                continue;

            }

            // Check if character is hyphen (-)

            if (code === 45) {

                continue;

            }


            // If character is none of the above, it's invalid

            return false;

        }


        return true;

    }


    /**

     * Cleans outfit-related values from text for consistent instance ID generation.

     * This function removes outfit macros and values from text to ensure that

     * instance IDs remain consistent regardless of outfit changes.

     * @param {string} text - The text to clean

     * @returns {string} The cleaned text with outfit-related values removed

     */

    cleanOutfitMacrosFromText(text) {

        if (!text || typeof text !== 'string') {

            return text || '';

        }


        // First, remove any outfit-related macros like {{char_slot}}, {{user_slot}}, etc.

        // Find and remove all occurrences of the pattern {{prefix_slotname}}

        let resultText = text;

        let startIndex = 0;


        // Remove macro patterns without regex

        while (startIndex < resultText.length) {

            const openIdx = resultText.indexOf('{{', startIndex);


            if (openIdx === -1) {

                // No more macro opening found

                break;

            }


            const endIdx = resultText.indexOf('}}', openIdx);


            if (endIdx === -1) {

                // No closing found for this opening, stop processing

                break;

            }


            // Extract the content between {{ and }}

            const macroContent = resultText.substring(openIdx + 2, endIdx);


            // Check if it matches the pattern: prefix followed by an underscore and a slot name

            // Look for underscore in the macro content

            const underscoreIndex = macroContent.indexOf('_');


            if (underscoreIndex !== -1) {

                // Extract prefix and suffix

                const prefix = macroContent.substring(0, underscoreIndex);

                const suffix = macroContent.substring(underscoreIndex + 1);


                // Check if the prefix is 'char', 'user', or an alphanumeric sequence followed by underscore

                const isPrefixValid = prefix === 'char' || prefix === 'user' || this.isAlphaNumericWithUnderscores(prefix);

                // Check if the suffix looks like a valid slot name (alphanumeric, underscore, hyphen)

                const isSuffixValid = this.isLowerAlphaNumericWithUnderscoresAndHyphens(suffix);


                if (isPrefixValid && isSuffixValid) {

                    // This is a valid macro pattern, replace it with {{}}

                    resultText = resultText.substring(0, openIdx) + '{{}}' + resultText.substring(endIdx + 2);

                    // Start the next search right after the replacement

                    startIndex = openIdx + 2; // Position after the replacement '{{}}' - actually 3 positions ahead but we'll start at openIdx + 2

                    continue;

                }

            }


            startIndex = endIdx + 2; // Move past the current closing braces

        }


        // Get the current character ID to identify which outfits to look for

        const character = SillyTavernUtility.getCurrentCharacter();


        if (!character) {

            return resultText;

        }


        const characterId = character.id.toString();


        // Get all possible outfit values from the outfit store for this character across all instances

        const state = outfitStore.getState();


        // Collect all unique outfit values for this character across all instances

        const outfitValues = new Set();


        // Look through bot outfits for this character

        if (state.botInstances && state.botInstances[characterId]) {

            Object.values(state.botInstances[characterId]).forEach(instanceData => {

                if (instanceData && instanceData.bot) {

                    Object.values(instanceData.bot).forEach(value => {

                        if (value && typeof value === 'string' && value !== 'None') {

                            outfitValues.add(value);

                        }

                    });

                }

            });

        }


        // Look through presets for this character

        if (state.presets && state.presets.bot) {

            Object.keys(state.presets.bot).forEach(key => {

                if (key.startsWith(characterId + '_')) { // Character-specific instance

                    const presets = state.presets.bot[key];


                    if (presets) {

                        Object.values(presets).forEach(preset => {

                            if (preset) {

                                Object.values(preset).forEach(value => {

                                    if (value && typeof value === 'string' && value !== 'None') {

                                        outfitValues.add(value);

                                    }

                                });

                            }

                        });

                    }

                }

            });

        }


        // Remove each outfit value from the text if it exists

        // Process in reverse length order to handle longer items first (avoid substring issues)

        const sortedValues = Array.from(outfitValues).sort((a, b) => b.length - a.length);


        let workingText = resultText;


        sortedValues.forEach(outfitValue => {

            if (outfitValue && typeof outfitValue === 'string') {

                // Replace case-insensitive occurrences of the outfit value in the text

                // Use a simple string replacement approach to avoid regex complexity

                let tempText = workingText;

                let lowerTempText = tempText.toLowerCase();

                let lowerOutfitValue = outfitValue.toLowerCase();


                let searchStart = 0;


                while ((searchStart = lowerTempText.indexOf(lowerOutfitValue, searchStart)) !== -1) {

                    // Verify it's a complete word match to avoid partial replacements

                    const endIndex = searchStart + lowerOutfitValue.length;


                    // Check if it's a complete word (surrounded by word boundaries or punctuation)

                    const beforeChar = searchStart > 0 ? lowerTempText.charAt(searchStart - 1) : ' ';

                    const afterChar = endIndex < lowerTempText.length ? lowerTempText.charAt(endIndex) : ' ';


                    // Replace if surrounded by spaces/punctuation or at text boundaries

                    const isWordBoundary = (beforeChar === ' ' || beforeChar === '.' || beforeChar === ',' ||

                            beforeChar === '"' || beforeChar === '\'' ||

                            beforeChar === '(' || beforeChar === '[' ||

                            beforeChar === '\n' || beforeChar === '\t') &&

                        (afterChar === ' ' || afterChar === '.' || afterChar === ',' ||

                            afterChar === '"' || afterChar === '\'' ||

                            afterChar === ')' || afterChar === ']' ||

                            afterChar === '\n' || afterChar === '\t');


                    if (isWordBoundary) {

                        workingText = workingText.substring(0, searchStart) + '[OUTFIT_REMOVED]' + workingText.substring(endIndex);

                        lowerTempText = workingText.toLowerCase();

                        // Update searchStart to point to the end of the replacement to continue searching

                        searchStart += '[OUTFIT_REMOVED]'.length;

                    } else {

                        // Move to the next position after the current match

                        searchStart = endIndex;

                    }

                }

            }

        });


        return workingText;

    }

}


// Create and export a single global instance of the MacroProcessor

export const macroProcessor = new MacroProcessor();
