import {LLMUtility} from '../utils/LLMUtility';
import {extractCommands} from '../processors/StringProcessor';
import {CharacterInfoType, getCharacterInfoById} from '../utils/CharacterUtils';
import {debugLog} from '../logging/DebugLogger';

declare const window: any;

/**
 * Process a single outfit command
 * @param {string} command - The command string to process
 * @param {object} botManager - The bot outfit manager
 * @returns {Promise<void>}
 */
async function processSingleCommand(command: string, botManager: any): Promise<void> {
    try {
        const commandRegex = /^outfit-system_(wear|remove|change|replace|unequip)_([a-zA-Z0-9_-]+)\\((?:\"([^\"]*)\"|)\\)$/;
        const match = command.match(commandRegex);

        if (!match) {
            throw new Error(`Invalid command format: ${command}`);
        }

        const [, action, slot, value] = match;
        const cleanValue = value || '';

        debugLog(`Processing: ${action} ${slot} "${cleanValue}"`, null, 'log');

        let finalAction = action;

        if (action === 'replace') {
            finalAction = 'change';
        } else if (action === 'unequip') {
            finalAction = 'remove';
        }

        // Apply the outfit change to the bot manager
        await botManager.setOutfitItem(slot, finalAction === 'remove' ? 'None' : cleanValue);

    } catch (error) {
        debugLog('Error processing single command', error, 'error');
        throw error;
    }
}

/**
 * Generates outfit from LLM based on provided options
 * @param {object} options - Generation options containing the prompt
 * @param {string | null} [profile] - Connection profile to use for generation (defaults to auto outfit system profile if available)
 * @returns {Promise<string>} - The LLM response containing outfit commands
 */
export async function generateOutfitFromLLM(options: { prompt: string }, profile?: string | null): Promise<string> {
    try {
        const prompt = options?.prompt || '';

        if (!prompt) {
            throw new Error('Prompt is required for LLM generation');
        }

        // Use provided profile or get from auto outfit system
        let connectionProfile = profile;
        if (!connectionProfile && window.outfitTracker?.autoOutfitSystem) {
            const outfitSystem = window.outfitTracker.autoOutfitSystem;
            connectionProfile = outfitSystem.getConnectionProfile ? outfitSystem.getConnectionProfile() : null;
        }

        // Use LLMUtility to generate with retry logic and optional connection profile
        const response = await LLMUtility.generateWithProfile(
            prompt,
            'You are an outfit generation system. Based on the character information provided, output outfit commands to set the character\'s clothing and accessories.', // Corrected escaping for \'
            null, // Let generateWithProfile get the context internally,
            connectionProfile
        );

        return response;
    } catch (error) {
        debugLog('Error generating outfit from LLM', error, 'error');
        throw error;
    }
}

/**
 * Imports outfit from character card using LLM analysis
 * @returns {Promise<object>} - Result with message and any extracted outfit information
 */
export async function importOutfitFromCharacterCard(): Promise<{
    message: string;
    commands: string[];
    characterName?: string;
    error?: string
}> {
    try {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        const charId = context.characterId;

        if (charId === undefined || charId === null) {
            throw new Error('No character selected or context not ready');
        }

        const characterName = getCharacterInfoById(charId, CharacterInfoType.Name) || 'Unknown';
        const characterDescription = getCharacterInfoById(charId, CharacterInfoType.Description) || '';
        const characterPersonality = getCharacterInfoById(charId, CharacterInfoType.Personality) || '';
        const characterScenario = getCharacterInfoById(charId, CharacterInfoType.Scenario) || '';
        const characterFirstMessage = getCharacterInfoById(charId, CharacterInfoType.DefaultMessage) || '';
        const characterNotes = getCharacterInfoById(charId, CharacterInfoType.CharacterNotes) || '';

        // Construct a prompt to extract outfit information from character card
        const prompt = `Analyze the character card below and extract any clothing or accessory items mentioned. 
        Output only outfit-system commands in this format:
        outfit-system_wear_headwear("item name")
        outfit-system_wear_topwear("item name")
        outfit-system_remove_headwear()
        
        CHARACTER CARD:
        Name: ${characterName}
        Description: ${characterDescription}
        Personality: ${characterPersonality}
        Scenario: ${characterScenario}
        First Message: ${characterFirstMessage}
        Notes: ${characterNotes}
        
        OUTPUT ONLY OUTFIT COMMANDS, NO EXPLANATIONS:`;

        // Use the auto outfit system's connection profile if available
        const outfitSystem = window.outfitTracker?.autoOutfitSystem;
        const connectionProfile = outfitSystem?.getConnectionProfile ? outfitSystem.getConnectionProfile() : null;

        // Generate response from LLM with optional connection profile
        const response = await LLMUtility.generateWithProfile(
            prompt,
            'You are an outfit extraction system. Extract clothing and accessory items from character descriptions and output outfit commands.',
            null, // Let generateWithProfile get the context internally
            connectionProfile
        );

        // Extract commands from response
        const commands = extractCommands(response);

        // Process the commands to update the current bot outfit
        if (commands && commands.length > 0) {
            debugLog(`Found ${commands.length} outfit commands to process`, {commands}, 'log');

            // Get the global bot outfit manager from window if available
            if (window.botOutfitPanel && window.botOutfitPanel.outfitManager) {
                const botManager = window.botOutfitPanel.outfitManager;

                // Process each command
                for (const command of commands) {
                    try {
                        await processSingleCommand(command, botManager);
                    } catch (cmdError) {
                        debugLog(`Error processing command "${command}":`, cmdError, 'error');
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
                debugLog('Bot outfit manager not available to apply imported outfits', null, 'warn');
            }
        } else {
            debugLog('No outfit commands found in response', null, 'log');
        }

        return {
            message: `Imported outfit information from ${characterName || 'the character'}. Found and applied ${commands.length} outfit items.`, // Corrected escaping for \'
            commands: commands,
            characterName: characterName
        };
    } catch (error: any) {
        debugLog('Error importing outfit from character card', error, 'error');

        return {
            message: `Error importing outfit: ${error.message}`, // Corrected escaping for \'
            commands: [],
            error: error.message
        };
    }
}