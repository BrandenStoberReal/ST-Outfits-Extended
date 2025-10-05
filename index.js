// Import modules from SillyTavern core - these are expected to be available when installed correctly
import { getContext, extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";
import { SlashCommand } from "../../../slash-commands/SlashCommand.js";
import { SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } from "../../../slash-commands/SlashCommandArgument.js";

// Import the extractMacros and replaceAll functions from StringProcessor
import { extractMacros, replaceAll } from "./src/StringProcessor.js";

// Define global variables that might not be imported directly
// power_user and user_avatar are typically available globally in SillyTavern

console.log("[OutfitTracker] Starting extension loading...");

async function initializeExtension() {
    // Make sure these are available globally for child modules
    // This allows dynamically imported modules to access them
    window.getContext = getContext;
    window.extension_settings = extension_settings;
    window.saveSettingsDebounced = saveSettingsDebounced;
    window.SlashCommandParser = SlashCommandParser;
    window.SlashCommand = SlashCommand;
    window.SlashCommandArgument = SlashCommandArgument;
    window.SlashCommandNamedArgument = SlashCommandNamedArgument;
    window.ARGUMENT_TYPE = ARGUMENT_TYPE;

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

    const { BotOutfitManager } = await import("./src/BotOutfitManager.js");
    const { BotOutfitPanel } = await import("./src/BotOutfitPanel.js");
    const { UserOutfitManager } = await import("./src/UserOutfitManager.js");
    const { UserOutfitPanel } = await import("./src/UserOutfitPanel.js");

    // Import AutoOutfitSystem with error handling
    let AutoOutfitSystem;
    try {
        const autoOutfitModule = await import("./src/AutoOutfitSystem.js");
        AutoOutfitSystem = autoOutfitModule.AutoOutfitSystem;
    } catch (error) {
        console.error("[OutfitTracker] Failed to load AutoOutfitSystem:", error);
        // Create a dummy class if AutoOutfitSystem fails to load
        AutoOutfitSystem = class DummyAutoOutfitSystem {
            constructor() { this.isEnabled = false; }
            enable() { return '[Outfit System] Auto outfit system not available'; }
            disable() { return '[Outfit System] Auto outfit system not available'; }
            setPrompt() { return '[Outfit System] Auto outfit system not available'; }
            resetToDefaultPrompt() { return '[Outfit System] Auto outfit system not available'; }
            getStatus() { return { enabled: false, hasPrompt: false }; }
            manualTrigger() { this.showPopup('Auto outfit system not available', 'error'); }
            showPopup() {}
        };
    }

    const botManager = new BotOutfitManager([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
    const userManager = new UserOutfitManager([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
    const botPanel = new BotOutfitPanel(botManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, saveSettingsDebounced);
    const userPanel = new UserOutfitPanel(userManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, saveSettingsDebounced);
    const autoOutfitSystem = new AutoOutfitSystem(botManager);

    // Store panels globally for access in other functions
    window.botOutfitPanel = botPanel;
    window.userOutfitPanel = userPanel;
    window.autoOutfitSystem = autoOutfitSystem;

    function registerOutfitCommands() {
        // Register basic outfit commands using new SlashCommandParser format
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'outfit-bot',
            callback: async function (args, value) {
                console.log("Bot Outfit command triggered");
                botPanel.toggle();
                const isQuiet = args?.quiet === true;
                if (!isQuiet) {
                    toastr.info('Toggled character outfit panel', 'Outfit System');
                }
                return '';
            },
            returns: 'toggles the character outfit panel',
            namedArgumentList: [
                SlashCommandNamedArgument.fromProps({
                    name: 'quiet',
                    description: 'Suppress the toast message',
                    typeList: [ARGUMENT_TYPE.BOOLEAN],
                    defaultValue: 'false',
                }),
            ],
            unnamedArgumentList: [],
            helpString: `
                <div>
                    Toggles the character outfit tracker panel.
                </div>
                <div>
                    <strong>Options:</strong>
                    <ul>
                        <li><code>-quiet</code> - Suppress the toast message</li>
                    </ul>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-bot</code></pre>
                            Toggles the character outfit panel
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-bot -quiet</code></pre>
                            Toggles the character outfit panel without notification
                        </li>
                    </ul>
                </div>
            `,
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'outfit-user',
            callback: async function (args, value) {
                console.log("User Outfit command triggered");
                userPanel.toggle();
                const isQuiet = args?.quiet === true;
                if (!isQuiet) {
                    toastr.info('Toggled user outfit panel', 'Outfit System');
                }
                return '';
            },
            returns: 'toggles the user outfit panel',
            namedArgumentList: [
                SlashCommandNamedArgument.fromProps({
                    name: 'quiet',
                    description: 'Suppress the toast message',
                    typeList: [ARGUMENT_TYPE.BOOLEAN],
                    defaultValue: 'false',
                }),
            ],
            unnamedArgumentList: [],
            helpString: `
                <div>
                    Toggles the user outfit tracker panel.
                </div>
                <div>
                    <strong>Options:</strong>
                    <ul>
                        <li><code>-quiet</code> - Suppress the toast message</li>
                    </ul>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-user</code></pre>
                            Toggles the user outfit panel
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-user -quiet</code></pre>
                            Toggles the user outfit panel without notification
                        </li>
                    </ul>
                </div>
            `,
        }));

        // Only register auto commands if AutoOutfitSystem loaded successfully
        if (AutoOutfitSystem.name !== 'DummyAutoOutfitSystem') {
            SlashCommandParser.addCommandObject(SlashCommand.fromProps({
                name: 'outfit-auto',
                callback: async function (args, value) {
                    const arg = value?.toString().toLowerCase() || '';
                    const isQuiet = args?.quiet === true;

                    if (arg === 'on') {
                        const message = autoOutfitSystem.enable();
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } else if (arg === 'off') {
                        const message = autoOutfitSystem.disable();
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } else {
                        const status = autoOutfitSystem.getStatus();
                        const statusMessage = `Auto outfit: ${status.enabled ? 'ON' : 'OFF'}\nPrompt: ${status.hasPrompt ? 'SET' : 'NOT SET'}`;
                        if (!isQuiet) {
                            toastr.info(statusMessage);
                        }
                        return statusMessage;
                    }
                },
                returns: 'toggles auto outfit updates',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'whether to enable or disable auto outfit updates',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: false,
                        enumList: ['on', 'off'],
                    }),
                ],
                helpString: `
                    <div>
                        Toggle auto outfit updates (on/off).
                    </div>
                    <div>
                        <strong>Options:</strong>
                        <ul>
                            <li><code>-quiet</code> - Suppress the toast message</li>
                        </ul>
                    </div>
                    <div>
                        <strong>Example:</strong>
                        <ul>
                            <li>
                                <pre><code class="language-stscript">/outfit-auto on</code></pre>
                                Enables auto outfit updates
                            </li>
                            <li>
                                <pre><code class="language-stscript">/outfit-auto off</code></pre>
                                Disables auto outfit updates
                            </li>
                            <li>
                                <pre><code class="language-stscript">/outfit-auto</code></pre>
                                Shows current status
                            </li>
                            <li>
                                <pre><code class="language-stscript">/outfit-auto on -quiet</code></pre>
                                Enables auto outfit updates without notification
                            </li>
                        </ul>
                    </div>
                `,
            }));

            SlashCommandParser.addCommandObject(SlashCommand.fromProps({
                name: 'outfit-prompt',
                callback: async function (args, value) {
                    const prompt = value?.toString() || '';
                    if (prompt) {
                        const message = autoOutfitSystem.setPrompt(prompt);
                        if (extension_settings.outfit_tracker?.enableSysMessages) {
                            botPanel.sendSystemMessage(message);
                        }
                        return message;
                    } else {
                        const length = autoOutfitSystem.systemPrompt?.length || 0;
                        toastr.info(`Current prompt length: ${length}`);
                        return `Current prompt length: ${length}`;
                    }
                },
                returns: 'sets or shows the auto outfit system prompt',
                namedArgumentList: [],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'the new system prompt for auto outfit detection',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: false,
                    }),
                ],
                helpString: `
                    <div>
                        Set auto outfit system prompt.
                    </div>
                    <div>
                        <strong>Example:</strong>
                        <ul>
                            <li>
                                <pre><code class="language-stscript">/outfit-prompt Detect changes in clothing based on dialogue and narrative</code></pre>
                                Sets the auto outfit system prompt
                            </li>
                            <li>
                                <pre><code class="language-stscript">/outfit-prompt</code></pre>
                                Shows current prompt length
                            </li>
                        </ul>
                    </div>
                `,
            }));

            SlashCommandParser.addCommandObject(SlashCommand.fromProps({
                name: 'outfit-prompt-reset',
                callback: async function (args, value) {
                    const message = autoOutfitSystem.resetToDefaultPrompt();
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        botPanel.sendSystemMessage(message);
                    }
                    // Update the textarea in settings
                    $("#outfit-prompt-input").val(autoOutfitSystem.systemPrompt);
                    extension_settings[MODULE_NAME].autoOutfitPrompt = autoOutfitSystem.systemPrompt;
                    saveSettingsDebounced();
                    return message;
                },
                returns: 'resets to default system prompt',
                namedArgumentList: [],
                unnamedArgumentList: [],
                helpString: `
                    <div>
                        Reset to default system prompt.
                    </div>
                    <div>
                        <strong>Example:</strong>
                        <ul>
                            <li>
                                <pre><code class="language-stscript">/outfit-prompt-reset</code></pre>
                                Resets to default system prompt
                            </li>
                        </ul>
                    </div>
                `,
            }));

            SlashCommandParser.addCommandObject(SlashCommand.fromProps({
                name: 'outfit-prompt-view',
                callback: async function (args, value) {
                    const status = autoOutfitSystem.getStatus();
                    const preview = autoOutfitSystem.systemPrompt.length > 100
                        ? autoOutfitSystem.systemPrompt.substring(0, 100) + '...'
                        : autoOutfitSystem.systemPrompt;

                    const message = `Prompt preview: ${preview}\n\nFull length: ${status.promptLength} chars`;
                    toastr.info(message, 'Current System Prompt', {
                        timeOut: 10000,
                        extendedTimeOut: 20000
                    });
                    return message;
                },
                returns: 'shows current system prompt',
                namedArgumentList: [],
                unnamedArgumentList: [],
                helpString: `
                    <div>
                        View current system prompt.
                    </div>
                    <div>
                        <strong>Example:</strong>
                        <ul>
                            <li>
                                <pre><code class="language-stscript">/outfit-prompt-view</code></pre>
                                Shows current system prompt
                            </li>
                        </ul>
                    </div>
                `,
            }));

            SlashCommandParser.addCommandObject(SlashCommand.fromProps({
                name: 'outfit-auto-trigger',
                callback: async function (args, value) {
                    const result = await autoOutfitSystem.manualTrigger();
                    toastr.info(result, 'Manual Outfit Check');
                    return result;
                },
                returns: 'manually trigger auto outfit check',
                namedArgumentList: [],
                unnamedArgumentList: [],
                helpString: `
                    <div>
                        Manually trigger auto outfit check.
                    </div>
                    <div>
                        <strong>Example:</strong>
                        <ul>
                            <li>
                                <pre><code class="language-stscript">/outfit-auto-trigger</code></pre>
                                Manually triggers auto outfit check
                            </li>
                        </ul>
                    </div>
                `,
            }));
        }

        // Register the switch-outfit command
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'switch-outfit',
            callback: async function (args, value) {
                const outfitName = value?.toString().trim() || '';
                const isQuiet = args?.quiet === true;

                if (!outfitName) {
                    const warning = 'Please specify an outfit name. Usage: /switch-outfit <outfit-name>';
                    if (!isQuiet) {
                        toastr.warning(warning, 'Outfit System');
                    }
                    return warning;
                }

                try {
                    // First try to load the outfit for the bot character
                    let message = await botManager.loadPreset(outfitName);
                    if (message.includes('not found')) {
                        // If not found for bot, try loading default outfit if requested
                        if (outfitName.toLowerCase() === 'default') {
                            message = await botManager.loadDefaultOutfit();
                        }
                    }

                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        botPanel.sendSystemMessage(message);
                    }

                    // Also try to load the outfit for the user if it exists
                    let userMessage = await userManager.loadPreset(outfitName);
                    if (userMessage.includes('not found')) {
                        // If not found for user, try loading default outfit if requested
                        if (outfitName.toLowerCase() === 'default') {
                            userMessage = await userManager.loadDefaultOutfit();
                        }
                    }

                    if (extension_settings.outfit_tracker?.enableSysMessages && userMessage && !userMessage.includes('not found')) {
                        userPanel.sendSystemMessage(userMessage);
                    }

                    if (message.includes('not found') && (userMessage && userMessage.includes('not found'))) {
                        const error = `Outfit "${outfitName}" not found for either character or user.`;
                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    } else {
                        const success = `Switched to "${outfitName}" outfit.`;
                        if (!isQuiet) {
                            toastr.info(success, 'Outfit System');
                        }
                        return success;
                    }
                } catch (error) {
                    console.error('Error switching outfit:', error);
                    const error_msg = `Error switching to "${outfitName}" outfit.`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'switches to a saved outfit by name',
            namedArgumentList: [
                SlashCommandNamedArgument.fromProps({
                    name: 'quiet',
                    description: 'Suppress the toast message',
                    typeList: [ARGUMENT_TYPE.BOOLEAN],
                    defaultValue: 'false',
                }),
            ],
            unnamedArgumentList: [
                SlashCommandArgument.fromProps({
                    description: 'the name of the outfit to switch to',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Switch to a saved outfit by name. Usage: /switch-outfit <outfit-name>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/switch-outfit casual</code></pre>
                            Switches to "casual" outfit
                        </li>
                        <li>
                            <pre><code class="language-stscript">/switch-outfit formal</code></pre>
                            Switches to "formal" outfit
                        </li>
                    </ul>
                </div>
            `,
        }));
    }

    function updateForCurrentCharacter() {
        const context = getContext();

        // Check if context is ready before trying to access character data
        if (!context || !context.characters || context.characterId === undefined || context.characterId === null) {
            console.log("[OutfitTracker] Context not ready or no character selected, setting as Unknown");
            botManager.setCharacter('Unknown');
            botPanel.updateCharacter('Unknown');
            return;
        }

        // Make sure the character exists in the characters array
        const character = context.characters[context.characterId];
        if (!character) {
            console.log("[OutfitTracker] Character not found at index " + context.characterId + ", setting as Unknown");
            botManager.setCharacter('Unknown');
            botPanel.updateCharacter('Unknown');
            return;
        }

        const charName = character.name || 'Unknown';
        console.log("[OutfitTracker] Updating character to: " + charName + " (ID: " + context.characterId + ")");
        botManager.setCharacter(charName);
        botPanel.updateCharacter(charName);

        // Make sure the panel renders the content with the new character name
        if (botPanel.isVisible && !botPanel.isMinimized) {
            botPanel.renderContent();
        }
    }

    // Format the outfit info according to the required format
    function getOutfitInfoString() {
        // Get current outfit data from the bot manager
        const botOutfitData = botManager.getOutfitData([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
        const userOutfitData = userManager.getOutfitData([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);

        let outfitInfo = '';

        // Check if bot has any non-empty clothing items before adding the bot clothing section
        const botHasClothing = botOutfitData.some(data => 
            CLOTHING_SLOTS.includes(data.name) && data.value !== 'None' && data.value !== ''
        );

        if (botHasClothing) {
            outfitInfo += `\n**<BOT>'s Current Outfit**\n`;

            // Add clothing info
            CLOTHING_SLOTS.forEach(slot => {
                const slotData = botOutfitData.find(data => data.name === slot);
                if (slotData) {
                    const formattedSlotName = slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.charAt(0).toUpperCase()).replace('underwear', 'Underwear');
                    outfitInfo += `**${formattedSlotName}:** {{getglobalvar::<BOT>_${slotData.name}}}\n`;
                }
            });
        }

        // Check if bot has any non-empty accessories before adding the accessories section
        const botHasAccessories = botOutfitData.some(data => 
            ACCESSORY_SLOTS.includes(data.name) && data.value !== 'None' && data.value !== ''
        );
        
        if (botHasAccessories) {
            outfitInfo += `\n**<BOT>'s Current Accessories**\n`;

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
                    outfitInfo += `**${formattedSlotName}:** {{getglobalvar::<BOT>_${slotData.name}}}\n`;
                }
            });
        }

        // Check if user has any non-empty clothing items before adding the user clothing section
        const userHasClothing = userOutfitData.some(data => 
            CLOTHING_SLOTS.includes(data.name) && data.value !== 'None' && data.value !== ''
        );

        if (userHasClothing) {
            outfitInfo += `\n**{{user}}'s Current Outfit**\n`;

            // Add user clothing info
            CLOTHING_SLOTS.forEach(slot => {
                const slotData = userOutfitData.find(data => data.name === slot);
                if (slotData) {
                    const formattedSlotName = slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.charAt(0).toUpperCase()).replace('underwear', 'Underwear');
                    outfitInfo += `**${formattedSlotName}:** {{getglobalvar::User_${slotData.name}}}\n`;
                }
            });
        }

        // Check if user has any non-empty accessories before adding the accessories section
        const userHasAccessories = userOutfitData.some(data => 
            ACCESSORY_SLOTS.includes(data.name) && data.value !== 'None' && data.value !== ''
        );
        
        if (userHasAccessories) {
            outfitInfo += `\n**{{user}}'s Current Accessories**\n`;

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
                    outfitInfo += `**${formattedSlotName}:** {{getglobalvar::User_${slotData.name}}}\n`;
                }
            });
        }

        return outfitInfo;
    }

    // Helper function to initialize all outfit slots to "None" when no default exists
    async function initializeOutfitSlotsToNone(outfitManager, outfitPanel) {
        const allSlots = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];

        for (const slot of allSlots) {
            // Check if the current value is not already "None" or empty
            if (outfitManager.currentValues[slot] !== 'None' && outfitManager.currentValues[slot] !== '') {
                // Set the slot to "None" using the manager's method
                await outfitManager.setOutfitItem(slot, 'None');
            }
        }

        console.log("[OutfitTracker] All outfit slots initialized to 'None'");
    }

    function setupEventListeners() {
        // Get the context which should have eventSource
        const context = getContext();

        // Verify that context and eventSource are available
        if (!context || !context.eventSource || !context.event_types) {
            console.warn("[OutfitTracker] Context not fully available for event listeners yet, trying again later");
            // Set up a timeout to try again in a bit
            setTimeout(() => {
                setupEventListeners();
            }, 1000);
            return;
        }

        const { eventSource, event_types } = context;

        // Listen for app ready event to mark initialization
        eventSource.on(event_types.APP_READY, () => {
            console.log("[OutfitTracker] App ready, marking auto outfit system as initialized");
            autoOutfitSystem.markAppInitialized();
            // Update the current character after app is ready to ensure context is properly initialized
            updateForCurrentCharacter();
        });

        // Listen for chat-related events since outfit states are tied to chats
        eventSource.on(event_types.CHAT_ID_CHANGED, () => {
            console.log("[OutfitTracker] CHAT_ID_CHANGED event fired");
            updateForCurrentCharacter();
        });
        eventSource.on(event_types.CHAT_CHANGED, () => {
            console.log("[OutfitTracker] CHAT_CHANGED event fired");
            updateForCurrentCharacter();
        });
        eventSource.on(event_types.CHAT_CREATED, async () => {
            console.log("[OutfitTracker] CHAT_CREATED event fired - resetting to default outfits");
            // When a new chat is created, reset outfits to default or initialize with None values
            try {
                const botMessage = await botManager.loadDefaultOutfit();
                if (botMessage && !botMessage.includes('No default outfit set')) {
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        botPanel.sendSystemMessage(botMessage);
                    }
                    console.log("[OutfitTracker] Character reset to default outfit");
                } else {
                    // If no default outfit exists, initialize all slots to "None"
                    await initializeOutfitSlotsToNone(botManager, botPanel);
                }

                const userMessage = await userManager.loadDefaultOutfit();
                if (userMessage && !userMessage.includes('No default outfit set')) {
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        userPanel.sendSystemMessage(userMessage);
                    }
                    console.log("[OutfitTracker] User reset to default outfit");
                } else {
                    // If no default outfit exists, initialize all slots to "None"
                    await initializeOutfitSlotsToNone(userManager, userPanel);
                }
            } catch (error) {
                console.error("[OutfitTracker] Error resetting to default outfit on chat creation:", error);
            }
            updateForCurrentCharacter(); // Update the character after resetting
        });

        // Hook into the clear chat functionality by overriding the clearChat function
        // This will be called when the user clears the current chat
        const originalClearChat = window.clearChat;
        window.clearChat = async function() {
            // First call the original function to clear the chat
            if (typeof originalClearChat === 'function') {
                originalClearChat.apply(this, arguments);
            } else {
                // If the original function doesn't exist, manually clear the chat
                // Get the current chat and clear it
                const context = getContext();
                if (context.chat && Array.isArray(context.chat)) {
                    context.chat = [];
                    // Update the UI to reflect the cleared chat
                    if (typeof updateChatOutput === 'function') {
                        updateChatOutput();
                    }
                }
            }

            // Then reset outfits to default if available
            setTimeout(async () => {
                try {
                    // Reset bot outfit to default if available
                    const botMessage = await botManager.loadDefaultOutfit();
                    if (botMessage && !botMessage.includes('No default outfit set')) {
                        if (extension_settings.outfit_tracker?.enableSysMessages) {
                            botPanel.sendSystemMessage(botMessage);
                        }
                        console.log("[OutfitTracker] Character reset to default outfit");
                    } else {
                        // If no default outfit exists, initialize all slots to "None"
                        await initializeOutfitSlotsToNone(botManager, botPanel);
                    }

                    // Reset user outfit to default if available
                    const userMessage = await userManager.loadDefaultOutfit();
                    if (userMessage && !userMessage.includes('No default outfit set')) {
                        if (extension_settings.outfit_tracker?.enableSysMessages) {
                            userPanel.sendSystemMessage(userMessage);
                        }
                        console.log("[OutfitTracker] User reset to default outfit");
                    } else {
                        // If no default outfit exists, initialize all slots to "None"
                        await initializeOutfitSlotsToNone(userManager, userPanel);
                    }
                } catch (error) {
                    console.error("[OutfitTracker] Error resetting to default outfit:", error);
                }
            }, 100); // Small delay to ensure chat is cleared before resetting
        };
    }

    function initSettings() {
        if (!extension_settings[MODULE_NAME]) {
            extension_settings[MODULE_NAME] = {
                autoOpenBot: true,
                autoOpenUser: false,
                position: 'right',
                enableSysMessages: true,
                autoOutfitSystem: false,
                autoOutfitPrompt: AutoOutfitSystem.name !== 'DummyAutoOutfitSystem'
                    ? new AutoOutfitSystem(botManager).getDefaultPrompt()
                    : '',
                autoOutfitConnectionProfile: null, // Added connection profile setting
                presets: {
                    bot: {},
                    user: {}
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
                autoOutfitSystem.setPrompt(extension_settings[MODULE_NAME].autoOutfitPrompt);
            } else {
                // Ensure we always have a prompt
                extension_settings[MODULE_NAME].autoOutfitPrompt = autoOutfitSystem.systemPrompt;
            }

            // Set the connection profile if it exists
            if (extension_settings[MODULE_NAME].autoOutfitConnectionProfile) {
                autoOutfitSystem.setConnectionProfile(extension_settings[MODULE_NAME].autoOutfitConnectionProfile);
            }

            if (extension_settings[MODULE_NAME].autoOutfitSystem) {
                autoOutfitSystem.enable();
            }
        }
    }

    // Helper function to initialize all outfit slots to "None" when no default exists
    async function initializeOutfitSlotsToNone(outfitManager, outfitPanel) {
        const allSlots = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];

        for (const slot of allSlots) {
            // Check if the current value is not already "None" or empty
            if (outfitManager.currentValues[slot] !== 'None' && outfitManager.currentValues[slot] !== '') {
                // Set the slot to "None" using the manager's method
                await outfitManager.setOutfitItem(slot, 'None');
            }
        }

        console.log("[OutfitTracker] All outfit slots initialized to 'None'");
    }

    function createSettingsUI() {
        const hasAutoSystem = AutoOutfitSystem.name !== 'DummyAutoOutfitSystem';
        const autoSettingsHtml = hasAutoSystem ? `
            <div class="flex-container">
                <label for="outfit-auto-system">Enable auto outfit updates</label>
                <input type="checkbox" id="outfit-auto-system"
                        ${extension_settings[MODULE_NAME].autoOutfitSystem ? 'checked' : ''}>
            </div>
            <div class="flex-container">
                <label for="outfit-connection-profile">Connection Profile (Optional):</label>
                <select id="outfit-connection-profile">
                    <option value="">Default Connection</option>
                    <option value="openrouter" ${extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                    <option value="ooba" ${extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'ooba' ? 'selected' : ''}>Oobabooga</option>
                    <option value="openai" ${extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'openai' ? 'selected' : ''}>OpenAI</option>
                    <option value="claude" ${extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'claude' ? 'selected' : ''}>Claude</option>
                </select>
            </div>
            <div class="flex-container">
                <label for="outfit-prompt-input">System Prompt:</label>
                <textarea id="outfit-prompt-input" rows="6" placeholder="Enter system prompt for auto outfit detection">${extension_settings[MODULE_NAME].autoOutfitPrompt || ''}</textarea>
            </div>
            <div class="flex-container">
                <button id="outfit-prompt-reset-btn" class="menu_button">Reset to Default Prompt</button>
                <button id="outfit-prompt-view-btn" class="menu_button">View Current Prompt</button>
            </div>
        ` : `
            <div class="flex-container">
                <label>Auto Outfit System: <span style="color: #ff6b6b;">Not Available</span></label>
            </div>
        `;

        const settingsHtml = `
        <div class="outfit-extension-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Outfit Tracker Settings</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="flex-container">
                        <label for="outfit-sys-toggle">Enable system messages</label>
                        <input type="checkbox" id="outfit-sys-toggle"
                                ${extension_settings[MODULE_NAME].enableSysMessages ? 'checked' : ''}>
                    </div>
                    <div class="flex-container">
                        <label for="outfit-auto-bot">Auto-open character panel</label>
                        <input type="checkbox" id="outfit-auto-bot"
                                ${extension_settings[MODULE_NAME].autoOpenBot ? 'checked' : ''}>
                    </div>
                    <div class="flex-container">
                        <label for="outfit-auto-user">Auto-open user panel</label>
                        <input type="checkbox" id="outfit-auto-user"
                                ${extension_settings[MODULE_NAME].autoOpenUser ? 'checked' : ''}>
                    </div>
                    ${autoSettingsHtml}
                </div>
            </div>
        </div>
        `;

        $("#extensions_settings").append(settingsHtml);

        $("#outfit-sys-toggle").on("input", function() {
            extension_settings[MODULE_NAME].enableSysMessages = $(this).prop('checked');
            saveSettingsDebounced();
        });

        $("#outfit-auto-bot").on("input", function() {
            extension_settings[MODULE_NAME].autoOpenBot = $(this).prop('checked');
            saveSettingsDebounced();
        });

        $("#outfit-auto-user").on("input", function() {
            extension_settings[MODULE_NAME].autoOpenUser = $(this).prop('checked');
            saveSettingsDebounced();
        });

        // Only add auto system event listeners if it loaded successfully
        if (hasAutoSystem) {
            $("#outfit-auto-system").on("input", function() {
                extension_settings[MODULE_NAME].autoOutfitSystem = $(this).prop('checked');
                if ($(this).prop('checked')) {
                    autoOutfitSystem.enable();
                } else {
                    autoOutfitSystem.disable();
                }
                saveSettingsDebounced();
            });

            $("#outfit-connection-profile").on("change", function() {
                const profile = $(this).val() || null;
                extension_settings[MODULE_NAME].autoOutfitConnectionProfile = profile;
                if (autoOutfitSystem.setConnectionProfile) {
                    autoOutfitSystem.setConnectionProfile(profile);
                }
                saveSettingsDebounced();
            });

            $("#outfit-prompt-input").on("change", function() {
                extension_settings[MODULE_NAME].autoOutfitPrompt = $(this).val();
                autoOutfitSystem.setPrompt($(this).val());
                saveSettingsDebounced();
            });

            $("#outfit-prompt-reset-btn").on("click", function() {
                const message = autoOutfitSystem.resetToDefaultPrompt();
                $("#outfit-prompt-input").val(autoOutfitSystem.systemPrompt);
                extension_settings[MODULE_NAME].autoOutfitPrompt = autoOutfitSystem.systemPrompt;
                saveSettingsDebounced();

                if (extension_settings.outfit_tracker?.enableSysMessages) {
                    botPanel.sendSystemMessage(message);
                } else {
                    toastr.info(message);
                }
            });

            $("#outfit-prompt-view-btn").on("click", function() {
                const status = autoOutfitSystem.getStatus();
                const preview = autoOutfitSystem.systemPrompt.length > 100
                    ? autoOutfitSystem.systemPrompt.substring(0, 100) + '...'
                    : autoOutfitSystem.systemPrompt;

                toastr.info(`Prompt preview: ${preview}\n\nFull length: ${status.promptLength} characters`, 'Current System Prompt', {
                    timeOut: 15000,
                    extendedTimeOut: 30000
                });
            });
        }
    }

    initSettings();
    registerOutfitCommands();
    setupEventListeners();
    createSettingsUI();

    if (extension_settings[MODULE_NAME].autoOpenBot) {
        setTimeout(() => botPanel.show(), 1000);
    }

    if (extension_settings[MODULE_NAME].autoOpenUser) {
        setTimeout(() => userPanel.show(), 1000);
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
                }
            }
            
            // Fallback: try the old power_user method if we still don't have a name
            if (userName === 'User') {
                if (typeof power_user !== 'undefined' && power_user && power_user.personas && typeof user_avatar !== 'undefined' && user_avatar) {
                    // Get the name from the mapping of avatar to name
                    const personaName = power_user.personas[user_avatar];
                    
                    // If we found the persona in the mapping, use it; otherwise fall back to name1 or 'User'
                    userName = personaName || (typeof name1 !== 'undefined' ? name1 : 'User');
                }
                // Fallback to name1 if the above method doesn't work
                else if (typeof name1 !== 'undefined' && name1) {
                    userName = name1;
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

                // Check if it's a character-specific variable (checking multiple possible formats)
                if (varName.startsWith(`${botCharacterName}_`) || varName.startsWith(`${normalizedBotName}_`)) {
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

    // Helper function to replace all occurrences of a substring without using regex
    // We'll import this from StringProcessor to ensure consistency

    // Define the global interceptor function for outfit information injection
    globalThis.outfitTrackerInterceptor = async function(chat, contextSize, abort, type) {
        try {
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
                    name: "System",
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

$(async () => {
    try {
        await initializeExtension();
        console.log("[OutfitTracker] Extension loaded successfully");
    } catch (error) {
        console.error("[OutfitTracker] Initialization failed", error);
    }
});
