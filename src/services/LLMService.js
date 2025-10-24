/**
 * LLMService - Handles LLM operations for the Outfit Tracker extension
 */

import {LLMUtility} from '../utils/LLMUtility.js';
import {extractCommands} from '../utils/StringProcessor.js';

/**
 * Process a single outfit command
 * @param {string} command - The command string to process
 * @param {object} botManager - The bot outfit manager
 * @returns {Promise<void>}
 */
async function processSingleCommand(command, botManager) {
    try {
        // Non-regex approach to parse command - similar to AutoOutfitSystem
        if (!command.startsWith('outfit-system_')) {
            throw new Error(`Invalid command format: ${command}`);
        }

        // Extract the action part
        const actionStart = 'outfit-system_'.length;
        const actionEnd = command.indexOf('_', actionStart);

        if (actionEnd === -1) {
            throw new Error(`Invalid command format: ${command}`);
        }

        const action = command.substring(actionStart, actionEnd);

        if (!['wear', 'remove', 'change'].includes(action)) {
            throw new Error(`Invalid action: ${action}. Valid actions: wear, remove, change`);
        }

        // Extract the slot part
        const slotStart = actionEnd + 1;
        const slotEnd = command.indexOf('(', slotStart);

        if (slotEnd === -1) {
            throw new Error(`Invalid command format: ${command}`);
        }

        const slot = command.substring(slotStart, slotEnd);

        // Extract the value part
        const valueStart = slotEnd + 1;
        let value = '';

        if (command.charAt(valueStart) === '"') { // If value is quoted
            const quoteStart = valueStart + 1;
            let i = quoteStart;
            let escaped = false;

            while (i < command.length - 1) {
                const char = command.charAt(i);

                if (escaped) {
                    value += char;
                    escaped = false;
                } else if (char === '\\') {
                    escaped = true;
                } else if (char === '"') {
                    break; // Found closing quote
                } else {
                    value += char;
                }

                i++;
            }
        } else {
            // Value is not quoted, extract until closing parenthesis
            const closingParen = command.indexOf(')', valueStart);

            if (closingParen !== -1) {
                value = command.substring(valueStart, closingParen);
            }
        }

        const cleanValue = value.split('"').join('').trim();

        console.log(`[LLMService] Processing: ${action} ${slot} "${cleanValue}"`);

        // Apply the outfit change to the bot manager
        await botManager.setOutfitItem(slot, action === 'remove' ? 'None' : cleanValue);

    } catch (error) {
        console.error('Error processing single command:', error);
        throw error;
    }
}

/**
 * Generates outfit from LLM based on provided options
 * @param {object} options - Generation options containing the prompt
 * @returns {Promise<string>} - The LLM response containing outfit commands
 */
export async function generateOutfitFromLLM(options) {
    try {
        const prompt = options?.prompt || '';

        if (!prompt) {
            throw new Error('Prompt is required for LLM generation');
        }

        // Use LLMUtility to generate with retry logic
        const response = await LLMUtility.generateWithRetry(
            prompt,
            'You are an outfit generation system. Based on the character information provided, output outfit commands to set the character\'s clothing and accessories.',
            window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null)
        );

        return response;
    } catch (error) {
        console.error('Error generating outfit from LLM:', error);
        throw error;
    }
}

/**
 * Imports outfit from character card using LLM analysis
 * @returns {Promise<object>} - Result with message and any extracted outfit information
 */
export async function importOutfitFromCharacterCard() {
    try {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

        if (!context || !context.characters || context.characterId === undefined || context.characterId === null) {
            throw new Error('No character selected or context not ready');
        }

        const character = context.characters[context.characterId];

        if (!character) {
            throw new Error('Character not found');
        }

        // Construct a prompt to extract outfit information from character card
        const prompt = `Analyze the character card below and extract any clothing or accessory items mentioned. 
        Output only outfit-system commands in this format:
        outfit-system_wear_headwear("item name")
        outfit-system_wear_topwear("item name")
        outfit-system_remove_headwear()
        
        CHARACTER CARD:
        Name: ${character.name || 'Unknown'}
        Description: ${character.description || ''}
        Personality: ${character.personality || ''}
        Scenario: ${character.scenario || ''}
        First Message: ${character.first_message || ''}
        Notes: ${character.character_notes || ''}
        
        OUTPUT ONLY OUTFIT COMMANDS, NO EXPLANATIONS:`;

        // Generate response from LLM
        const response = await LLMUtility.generateWithRetry(
            prompt,
            'You are an outfit extraction system. Extract clothing and accessory items from character descriptions and output outfit commands.',
            context
        );

        // Extract commands from response
        const commands = extractCommands(response);

        // Process the commands to update the current bot outfit
        if (commands && commands.length > 0) {
            console.log(`[LLMService] Found ${commands.length} outfit commands to process:`, commands);

            // Get the global bot outfit manager from window if available
            if (window.botOutfitPanel && window.botOutfitPanel.outfitManager) {
                const botManager = window.botOutfitPanel.outfitManager;

                // Process each command
                for (const command of commands) {
                    try {
                        await processSingleCommand(command, botManager);
                    } catch (cmdError) {
                        console.error(`Error processing command "${command}":`, cmdError);
                    }
                }

                // Save the updated outfit
                const outfitInstanceId = botManager.getOutfitInstanceId();

                await botManager.saveOutfit(outfitInstanceId);

                // Update the UI
                if (window.botOutfitPanel.isVisible) {
                    window.botOutfitPanel.renderContent();
                }
            } else {
                console.warn('[LLMService] Bot outfit manager not available to apply imported outfits');
            }
        } else {
            console.log('[LLMService] No outfit commands found in response');
        }

        return {
            message: `Imported outfit information from ${character.name || 'the character'}. Found and applied ${commands.length} outfit items.`,
            commands: commands,
            characterName: character.name
        };
    } catch (error) {
        console.error('Error importing outfit from character card:', error);

        return {
            message: `Error importing outfit: ${error.message}`,
            commands: [],
            error: error.message
        };
    }
}