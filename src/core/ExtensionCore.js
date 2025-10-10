// Import modules from SillyTavern core - using 6-level parent path
import { getContext, extension_settings } from '../../../../../../scripts/extensions.js';
import { saveSettingsDebounced, converter } from '../../../../../../script.js';

// Import the extractMacros, replaceAll, safeGet functions from StringProcessor
import { extractMacros, replaceAll, safeGet } from '../utils/StringProcessor.js';
import { LLMUtility } from '../utils/LLMUtility.js';

// Import our new macro processor
import { customMacroSystem } from '../utils/CustomMacroSystem.js';

// Import our new store
import { outfitStore } from '../common/Store.js';

// Import the new managers and panels
import { NewBotOutfitManager } from '../managers/NewBotOutfitManager.js';
import { BotOutfitPanel } from '../panels/BotOutfitPanel.js';
import { NewUserOutfitManager } from '../managers/NewUserOutfitManager.js';
import { UserOutfitPanel } from '../panels/UserOutfitPanel.js';
import { setupEventListeners } from './EventSystem.js';
import { generateInstanceIdFromText } from '../utils/utility.js';


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

    const botManager = new NewBotOutfitManager([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
    const userManager = new NewUserOutfitManager([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
    const botPanel = new BotOutfitPanel(botManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, saveSettingsDebounced);
    const userPanel = new UserOutfitPanel(userManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, saveSettingsDebounced);
    const autoOutfitSystem = new AutoOutfitSystem(botManager);



    // Store panels globally for access in other functions
    window.botOutfitPanel = botPanel;
    window.userOutfitPanel = userPanel;
    window.autoOutfitSystem = autoOutfitSystem;

    // Register panels with the store for state management
    outfitStore.setPanelRef('bot', botPanel);
    outfitStore.setPanelRef('user', userPanel);
    outfitStore.setAutoOutfitSystem(autoOutfitSystem);

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



    // Define a function to replace outfit-related macros in text using the new custom macro system
    function replaceOutfitMacrosInText(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        // Use the new macro processor to handle all outfit-related macros
        // This includes {{char_slot}}, {{user_slot}}, {{user}}, and {{char}}
        return customMacroSystem.replaceMacrosInText(text);
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
        
        // Also update from the store references
        const botPanelFromStore = outfitStore.getPanelRef('bot');
        const userPanelFromStore = outfitStore.getPanelRef('user');
        
        if (botPanelFromStore && botPanelFromStore !== window.botOutfitPanel && botPanelFromStore.domElement) {
            botPanelFromStore.applyPanelColors();
        }
        
        if (userPanelFromStore && userPanelFromStore !== window.userOutfitPanel && userPanelFromStore.domElement) {
            userPanelFromStore.applyPanelColors();
        }
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
            
            // Clear all preset data in extension settings
            if (window.extension_settings?.outfit_tracker?.presets) {
                window.extension_settings.outfit_tracker.presets = {
                    bot: {},
                    user: {}
                };
            }
            
            // Clear all instance data in extension settings
            if (window.extension_settings?.outfit_tracker?.instances) {
                window.extension_settings.outfit_tracker.instances = {};
            }
            if (window.extension_settings?.outfit_tracker?.user_instances) {
                window.extension_settings.outfit_tracker.user_instances = {};
            }
            
            // Clear all outfit data in the centralized store
            // Reset bot outfit instances
            outfitStore.setState({
                ...outfitStore.getState(),
                botInstances: {},
                userInstances: {},
                presets: {
                    bot: {},
                    user: {}
                }
            });
            
            // Clear current outfit instance data in managers if they exist
            if (window.botOutfitManager) {
                // Reset all slots to 'None' for the current instance
                const slots = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];

                for (const slot of slots) {
                    window.botOutfitManager.currentValues[slot] = 'None';
                }
                // Save the cleared outfit to ensure it's persisted
                await window.botOutfitManager.saveOutfit();
            }
            
            if (window.userOutfitManager) {
                // Reset all slots to 'None' for the current instance
                const slots = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];

                for (const slot of slots) {
                    window.userOutfitManager.currentValues[slot] = 'None';
                }
                // Save the cleared outfit to ensure it's persisted
                await window.userOutfitManager.saveOutfit();
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
            
            // Clear global instance pointer
            window.currentBotOutfitInstance = null;
            
            // Save the cleared state to ensure persistence
            outfitStore.saveSettings();
            
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

    function getOutfitInfoString() {
        return customMacroSystem.generateOutfitInfoString(botManager, userManager);
    }
    
    async function updateForCurrentCharacter() {
        try {
            const context = getContext();

            if (!context || !context.characters || context.characterId === undefined || context.characterId === null) {
                botManager.setCharacter('Unknown', null);
                botPanel.updateCharacter('Unknown');
                return;
            }

            const character = context.characters[context.characterId];

            if (!character) {
                botManager.setCharacter('Unknown', null);
                botPanel.updateCharacter('Unknown');
                return;
            }

            const charName = character.name || 'Unknown';

            console.log(`[OutfitTracker] Updating character to: ${charName} (ID: ${context.characterId})`);

            const aiMessages = context.chat ? context.chat.filter(msg => !msg.is_user && !msg.is_system) : [];
            let instanceId;
            let firstMessageText = '';

            if (aiMessages.length > 0) {
                // If chat history exists, the instance ID is based on the first AI message in the chat.
                // This correctly handles scenarios like message swiping where the first message changes.
                const firstMessage = aiMessages[0];

                if (firstMessage.swipes && firstMessage.swipes.length > firstMessage.swipe_id) {
                    firstMessageText = firstMessage.swipes[firstMessage.swipe_id] || '';
                } else {
                    firstMessageText = firstMessage.mes || '';
                }
            } else if (character.first_message) {
                // If chat history is empty (e.g., on chat reset), use the character's defined first_message.
                // CRUCIALLY, we use the raw, un-expanded text to ensure the generated ID is stable and consistent,
                // as expanding macros at this stage can lead to using stale variable data.
                firstMessageText = character.first_message;
            }

            if (firstMessageText) {
                instanceId = await generateInstanceIdFromText(firstMessageText);
            } else {
                // As a last resort (e.g., new character with no first message), create a temporary ID.
                console.log('[OutfitTracker] No first message found in chat or character definition. Using temporary instance ID.');
                instanceId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            botManager.setCharacter(charName, context.characterId);
            botManager.setOutfitInstanceId(instanceId);
            await botManager.loadOutfit();
            botPanel.updateCharacter(charName);

            userManager.setOutfitInstanceId(instanceId);
            await userManager.loadOutfit();
            userPanel.updateHeader();

            botPanel.renderContent();
            userPanel.renderContent();


        } catch (error) {
            console.error('[OutfitTracker] Error updating for current character:', error);
        }
    }

    // Function to migrate old outfit data format to new instance-based format
    function migrateOldOutfitData() {
        try {
            console.log('[OutfitTracker] Starting migration of old outfit data to new format...');
            
            // Initialize the instances structure if it doesn't exist
            if (!window.extension_settings.outfit_tracker.instances) {
                window.extension_settings.outfit_tracker.instances = {};
            }
            
            if (!window.extension_settings.outfit_tracker.user_instances) {
                window.extension_settings.outfit_tracker.user_instances = {};
            }
            
            const globalVars = window.extension_settings.variables.global || {};
            
            // Find all old outfit variables that match the old format
            const oldBotPattern = /^([A-Za-z0-9_]+)_(headwear|topwear|topunderwear|bottomwear|bottomunderwear|footwear|footunderwear|head-accessory|ears-accessory|eyes-accessory|mouth-accessory|neck-accessory|body-accessory|arms-accessory|hands-accessory|waist-accessory|bottom-accessory|legs-accessory|foot-accessory)$/;
            const oldInstancePattern = /^OUTFIT_INST_[A-Za-z0-9_]+_([A-Za-z0-9_]+)_(headwear|topwear|topunderwear|bottomwear|bottomunderwear|footwear|footunderwear|head-accessory|ears-accessory|eyes-accessory|mouth-accessory|neck-accessory|body-accessory|arms-accessory|hands-accessory|waist-accessory|bottom-accessory|legs-accessory|foot-accessory)$/;
            
            // Process bot outfit variables in old format: characterName_slot
            for (const [varName, value] of Object.entries(globalVars)) {
                const botMatch = varName.match(oldBotPattern);

                if (botMatch) {
                    const characterName = botMatch[1];
                    const slot = botMatch[2];
                    
                    // For now, assign to a default instance for this character
                    // In a real scenario, we'd need to figure out which character ID this corresponds to
                    // For this migration, use a default instance ID
                    const instanceId = 'default_migration';
                    
                    if (!window.extension_settings.outfit_tracker.instances[characterName]) {
                        window.extension_settings.outfit_tracker.instances[characterName] = {};
                    }
                    
                    if (!window.extension_settings.outfit_tracker.instances[characterName][instanceId]) {
                        window.extension_settings.outfit_tracker.instances[characterName][instanceId] = { bot: {}, user: {} };
                    }
                    
                    window.extension_settings.outfit_tracker.instances[characterName][instanceId].bot[slot] = value;
                    console.log(`[OutfitTracker] Migrated bot outfit ${varName} to ${characterName}.${instanceId}.${slot} = ${value}`);
                }
                
                // Process instance-specific bot variables: OUTFIT_INST_charId_instanceId_slot
                const instanceMatch = varName.match(oldInstancePattern);

                if (instanceMatch) {
                    const instanceId = instanceMatch[1];
                    const slot = instanceMatch[2];
                    
                    // Extract character ID from the variable name
                    // Format is OUTFIT_INST_[charId]_[instanceId]_[slot]
                    const parts = varName.split('_');

                    if (parts.length >= 4) {
                        const charId = parts[2]; // After OUTFIT, INST
                        
                        if (!window.extension_settings.outfit_tracker.instances[charId]) {
                            window.extension_settings.outfit_tracker.instances[charId] = {};
                        }
                        
                        if (!window.extension_settings.outfit_tracker.instances[charId][instanceId]) {
                            window.extension_settings.outfit_tracker.instances[charId][instanceId] = { bot: {}, user: {} };
                        }
                        
                        window.extension_settings.outfit_tracker.instances[charId][instanceId].bot[slot] = value;
                        console.log(`[OutfitTracker] Migrated bot instance outfit ${varName} to ${charId}.${instanceId}.${slot} = ${value}`);
                    }
                }
                
                // Process user outfit variables: User_slot or OUTFIT_INST_USER_slot
                if (varName.startsWith('User_') || varName.startsWith('OUTFIT_INST_USER_')) {
                    const slot = varName.startsWith('User_') ? varName.substring(5) : varName.substring(16); // 16 is length of 'OUTFIT_INST_USER_'
                    
                    const userInstanceId = 'default_migration';
                    
                    if (!window.extension_settings.outfit_tracker.user_instances[userInstanceId]) {
                        window.extension_settings.outfit_tracker.user_instances[userInstanceId] = {};
                    }
                    
                    window.extension_settings.outfit_tracker.user_instances[userInstanceId][slot] = value;
                    console.log(`[OutfitTracker] Migrated user outfit ${varName} to user.${userInstanceId}.${slot} = ${value}`);
                }
            }
            
            console.log('[OutfitTracker] Migration completed.');
        } catch (error) {
            console.error('[OutfitTracker] Error during migration:', error);
        }
    }
    
    // Run migration when initializing
    migrateOldOutfitData();
    
    // Function to detect if the user is on a mobile device
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 768 || // Common mobile breakpoint
            ('ontouchstart' in window) || // Has touch capabilities
            (navigator.maxTouchPoints > 1); // Has multiple touch points
    }
    
    function initSettings() {
        const MODULE_NAME = 'outfit_tracker';

        // Initialize extension settings if not present
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
                // New structure for instance-based storage
                instances: {},
                user_instances: {},
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

        // Load data from settings for reload persistence
        outfitStore.loadDataFromSettings();

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

    // Function to process macros in the first message of a chat
    function processMacrosInFirstMessage() {
        try {
            const context = getContext();

            if (context && context.chat) {
                const firstBotMessage = context.chat.find(message => !message.is_user && !message.is_system);

                if (firstBotMessage) {
                    // Replace macros in the first bot message
                    firstBotMessage.mes = replaceOutfitMacrosInText(firstBotMessage.mes);
                }
            }
        } catch (error) {
            console.error('[OutfitTracker] Error processing macros in first message:', error);
        }
    }

    // Setup event listeners
    setupEventListeners(botManager, userManager, botPanel, userPanel, autoOutfitSystem, updateForCurrentCharacter, converter, processMacrosInFirstMessage);


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

    // Monkey-patch the global replaceMacros function to include our custom macro replacement
    if (window.replaceMacros) {
        const originalReplaceMacros = window.replaceMacros;

        window.replaceMacros = function(text, isSystem) {
            // Call the original function first
            let processedText = originalReplaceMacros(text, isSystem);

            // Then, call our custom macro replacement function
            processedText = replaceOutfitMacrosInText(processedText);
            return processedText;
        };
        // Store the original function for cleanup
        window._originalReplaceMacros = originalReplaceMacros;
    }
    
    // Make the status indicators function available globally
    globalThis.getOutfitExtensionStatus = function() {
        const status = {
            core: Boolean(window.botOutfitPanel && window.userOutfitPanel && window.extension_settings?.outfit_tracker),
            autoOutfit: window.autoOutfitSystem ? window.autoOutfitSystem.getStatus() : null,
            botPanel: window.botOutfitPanel ? { isVisible: window.botOutfitPanel.isVisible } : null,
            userPanel: window.userOutfitPanel ? { isVisible: window.userOutfitPanel.isVisible } : null,
            events: Boolean(window.getContext && window.getContext()?.eventSource),
            managers: Boolean(window.botOutfitPanel?.outfitManager && window.userOutfitPanel?.outfitManager)
        };

        return status;
    };
    
}

// Cleanup function to remove global variables and event listeners
function cleanupExtension() {
    console.log('[OutfitTracker] Starting extension cleanup...');
    
    try {
        // Remove DOM elements but preserve outfit data in extension settings
        if (window.botOutfitPanel) {
            if (window.botOutfitPanel.domElement && window.botOutfitPanel.domElement.parentNode) {
                window.botOutfitPanel.domElement.parentNode.removeChild(window.botOutfitPanel.domElement);
            }
            window.botOutfitPanel = null;
            
            // Also clear reference in store
            outfitStore.setPanelRef('bot', null);
        }
        
        if (window.userOutfitPanel) {
            if (window.userOutfitPanel.domElement && window.userOutfitPanel.domElement.parentNode) {
                window.userOutfitPanel.domElement.parentNode.removeChild(window.userOutfitPanel.domElement);
            }
            window.userOutfitPanel = null;
            
            // Also clear reference in store
            outfitStore.setPanelRef('user', null);
        }
        
        if (window.autoOutfitSystem && typeof window.autoOutfitSystem.removeEventListeners === 'function') {
            window.autoOutfitSystem.removeEventListeners();
            
            // Clear reference in store
            outfitStore.setAutoOutfitSystem(null);
        }
        
        // Only remove global functions, but keep outfit data in extension_settings
        if (globalThis.outfitTrackerInterceptor) {
            delete globalThis.outfitTrackerInterceptor;
        }
        
        // Restore the original replaceMacros function if we monkey-patched it
        if (window._originalReplaceMacros) {
            window.replaceMacros = window._originalReplaceMacros;
            delete window._originalReplaceMacros;
        }

        if (globalThis.replaceOutfitMacrosInText) {
            delete globalThis.replaceOutfitMacrosInText;
        }
        
        if (globalThis.wipeAllOutfits) {
            delete globalThis.wipeAllOutfits;
        }
        
        // Remove event listener override for clearChat if we set it
        if (window._originalClearChat) {
            window.clearChat = window._originalClearChat;
            window._originalClearChat = null;
        }
        
        console.log('[OutfitTracker] Extension cleanup completed. Outfit data preserved in extension settings.');
    } catch (error) {
        console.error('[OutfitTracker] Error during extension cleanup:', error);
    }
}
