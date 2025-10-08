// Import modules from SillyTavern core - correct path when extension is installed in public/extensions/third-party/[extension-name]/
import { getContext, extension_settings } from '../../scripts/extensions.js';
import { saveSettingsDebounced } from '../../script.js';

// Import the extractMacros, replaceAll, safeGet functions from StringProcessor
import { extractMacros, replaceAll, safeGet } from '../utils/StringProcessor.js';
import { LLMUtility } from '../utils/LLMUtility.js';



// Import the managers and panels
import { BotOutfitManager } from '../managers/BotOutfitManager.js';
import { BotOutfitPanel } from '../panels/BotOutfitPanel.js';
import { UserOutfitManager } from '../managers/UserOutfitManager.js';
import { UserOutfitPanel } from '../panels/UserOutfitPanel.js';

// Helper function to extract username from message
function extractUserName(mostRecentUserMessage) {
    let userName = null;
    
    // If the message has a force_avatar property (used for personas), extract the name
    if (mostRecentUserMessage.force_avatar) {
        // Extract the persona name from the avatar path
        const USER_AVATAR_PATH = 'useravatars/';

        if (typeof mostRecentUserMessage.force_avatar === 'string' &&
            mostRecentUserMessage.force_avatar.startsWith(USER_AVATAR_PATH)) {
            userName = mostRecentUserMessage.force_avatar.replace(USER_AVATAR_PATH, '');
            
            // Remove file extension if present
            const lastDotIndex = userName.lastIndexOf('.');

            if (lastDotIndex > 0) {
                userName = userName.substring(0, lastDotIndex);
            }
        }
    }
    // If force_avatar doesn't exist, try to get name from the message itself
    else if (mostRecentUserMessage.name) {
        userName = mostRecentUserMessage.name;
    }
    
    return userName;
}

// Import AutoOutfitSystem with error handling (using dynamic import inside async function)
let AutoOutfitSystem;
let autoOutfitModule;

async function loadAutoOutfitSystem() {
    try {
        autoOutfitModule = await import('./AutoOutfitSystem.js');
        AutoOutfitSystem = autoOutfitModule.AutoOutfitSystem;
    } catch (error) {
        console.error('[OutfitTracker] Failed to load AutoOutfitSystem:', error);
        // Create a dummy class if AutoOutfitSystem fails to load
        AutoOutfitSystem = class DummyAutoOutfitSystem {
            constructor() { this.isEnabled = false; }
            enable() { return '[Outfit System] Auto outfit system not available'; }
            disable() { return '[Outfit System] Auto outfit system not available'; }
            setPrompt() { return '[Outfit System] Auto outfit system not available'; }
            resetToDefaultPrompt() { return '[Outfit System] Auto outfit system not available'; }
            getStatus() { return { enabled: false, hasPrompt: false }; }
            manualTrigger() { this.showPopup('Auto outfit system not available', 'error'); }
            showPopup(message, type = 'info') {
                // Use toastr if available, otherwise fall back to console
                if (window.toastr) {
                    window.toastr[type || 'info'](message);
                } else {
                    console.log(`[Outfit System] ${type.toUpperCase()}: ${message}`);
                }
            }
        };
    }
}

// Define global variables that might not be imported directly
// power_user and user_avatar are typically available globally in SillyTavern

console.log('[OutfitTracker] Starting extension loading...');

