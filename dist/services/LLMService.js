"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOutfitFromLLM = generateOutfitFromLLM;
exports.importOutfitFromCharacterCard = importOutfitFromCharacterCard;
const LLMUtility_1 = require("../utils/LLMUtility");
const StringProcessor_1 = require("../processors/StringProcessor");
const CharacterUtils_1 = require("../utils/CharacterUtils");
/**
 * Process a single outfit command
 * @param {string} command - The command string to process
 * @param {object} botManager - The bot outfit manager
 * @returns {Promise<void>}
 */
function processSingleCommand(command, botManager) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const commandRegex = /^outfit-system_(wear|remove|change|replace|unequip)_([a-zA-Z0-9_-]+)\(?:\"([^\"]*\)\"|)\)$/;
            const match = command.match(commandRegex);
            if (!match) {
                throw new Error(`Invalid command format: ${command}`);
            }
            const [, action, slot, value] = match;
            const cleanValue = value || '';
            console.log(`[LLMService] Processing: ${action} ${slot} "${cleanValue}"`);
            let finalAction = action;
            if (action === 'replace') {
                finalAction = 'change';
            }
            else if (action === 'unequip') {
                finalAction = 'remove';
            }
            // Apply the outfit change to the bot manager
            yield botManager.setOutfitItem(slot, finalAction === 'remove' ? 'None' : cleanValue);
        }
        catch (error) {
            console.error('Error processing single command:', error);
            throw error;
        }
    });
}
/**
 * Generates outfit from LLM based on provided options
 * @param {object} options - Generation options containing the prompt
 * @returns {Promise<string>} - The LLM response containing outfit commands
 */
function generateOutfitFromLLM(options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const prompt = (options === null || options === void 0 ? void 0 : options.prompt) || '';
            if (!prompt) {
                throw new Error('Prompt is required for LLM generation');
            }
            // Use LLMUtility to generate with retry logic
            const response = yield LLMUtility_1.LLMUtility.generateWithRetry(prompt, 'You are an outfit generation system. Based on the character information provided, output outfit commands to set the character\'s clothing and accessories.', // Corrected escaping for \'
            ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null));
            return response;
        }
        catch (error) {
            console.error('Error generating outfit from LLM:', error);
            throw error;
        }
    });
}
/**
 * Imports outfit from character card using LLM analysis
 * @returns {Promise<object>} - Result with message and any extracted outfit information
 */
function importOutfitFromCharacterCard() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            const charId = context.characterId;
            if (charId === undefined || charId === null) {
                throw new Error('No character selected or context not ready');
            }
            const characterName = (0, CharacterUtils_1.getCharacterInfoById)(charId, CharacterUtils_1.CharacterInfoType.Name) || 'Unknown';
            const characterDescription = (0, CharacterUtils_1.getCharacterInfoById)(charId, CharacterUtils_1.CharacterInfoType.Description) || '';
            const characterPersonality = (0, CharacterUtils_1.getCharacterInfoById)(charId, CharacterUtils_1.CharacterInfoType.Personality) || '';
            const characterScenario = (0, CharacterUtils_1.getCharacterInfoById)(charId, CharacterUtils_1.CharacterInfoType.Scenario) || '';
            const characterFirstMessage = (0, CharacterUtils_1.getCharacterInfoById)(charId, CharacterUtils_1.CharacterInfoType.DefaultMessage) || '';
            const characterNotes = (0, CharacterUtils_1.getCharacterInfoById)(charId, CharacterUtils_1.CharacterInfoType.CharacterNotes) || '';
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
            // Generate response from LLM
            const response = yield LLMUtility_1.LLMUtility.generateWithRetry(prompt, 'You are an outfit extraction system. Extract clothing and accessory items from character descriptions and output outfit commands.', context);
            // Extract commands from response
            const commands = (0, StringProcessor_1.extractCommands)(response);
            // Process the commands to update the current bot outfit
            if (commands && commands.length > 0) {
                console.log(`[LLMService] Found ${commands.length} outfit commands to process:`, commands);
                // Get the global bot outfit manager from window if available
                if (window.botOutfitPanel && window.botOutfitPanel.outfitManager) {
                    const botManager = window.botOutfitPanel.outfitManager;
                    // Process each command
                    for (const command of commands) {
                        try {
                            yield processSingleCommand(command, botManager);
                        }
                        catch (cmdError) {
                            console.error(`Error processing command "${command}":`, cmdError);
                        }
                    }
                    // Save the updated outfit
                    const outfitInstanceId = botManager.getOutfitInstanceId();
                    yield botManager.saveOutfit(outfitInstanceId);
                    // Update the UI
                    if (window.botOutfitPanel.isVisible) {
                        window.botOutfitPanel.renderContent();
                    }
                }
                else {
                    console.warn('[LLMService] Bot outfit manager not available to apply imported outfits');
                }
            }
            else {
                console.log('[LLMService] No outfit commands found in response');
            }
            return {
                message: `Imported outfit information from ${characterName || 'the character'}. Found and applied ${commands.length} outfit items.`, // Corrected escaping for \'
                commands: commands,
                characterName: characterName
            };
        }
        catch (error) {
            console.error('Error importing outfit from character card:', error);
            return {
                message: `Error importing outfit: ${error.message}`, // Corrected escaping for \'
                commands: [],
                error: error.message
            };
        }
    });
}