export async function initializeExtension() {
    // Load AutoOutfitSystem dynamically
    await loadAutoOutfitSystem();

    // Make sure these are available globally for child modules
    // This allows dynamically imported modules to access them
    window.getContext = getContext || window.getContext;
    window.extension_settings = extension_settings || window.extension_settings;
    window.saveSettingsDebounced = saveSettingsDebounced || window.saveSettingsDebounced;

    // Check if we have the required SillyTavern globals
    if (!window.getContext || !window.extension_settings || !window.saveSettingsDebounced) {
        console.error('[OutfitTracker] Required SillyTavern functions are not available. Is the extension installed in the correct location?');
        throw new Error('Missing required SillyTavern globals. Extension must be installed in SillyTavern\'s extensions directory.');
    }

    const MODULE_NAME = 'outfit_tracker';
    const CLOTHING_SLOTS = [
        'headwear',
        'topwear',
        'topunderwear',
        'bottomwear',
        'bottomunderwear',
        'footwear',
        'footunderwear'
    ];

    const ACCESSORY_SLOTS = [
        'head-accessory',
        'ears-accessory',
        'eyes-accessory',
        'mouth-accessory',
        'neck-accessory',
        'body-accessory',
        'arms-accessory',
        'hands-accessory',
        'waist-accessory',
        'bottom-accessory',
        'legs-accessory',
        'foot-accessory'
    ];

    const botManager = new BotOutfitManager([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
    const userManager = new UserOutfitManager([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
    const botPanel = new BotOutfitPanel(botManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, saveSettingsDebounced);
    const userPanel = new UserOutfitPanel(userManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, saveSettingsDebounced);
    const autoOutfitSystem = new AutoOutfitSystem(botManager);

    // Store panels globally for access in other functions
    window.botOutfitPanel = botPanel;
    window.userOutfitPanel = userPanel;
    window.autoOutfitSystem = autoOutfitSystem;

    // Function to get default outfit prompt (same as bot panel)
    function getDefaultOutfitPrompt() {
        return `Analyze the character's description, personality, scenario, character notes, and first message. Based on these details, determine an appropriate outfit for the character.

Here is the character information:
Name: <CHARACTER_NAME>
Description: <CHARACTER_DESCRIPTION>
Personality: <CHARACTER_PERSONALITY>
Scenario: <CHARACTER_SCENARIO>
Character Notes: <CHARACTER_NOTES>
First Message: <CHARACTER_FIRST_MESSAGE>

Based on the information provided, output outfit commands to set the character's clothing and accessories. Only output commands, nothing else.

Use these command formats:
outfit-system_wear_headwear("item name")
outfit-system_wear_topwear("item name")
outfit-system_wear_topunderwear("item name")
outfit-system_wear_bottomwear("item name")
outfit-system_wear_bottomunderwear("item name")
outfit-system_wear_footwear("item name")
outfit-system_wear_footunderwear("item name")
outfit-system_wear_head-accessory("item name")
outfit-system_wear_ears-accessory("item name")
outfit-system_wear_eyes-accessory("item name")
outfit-system_wear_mouth-accessory("item name")
outfit-system_wear_neck-accessory("item name")
outfit-system_wear_body-accessory("item name")
outfit-system_wear_arms-accessory("item name")
outfit-system_wear_hands-accessory("item name")
outfit-system_wear_waist-accessory("item name")
outfit-system_wear_bottom-accessory("item name")
outfit-system_wear_legs-accessory("item name")
outfit-system_wear_foot-accessory("item name")
outfit-system_remove_headwear()
outfit-system_remove_topwear()
outfit-system_remove_topunderwear()
outfit-system_remove_bottomwear()
outfit-system_remove_bottomunderwear()
outfit-system_remove_footwear()
outfit-system_remove_footunderwear()
outfit-system_remove_head-accessory()
outfit-system_remove_ears-accessory()
outfit-system_remove_eyes-accessory()
outfit-system_remove_mouth-accessory()
outfit-system_remove_neck-accessory()
outfit-system_remove_body-accessory()
outfit-system_remove_arms-accessory()
outfit-system_remove_hands-accessory()
outfit-system_remove_waist-accessory()
outfit-system_remove_bottom-accessory()
outfit-system_remove_legs-accessory()
outfit-system_remove_foot-accessory()

For each clothing item or accessory you identify for this character, output a corresponding command. If an item is not applicable based on the character info, do not output a command for it.
Only output command lines, nothing else.`;
    }

    // Function to generate outfit from LLM (same as bot panel)
    async function generateOutfitFromLLM(characterInfo) {
        try {
            // Get the default prompt
            let prompt = getDefaultOutfitPrompt();

            // Replace placeholders with actual character info
            prompt = prompt
                .replace('<CHARACTER_NAME>', characterInfo.name)
                .replace('<CHARACTER_DESCRIPTION>', characterInfo.description)
                .replace('<CHARACTER_PERSONALITY>', characterInfo.personality)
                .replace('<CHARACTER_SCENARIO>', characterInfo.scenario)
                .replace('<CHARACTER_NOTES>', characterInfo.characterNotes)
                .replace('<CHARACTER_FIRST_MESSAGE>', characterInfo.firstMessage);

            const context = getContext();

            // Check if there is a connection profile set for the auto outfit system
            let connectionProfile = null;

            if (autoOutfitSystem && typeof autoOutfitSystem.getConnectionProfile === 'function') {
                connectionProfile = autoOutfitSystem.getConnectionProfile();
            }

            // Try different generation methods in order of preference
            if (context.generateRaw) {
                return await LLMUtility.generateWithProfile(
                    prompt,
                    'You are an outfit generation system. Based on the character information provided, output outfit commands to set the character\'s clothing and accessories.',
                    context,
                    connectionProfile
                );
            } else if (context.generateQuietPrompt) {
                return await LLMUtility.generateWithProfile(
                    prompt,
                    'You are an outfit generation system. Based on the character information provided, output outfit commands to set the character\'s clothing and accessories.',
                    context,
                    connectionProfile
                );
            } 
            // Use AutoOutfitSystem's generation method as fallback
            return await autoOutfitSystem.generateWithProfile(prompt);
            
        } catch (error) {
            console.error('Error generating outfit from LLM:', error);
            throw error;
        }
    }

    // Function to generate outfit from character info using LLM (same as bot panel)
    async function generateOutfitFromCharacterInfoLLM(characterInfo) {
        try {
            // Generate outfit from LLM using the same method as the bot panel
            const response = await generateOutfitFromLLM(characterInfo);

            // Parse the response to get the outfit commands
            const { extractCommands } = await import('../utils/StringProcessor.js');
            const commands = extractCommands(response);

            return commands;
        } catch (error) {
            console.error('Error in generateOutfitFromCharacterInfoLLM:', error);
            throw error;
        }
    }

    // Function to process a single outfit command (same as bot panel)
    async function processSingleOutfitCommand(command, outfitManager) {
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

            const cleanValue = value.replace(/"/g, '').trim();

            console.log(`[Import Outfit Command] Processing: ${action} ${slot} "${cleanValue}"`);

            // Apply the outfit change to the outfit manager
            await outfitManager.setOutfitItem(slot, action === 'remove' ? 'None' : cleanValue);

        } catch (error) {
            console.error('Error processing single command:', error);
            throw error;
        }
    }

    // Function to use LLM for intelligent removal of clothing references
    async function removeClothingReferencesWithLLM(characterInfo) {
        try {
            const prompt = `Clean up character descriptions by removing clothing/accessory details while preserving all other character information.

TASKS:
1. Remove clothing and accessory descriptions
2. Fix spelling/grammar errors in remaining text
3. Preserve quoted speech/actions exactly
4. Maintain all other character info

CHARACTER DATA:
Name: ${characterInfo.name || 'Unknown'}
Description: ${characterInfo.description}
Personality: ${characterInfo.personality}
Scenario: ${characterInfo.scenario}
Notes: ${characterInfo.characterNotes}
First Message: ${characterInfo.firstMessage}

OUTPUT FORMAT:
[DESCRIPTION]
Cleaned description text
[/DESCRIPTION]

[PERSONALITY]
Cleaned personality text
[/PERSONALITY]

[SCENARIO]
Cleaned scenario text
[/SCENARIO]

[CHARACTER_NOTES]
Cleaned notes text
[/CHARACTER_NOTES]

Only return the formatted sections with cleaned content.`;

            const context = getContext();

            let result;

            try {
                // Check if there is a connection profile set for the auto outfit system
                let connectionProfile = null;

                if (autoOutfitSystem && typeof autoOutfitSystem.getConnectionProfile === 'function') {
                    connectionProfile = autoOutfitSystem.getConnectionProfile();
                }

                // Try different generation methods in order of preference
                if (context.generateRaw) {
                    result = await LLMUtility.generateWithProfile(
                        prompt,
                        'You are an assistant that helps clean up character descriptions by removing clothing references while preserving other content and fixing grammar.',
                        context,
                        connectionProfile
                    );
                } else if (context.generateQuietPrompt) {
                    result = await LLMUtility.generateWithProfile(
                        prompt,
                        'You are an assistant that helps clean up character descriptions by removing clothing references while preserving other content and fixing grammar.',
                        context,
                        connectionProfile
                    );
                } else {
                    // Use AutoOutfitSystem's generation method as fallback
                    result = await autoOutfitSystem.generateWithProfile(prompt);
                }
            } catch (error) {
                console.warn('LLM did not return a valid response, returning original character info');
                return characterInfo;
            }

            // Extract content from the labeled sections
            const extractField = (text, startTag, endTag) => {
                const startIndex = text.indexOf(startTag);

                if (startIndex === -1) {return null;}

                const contentStart = startIndex + startTag.length;
                const endIndex = text.indexOf(endTag, contentStart);

                if (endIndex === -1) {return null;}

                return text.substring(contentStart, endIndex).trim();
            };

            // Extract each field
            const extractedDescription = extractField(result, '[DESCRIPTION]', '[/DESCRIPTION]');
            const extractedPersonality = extractField(result, '[PERSONALITY]', '[/PERSONALITY]');
            const extractedScenario = extractField(result, '[SCENARIO]', '[/SCENARIO]');
            const extractedCharacterNotes = extractField(result, '[CHARACTER_NOTES]', '[/CHARACTER_NOTES]');

            // Log extracted content for debugging
            console.log('Extracted Description:', extractedDescription);
            console.log('Extracted Personality:', extractedPersonality);
            console.log('Extracted Scenario:', extractedScenario);
            console.log('Extracted Character Notes:', extractedCharacterNotes);

            // Return the cleaned character info, using original values if extraction failed
            return {
                name: characterInfo.name,
                description: extractedDescription !== null ? extractedDescription : characterInfo.description,
                personality: extractedPersonality !== null ? extractedPersonality : characterInfo.personality,
                scenario: extractedScenario !== null ? extractedScenario : characterInfo.scenario,
                firstMessage: characterInfo.firstMessage, // Don't modify first message
                characterNotes: extractedCharacterNotes !== null ? extractedCharacterNotes : characterInfo.characterNotes,
            };
        } catch (error) {
            console.error('Error using LLM to clean character info:', error);
            // If LLM processing fails, return the original character info
            return characterInfo;
        }
    }

    // Function to import outfit from character card using LLM analysis
    async function importOutfitFromCharacterCard() {
        const context = getContext();

        if (!context || !context.characters || context.characterId === undefined || context.characterId === null) {
            throw new Error('No character selected or context not ready');
        }

        const character = context.characters[context.characterId];

        if (!character) {
            throw new Error('Character not found');
        }

        // Get character information similar to how BotOutfitPanel does it
        const characterInfo = {
            name: character.name || 'Unknown',
            description: character.description || '',
            personality: character.personality || '',
            scenario: character.scenario || '',
            firstMessage: character.first_message || '',
            characterNotes: character.character_notes || '',
        };

        // Get the first message from the current chat if it's different from the character's first_message
        if (context.chat && context.chat.length > 0) {
            const firstChatMessage = context.chat.find(msg => !msg.is_user && !msg.is_system);

            if (firstChatMessage && firstChatMessage.mes) {
                characterInfo.firstMessage = firstChatMessage.mes;
            }
        }

        // Use the same LLM logic as the bot panel to generate outfit from character info
        const outfitCommands = await generateOutfitFromCharacterInfoLLM(characterInfo);

        // Apply the outfit commands to the bot manager
        if (outfitCommands && outfitCommands.length > 0) {
            for (const command of outfitCommands) {
                await processSingleOutfitCommand(command, botManager);
            }

            // Update the outfit panel UI to reflect the new outfit values
            if (window.botOutfitPanel && window.botOutfitPanel.isVisible) {
                window.botOutfitPanel.outfitManager.loadOutfit();
                window.botOutfitPanel.renderContent();
            }
        }

        // Use LLM to intelligently remove clothing references and fix grammar
        const updatedCharacterInfo = await removeClothingReferencesWithLLM(characterInfo);

        // Update the character card in the current context
        character.description = updatedCharacterInfo.description;
        character.personality = updatedCharacterInfo.personality;
        character.scenario = updatedCharacterInfo.scenario;
        character.character_notes = updatedCharacterInfo.characterNotes;

        // Update the UI to reflect changes
        if (typeof window.updateCharacterInChat === 'function') {
            window.updateCharacterInChat();
        }

        // Update the character in the characters array (if context allows)
        context.characters[context.characterId] = character;

        // Return success message
        const itemsCount = outfitCommands ? outfitCommands.length : 0;

        return {
            message: `Successfully imported outfit with ${itemsCount} items from character card using LLM analysis and updated character description.`
        };
    }



    // Define a function to replace outfit-related macros in text without using regex
    function replaceOutfitMacrosInText(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        let processedText = text;

        try {
            // Get the current bot character name
            const context = getContext();
            let botCharacterName = 'Unknown';

            // Get the user's persona name using the current chat personas
            let userName = 'User'; // Default fallback

            // Get the current persona name from the active chat
            if (context && context.chat) {
                // Filter messages that are from the user to get their avatars
                const userMessages = context.chat.filter(message => message.is_user);

                if (userMessages.length > 0) {
                    // Get the most recent user message to determine current persona
                    const mostRecentUserMessage = userMessages[userMessages.length - 1];
                    
                    // Extract username using helper function
                    userName = extractUserName(mostRecentUserMessage);
                }
            }

            // Fallback: try the old power_user method if we still don't have a name
            if (userName === 'User') {
                if (typeof window.power_user !== 'undefined' && window.power_user && window.power_user.personas && typeof window.user_avatar !== 'undefined' && window.user_avatar) {
                    // Get the name from the mapping of avatar to name
                    const personaName = window.power_user.personas[window.user_avatar];

                    // If we found the persona in the mapping, use it; otherwise fall back to name1 or 'User'
                    userName = personaName || (typeof window.name1 !== 'undefined' ? window.name1 : 'User');
                }
                // Fallback to name1 if the above method doesn't work
                else if (typeof window.name1 !== 'undefined' && window.name1) {
                    userName = window.name1;
                }
            }

            if (context && context.characters && context.characterId !== undefined && context.characterId !== null) {
                const character = context.characters[context.characterId];

                if (character && character.name) {
                    botCharacterName = character.name;
                }
            }

            // Replace all <BOT> instances with the actual character name
            processedText = replaceAll(processedText, '<BOT>', botCharacterName);
            // Replace {{user}} with the current active persona name
            processedText = replaceAll(processedText, '{{user}}', userName);

            // Normalize character name for variable access (replace spaces with underscores)
            const normalizedBotName = botCharacterName.replace(/\s+/g, '_');

            // Extract all macros from the text using the same function as in AutoOutfitSystem
            const macros = extractMacros(processedText);

            // Process each macro and replace with actual values in reverse order
            // to prevent index shifting issues when replacing
            for (let i = macros.length - 1; i >= 0; i--) {
                const { fullMacro, varName } = macros[i];

                let value = 'None'; // Default value if not found

                // Check for global outfit macro patterns like bot_currentOutfit_Headwear
                if (varName.startsWith('bot_currentOutfit_') || varName.startsWith('user_currentOutfit_')) {
                    // Extract the slot name from after the prefix
                    let slotName = varName.substring(varName.lastIndexOf('_') + 1);

                    // Normalize the slot name to match the internal format if necessary
                    slotName = slotName.toLowerCase();
                    // Check if it's a clothing slot or accessory slot
                    if ([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS].includes(slotName)) {
                        if (varName.startsWith('bot_currentOutfit_')) {
                            // Get the bot manager's current outfit value for this slot
                            if (botManager && botManager.currentValues && botManager.currentValues[slotName] !== undefined) {
                                value = botManager.currentValues[slotName];
                            }
                        } else if (varName.startsWith('user_currentOutfit_')) {
                            // Get the user manager's current outfit value for this slot
                            if (userManager && userManager.currentValues && userManager.currentValues[slotName] !== undefined) {
                                value = userManager.currentValues[slotName];
                            }
                        }
                    }
                }
                // Check if it's a character-specific variable (checking multiple possible formats)
                else if (varName.startsWith(`${botCharacterName}_`) || varName.startsWith(`${normalizedBotName}_`)) {
                    // Extract slot name after the character name prefix
                    let slot;

                    if (varName.startsWith(`${botCharacterName}_`)) {
                        slot = varName.substring(botCharacterName.length + 1);
                    } else if (varName.startsWith(`${normalizedBotName}_`)) {
                        slot = varName.substring(normalizedBotName.length + 1);
                    }

                    // Try to get the value using both formats to ensure compatibility
                    const originalFormatVarName = `${botCharacterName}_${slot}`;
                    const normalizedFormatVarName = `${normalizedBotName}_${slot}`;

                    // Check both possible formats in global variables
                    if (window.extension_settings.variables.global &&
                        window.extension_settings.variables.global[originalFormatVarName] !== undefined) {
                        value = window.extension_settings.variables.global[originalFormatVarName];
                    } else if (window.extension_settings.variables.global &&
                        window.extension_settings.variables.global[normalizedFormatVarName] !== undefined) {
                        value = window.extension_settings.variables.global[normalizedFormatVarName];
                    }
                }
                // Check if it's a user variable
                else if (varName.startsWith('User_')) {
                    try {
                        if (window.extension_settings.variables.global &&
                            window.extension_settings.variables.global[`${varName}`] !== undefined) {
                            value = window.extension_settings.variables.global[`${varName}`];
                        }
                    } catch (error) {
                        console.warn('Could not access user outfit manager for macro replacement:', error);
                    }
                }

                // Replace the macro with the actual value
                processedText = replaceAll(processedText, fullMacro, value);
            }
        } catch (error) {
            console.error('Error replacing outfit macros in text:', error);
        }

        return processedText;
    }

    // Function to update the panel styles with the saved color preferences
    function updatePanelStyles() {
        // Update bot panel styles if it exists
        if (window.botOutfitPanel && window.botOutfitPanel.domElement) {
            window.botOutfitPanel.applyPanelColors();
        }

        // Update user panel styles if it exists
        if (window.userOutfitPanel && window.userOutfitPanel.domElement) {
            window.userOutfitPanel.applyPanelColors();
        }
    }

    // Fallback function for simple hash
    function generateInstanceIdFromTextSimple(text) {
        let hash = 0;
        const str = text.substring(0, 100); // Only use first 100 chars to keep ID manageable

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);

            hash = ((hash << 5) - hash) + char;
            hash &= hash; // Convert to 32-bit integer
        }

        // Convert to positive and return string representation
        return Math.abs(hash).toString(36);
    }
    
    // Helper function to generate a stronger hash from text for use as instance ID
    function generateInstanceIdFromText(text) {
        // Use a more robust hashing algorithm using Web Crypto API
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            
            return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                // Return first 16 characters for manageable length
                return hashHex.substring(0, 16);
            }).catch(err => {
                // Fallback to simple hash if crypto fails
                console.warn('Crypto API not available, falling back to simple hash for instance ID generation', err);
                return generateInstanceIdFromTextSimple(text);
            });
        } 
        // Fallback to simple hash if crypto is not available
        return generateInstanceIdFromTextSimple(text);
        
    }
    
    // Function to create a unique conversation ID based on character and other identifying factors
    function generateConversationInstanceId(context, characterId) {
        if (!context || !characterId) {
            // If context or characterId is not available, generate a temporary ID
            return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Create identifiers using character information
        const identifiers = [
            characterId || 'unknown',
            context.characterId || 'unknown',
            context.chatId || 'unknown'
        ];
        
        // Check if there are AI messages in the current chat and get the first one
        if (context.chat && context.chat.length > 0) {
            const aiMessages = context.chat.filter(msg => !msg.is_user && !msg.is_system);

            if (aiMessages.length > 0) {
                const firstMessage = aiMessages[0];
                const firstMessageText = firstMessage.mes || '';
                
                // Add first message content to the identifiers for uniqueness
                identifiers.push(firstMessageText);
            }
        }
        
        // Combine all identifiers to create a unique string
        const combinedIdentifiers = identifiers.join('_');
        
        // Generate hash from the combined identifiers
        return generateInstanceIdFromText(combinedIdentifiers).then(hash => {
            // Return a descriptive instance ID that includes a hash
            return `conv_${hash}`;
        });
    }

    // Function to wipe all outfit data for all characters
    async function wipeAllOutfits() {
        try {
            // Clear all outfit instance variables from global settings
            const globalVars = safeGet(window, 'extension_settings.variables.global', {});
            const keysToWipe = [];
            
            // Find all outfit-related global variables
            for (const key in globalVars) {
                if (key.startsWith('OUTFIT_INST_')) {
                    keysToWipe.push(key);
                }
            }
            
            // Remove all found keys
            for (const key of keysToWipe) {
                delete window.extension_settings.variables.global[key];
            }
            
            // Clear all preset data
            if (window.extension_settings?.outfit_tracker?.presets) {
                window.extension_settings.outfit_tracker.presets = {
                    bot: {},
                    user: {}
                };
            }
            
            // Notify user of completion
            console.log(`[OutfitTracker] Wiped ${keysToWipe.length} outfit variables and all presets`);
            toastr.success(`Successfully wiped ${keysToWipe.length} outfit variables and all presets`, 'Outfit Data Wiped');
            
            // If panels exist, refresh them to show the cleared state
            if (window.botOutfitPanel && window.botOutfitPanel.outfitManager) {
                window.botOutfitPanel.outfitManager.loadOutfit();
                window.botOutfitPanel.renderContent();
            }
            
            if (window.userOutfitPanel && window.userOutfitPanel.outfitManager) {
                window.userOutfitPanel.outfitManager.loadOutfit();
                window.userOutfitPanel.renderContent();
            }
            
            // Reload the page after a short delay to ensure data is properly cleared
            setTimeout(() => {
                location.reload();
            }, 1000); // 1 second delay to allow UI updates before reload
            
            return keysToWipe.length;
        } catch (error) {
            console.error('[OutfitTracker] Error wiping outfit data:', error);
            toastr.error('Error wiping outfit data. Check console for details.', 'Wipe Failed');
            return -1;
        }
    }

    // Add the function to global scope so it can be accessed by the settings UI
    globalThis.wipeAllOutfits = wipeAllOutfits;

    // Format the outfit info according to the required format
    function getOutfitInfoString() {
        try {
            // Get current outfit data from the bot manager
            const botOutfitData = botManager && botManager.getOutfitData ?
                botManager.getOutfitData([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]) : [];
            const userOutfitData = userManager && userManager.getOutfitData ?
                userManager.getOutfitData([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]) : [];

            let outfitInfo = '';

            // Check if bot has any non-empty clothing items before adding the bot clothing section
            const botHasClothing = botOutfitData.some(data =>
                CLOTHING_SLOTS.includes(data.name) && data.value !== 'None' && data.value !== ''
            );

            if (botHasClothing) {
                outfitInfo += '\n**<BOT>\'s Current Outfit**\n';

                // Add clothing info
                CLOTHING_SLOTS.forEach(slot => {
                    const slotData = botOutfitData.find(data => data.name === slot);

                    if (slotData) {
                        const formattedSlotName = slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.charAt(0).toUpperCase()).replace('underwear', 'Underwear');
                        // Use the new instance-based variable name if an instance ID is set
                        // Removed chatId from the format to persist across chat resets
                        let varName;

                        if (botManager.getOutfitInstanceId() && !botManager.getOutfitInstanceId().startsWith('temp_')) {
                            varName = `OUTFIT_INST_${botManager.characterId || 'unknown'}_${botManager.getOutfitInstanceId()}_${slotData.name}`;
                        } else {
                            // If using temporary ID or no ID, fall back to character-based naming
                            const formattedCharacterName = (botManager.character || 'Unknown').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

                            varName = `${formattedCharacterName}_${slotData.name}`;
                        }
                        outfitInfo += `**${formattedSlotName}:** {{getglobalvar::${varName}}}\n`;
                    }
                });
            }

            // Check if bot has any non-empty accessories before adding the accessories section
            const botHasAccessories = botOutfitData.some(data =>
                ACCESSORY_SLOTS.includes(data.name) && data.value !== 'None' && data.value !== ''
            );

            if (botHasAccessories) {
                outfitInfo += '\n**<BOT>\'s Current Accessories**\n';

                // Add accessory info - only include those that are specifically defined (not "None" or empty)
                ACCESSORY_SLOTS.forEach(slot => {
                    const slotData = botOutfitData.find(data => data.name === slot);

                    if (slotData && slotData.value !== 'None' && slotData.value !== '') {
                        // Fix the eyes accessory typo mentioned in the requirements
                        let formattedSlotName = slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.charAt(0).toUpperCase())
                            .replace(/-/g, ' ')
                            .replace('accessory', 'Accessory');

                        // Fix the typo: "Eyes Accessory" should come from "ears-accessory" according to the requirement example
                        if (slot === 'ears-accessory') {
                            formattedSlotName = 'Eyes Accessory';
                        }
                        // Use the new instance-based variable name if an instance ID is set
                        // Removed chatId from the format to persist across chat resets
                        let varName;

                        if (botManager.getOutfitInstanceId() && !botManager.getOutfitInstanceId().startsWith('temp_')) {
                            varName = `OUTFIT_INST_${botManager.characterId || 'unknown'}_${botManager.getOutfitInstanceId()}_${slotData.name}`;
                        } else {
                            // If using temporary ID or no ID, fall back to character-based naming
                            const formattedCharacterName = (botManager.character || 'Unknown').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

                            varName = `${formattedCharacterName}_${slotData.name}`;
                        }
                        outfitInfo += `**${formattedSlotName}:** {{getglobalvar::${varName}}}\n`;
                    }
                });
            }

            // Check if user has any non-empty clothing items before adding the user clothing section
            const userHasClothing = userOutfitData.some(data =>
                CLOTHING_SLOTS.includes(data.name) && data.value !== 'None' && data.value !== ''
            );

            if (userHasClothing) {
                outfitInfo += '\n**{{user}}\'s Current Outfit**\n';

                // Add user clothing info
                CLOTHING_SLOTS.forEach(slot => {
                    const slotData = userOutfitData.find(data => data.name === slot);

                    if (slotData) {
                        const formattedSlotName = slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.charAt(0).toUpperCase()).replace('underwear', 'Underwear');
                        // Use the simple variable name for user (persistent across instances)
                        let varName = `OUTFIT_INST_USER_${slotData.name}`;

                        outfitInfo += `**${formattedSlotName}:** {{getglobalvar::${varName}}}\n`;
                    }
                });
            }

            // Check if user has any non-empty accessories before adding the accessories section
            const userHasAccessories = userOutfitData.some(data =>
                ACCESSORY_SLOTS.includes(data.name) && data.value !== 'None' && data.value !== ''
            );

            if (userHasAccessories) {
                outfitInfo += '\n**{{user}}\'s Current Accessories**\n';

                // Add user accessory info - only include those that are specifically defined (not "None" or empty)
                ACCESSORY_SLOTS.forEach(slot => {
                    const slotData = userOutfitData.find(data => data.name === slot);

                    if (slotData && slotData.value !== 'None' && slotData.value !== '') {
                        // Fix the eyes accessory typo mentioned in the requirements
                        let formattedSlotName = slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.charAt(0).toUpperCase())
                            .replace(/-/g, ' ')
                            .replace('accessory', 'Accessory');

                        // Fix the typo: "Eyes Accessory" should come from "ears-accessory" according to the requirement example
                        if (slot === 'ears-accessory') {
                            formattedSlotName = 'Eyes Accessory';
                        }
                        // Use the simple variable name for user (persistent across instances)
                        let varName = `OUTFIT_INST_USER_${slotData.name}`;

                        outfitInfo += `**${formattedSlotName}:** {{getglobalvar::${varName}}}\n`;
                    }
                });
            }

            return outfitInfo;
        } catch (error) {
            console.error('[OutfitTracker] Error generating outfit info string:', error);
            return ''; // Return empty string if there's an error
        }
    }

    async function updateForCurrentCharacter() {
        try {
            const context = getContext();

            // Check if context is ready before trying to access character data
            if (!context || !context.characters || context.characterId === undefined || context.characterId === null) {
                console.log('[OutfitTracker] Context not ready or no character selected, setting as Unknown');
                if (botManager) {
                    botManager.setCharacter('Unknown', null, null);
                }
                if (botPanel) {
                    botPanel.updateCharacter('Unknown');
                }
                return;
            }

            // Make sure the character exists in the characters array
            const character = context.characters[context.characterId];

            if (!character) {
                console.log('[OutfitTracker] Character not found at index ' + context.characterId + ', setting as Unknown');
                if (botManager) {
                    botManager.setCharacter('Unknown', null, null);
                }
                if (botPanel) {
                    botPanel.updateCharacter('Unknown');
                }
                return;
            }

            const charName = character.name || 'Unknown';

            console.log('[OutfitTracker] Updating character to: ' + charName + ' (ID: ' + context.characterId + ')');

            // Check if we have a new chat or the same character but different first message
            const currentChatId = context.chatId;

            // Generate a unique conversation instance ID using the hash function
            const instanceId = await generateConversationInstanceId(context, context.characterId);

            if (botManager) {
                // Update the character with characterId and chatId for proper namespace
                botManager.setCharacter(charName, context.characterId, currentChatId);

                // Set the outfit instance ID based on the first message scenario
                botManager.setOutfitInstanceId(instanceId);

                // Load the outfit data for the new instance
                await botManager.loadOutfit();
            }
            if (botPanel) {
                botPanel.updateCharacter(charName);
            }

            // Update the user panel as well when chat changes
            if (userManager) {
                // Set the outfit instance ID for user based on the same first message scenario
                userManager.setOutfitInstanceId(instanceId);

                // Load the outfit data for the new instance
                await userManager.loadOutfit();
            }
            if (userPanel) {
                userPanel.updateHeader();
            }

            // Ensure outfit managers have loaded their values before panel renders
            // This addresses the issue where fields are empty until a swipe occurs
            if (botManager) {
                // Ensure all outfit slots are properly loaded for this character/conversation instance
                await botManager.loadOutfit();
            }
            if (userManager) {
                // Ensure all outfit slots are properly loaded for user in this conversation instance
                await userManager.loadOutfit();
            }
            
            // Force an immediate render to update UI with the loaded values
            // This should fix the issue where values are empty until swipe occurs
            if (botPanel.renderContent) {
                botPanel.renderContent();
            }
            if (userPanel.renderContent) {
                userPanel.renderContent();
            }
            
            // Another attempt to ensure data is loaded and rendered properly
            // This addresses the specific issue where fields are empty until the first message is swiped
            setTimeout(async () => {
                if (botManager) {
                    // Reload the outfit data to ensure latest values are in place
                    await botManager.loadOutfit();
                    // Ensure that all slots have values (default to 'None' if empty)
                    for (const slot of [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]) {
                        const varName = botManager.getVarName(slot);
                        let value = botManager.getGlobalVariable(varName);

                        if (value === undefined || value === null || value === '') {
                            value = 'None';
                            botManager.setGlobalVariable(varName, value);
                            botManager.currentValues[slot] = value;
                        }
                    }
                }
                if (userManager) {
                    // Reload the outfit data to ensure latest values are in place
                    await userManager.loadOutfit();
                    // Ensure that all slots have values (default to 'None' if empty)
                    for (const slot of [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]) {
                        const varName = userManager.getVarName(slot);
                        let value = userManager.getGlobalVariable(varName);

                        if (value === undefined || value === null || value === '') {
                            value = 'None';
                            userManager.setGlobalVariable(varName, value);
                            userManager.currentValues[slot] = value;
                        }
                    }
                }
                
                // Force update the panels to show the latest values after loading
                if (botPanel.renderContent) {
                    botPanel.renderContent();
                }
                if (userPanel.renderContent) {
                    userPanel.renderContent();
                }
            }, 150); // Slightly longer delay to ensure instance loading completes

            // Final attempt to ensure the values are properly populated
            if (botManager && botPanel) {
                // Load the outfit data one more time and update the panel
                await botManager.loadOutfit();
                if (botPanel.renderContent) {
                    botPanel.renderContent();
                }
            }
            if (userManager && userPanel) {
                // Load the outfit data one more time and update the panel
                await userManager.loadOutfit();
                if (userPanel.renderContent) {
                    userPanel.renderContent();
                }
            }
        } catch (error) {
            console.error('[OutfitTracker] Error updating for current character:', error);
        }
    }

    // Function to detect if the user is on a mobile device
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 768 || // Common mobile breakpoint
            ('ontouchstart' in window) || // Has touch capabilities
            (navigator.maxTouchPoints > 1); // Has multiple touch points
    }
    
    function initSettings() {
        const MODULE_NAME = 'outfit_tracker';

        if (!extension_settings[MODULE_NAME]) {
            extension_settings[MODULE_NAME] = {
                autoOpenBot: true,
                autoOpenUser: false,
                position: 'right',
                enableSysMessages: true,
                autoOutfitSystem: false,
                autoOutfitPrompt: AutoOutfitSystem.name !== 'DummyAutoOutfitSystem'
                    ? new AutoOutfitSystem().getDefaultPrompt()
                    : '',
                autoOutfitConnectionProfile: null, // Added connection profile setting
                presets: {
                    bot: {},
                    user: {}
                },
                // Default color settings
                botPanelColors: {
                    primary: 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)',
                    border: '#8a7fdb',
                    shadow: 'rgba(106, 79, 193, 0.4)'
                },
                userPanelColors: {
                    primary: 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)',
                    border: '#5da6f0',
                    shadow: 'rgba(26, 120, 209, 0.4)'
                }
            };
        }

        // Ensure variables.global exists for storing outfit data
        if (!extension_settings.variables) {
            extension_settings.variables = {};
        }
        if (!extension_settings.variables.global) {
            extension_settings.variables.global = {};
        }

        // Only initialize auto outfit system if it loaded successfully
        if (AutoOutfitSystem.name !== 'DummyAutoOutfitSystem') {
            if (extension_settings[MODULE_NAME].autoOutfitPrompt) {
                window.autoOutfitSystem.setPrompt(extension_settings[MODULE_NAME].autoOutfitPrompt);
            } else {
            // Ensure we always have a prompt
                extension_settings[MODULE_NAME].autoOutfitPrompt = window.autoOutfitSystem.systemPrompt;
            }

            // Set the connection profile if it exists
            if (extension_settings[MODULE_NAME].autoOutfitConnectionProfile) {
                window.autoOutfitSystem.setConnectionProfile(extension_settings[MODULE_NAME].autoOutfitConnectionProfile);
            }

            if (extension_settings[MODULE_NAME].autoOutfitSystem) {
                window.autoOutfitSystem.enable();
            }
        }
    }
    
    // Initialize settings
    initSettings();
    
    // Register slash commands
    const { registerOutfitCommands } = await import('./OutfitCommands.js');

    registerOutfitCommands(importOutfitFromCharacterCard, botManager, userManager, autoOutfitSystem, CLOTHING_SLOTS, ACCESSORY_SLOTS);

    // Setup event listeners
    const { setupEventListeners } = await import('./EventSystem.js');

    setupEventListeners(botManager, userManager, botPanel, userPanel, autoOutfitSystem, updateForCurrentCharacter, CLOTHING_SLOTS, ACCESSORY_SLOTS);

    // Create settings UI
    const { createSettingsUI } = await import('./SettingsUI.js');

    createSettingsUI(AutoOutfitSystem, autoOutfitSystem);

    // Apply color settings to panels if they are visible
    updatePanelStyles();

    // Auto-open panels only if not on mobile device
    if (extension_settings[MODULE_NAME].autoOpenBot && !isMobileDevice()) {
        setTimeout(() => botPanel.show(), 1000);
    }

    if (extension_settings[MODULE_NAME].autoOpenUser && !isMobileDevice()) {
        setTimeout(() => userPanel.show(), 1000);
    }

    // Also apply colors when panels are created later
    // This ensures colors are applied even if panels are opened after initial load
    setTimeout(() => {
        updatePanelStyles();
    }, 1500); // Slightly longer than panel show timeout to ensure they're created

    // Define the global interceptor function for outfit information injection
    globalThis.outfitTrackerInterceptor = async function(chat, contextSize, abort, type) {
        try {
            // Only inject outfit info if not in a system message context
            if (type && (type === 'system' || type.includes('system'))) {
                return chat;
            }

            // Get outfit information that should be injected
            const outfitInfo = getOutfitInfoString();

            if (outfitInfo && outfitInfo.trim()) {
                // Replace macros in the outfit info text
                const processedOutfitInfo = replaceOutfitMacrosInText(outfitInfo);

                // If processed outfit info is empty (all values are 'None' or empty), skip injection
                // This happens when all macro replacements result in empty content
                const trimmedProcessedInfo = processedOutfitInfo && processedOutfitInfo.trim();

                if (!trimmedProcessedInfo) {
                    // All sections would be removed after macro replacement, so skip injection entirely
                    return chat;
                }

                // Create a system message containing the outfit information
                const outfitMessage = {
                    is_system: true,
                    is_user: false,
                    name: 'System',
                    send_date: new Date().toISOString(),
                    mes: trimmedProcessedInfo,
                    extra: { outfit_info: true } // Mark this message as outfit info for identification
                };

                // Remove any existing outfit info messages to prevent duplicates
                // This is important to allow updates to the outfit
                for (let i = chat.length - 1; i >= 0; i--) {
                    if (chat[i].extra && chat[i].extra.outfit_info === true) {
                        chat.splice(i, 1);
                    }
                }

                // Insert the outfit information at depth 1 (after character context)
                // This means it should come after the main character information
                // but before the current conversation messages
                let insertIndex = 0;

                // Find the right position to insert - after initial character context but before regular chat
                for (let i = 0; i < chat.length; i++) {
                    // Look for the end of initial context messages that establish character info
                    // These are typically system messages or messages related to character info
                    if (chat[i].is_system || (chat[i].is_user === false && chat[i].extra?.is_context)) {
                        insertIndex = i + 1;
                    } else {
                        // Stop when we reach user messages or regular conversation
                        break;
                    }
                }

                // Insert the outfit message at the calculated position
                chat.splice(insertIndex, 0, outfitMessage);

                // Return the modified chat array
                return chat;
            }
        } catch (error) {
            console.error('Error in outfit tracker interceptor:', error);
        }

        // Return the original chat if no modifications were made
        return chat;
    };

    // Make the macro replacement function available globally
    globalThis.replaceOutfitMacrosInText = replaceOutfitMacrosInText;
}


