// Define base directory for imports
const BASE_PATH = new URL('.', import.meta.url).pathname;

// Import modules from SillyTavern core - these are expected to be available when installed correctly
import { getContext, extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";
import { SlashCommand } from "../../../slash-commands/SlashCommand.js";
import { SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } from "../../../slash-commands/SlashCommandArgument.js";

// Import the extractMacros and replaceAll functions from StringProcessor
import { extractMacros, replaceAll } from "./src/utils/StringProcessor.js";
import { LLMUtility } from "./src/utils/LLMUtility.js";

// Import path configuration
import * as Paths from "./src/config/paths.js";

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

    const { BotOutfitManager } = await import("./src/managers/BotOutfitManager.js");
    const { BotOutfitPanel } = await import("./src/panels/BotOutfitPanel.js");
    const { UserOutfitManager } = await import("./src/managers/UserOutfitManager.js");
    const { UserOutfitPanel } = await import("./src/panels/UserOutfitPanel.js");

    // Import AutoOutfitSystem with error handling
    let AutoOutfitSystem;
    try {
        const autoOutfitModule = await import("./src/core/AutoOutfitSystem.js");
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
                if (window.botOutfitPanel) {
                    botPanel.toggle();
                } else {
                    console.error("[OutfitTracker] Bot outfit panel not available");
                    if (!args?.quiet) {
                        toastr.error('Bot outfit panel not available', 'Outfit System');
                    }
                    return '[Outfit System] Bot outfit panel not available';
                }
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
                if (window.userOutfitPanel) {
                    userPanel.toggle();
                } else {
                    console.error("[OutfitTracker] User outfit panel not available");
                    if (!args?.quiet) {
                        toastr.error('User outfit panel not available', 'Outfit System');
                    }
                    return '[Outfit System] User outfit panel not available';
                }
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

                    if (window.autoOutfitSystem) {
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
                    } else {
                        const message = 'Auto outfit system not available';
                        if (!isQuiet) {
                            toastr.error(message, 'Outfit System');
                        }
                        return message;
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
                    if (window.autoOutfitSystem) {
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
                    } else {
                        const message = 'Auto outfit system not available';
                        if (!args?.quiet) {
                            toastr.error(message, 'Outfit System');
                        }
                        return message;
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
                    if (window.autoOutfitSystem) {
                        const message = autoOutfitSystem.resetToDefaultPrompt();
                        if (extension_settings.outfit_tracker?.enableSysMessages) {
                            botPanel.sendSystemMessage(message);
                        }
                        // Update the textarea in settings
                        $("#outfit-prompt-input").val(autoOutfitSystem.systemPrompt);
                        extension_settings[MODULE_NAME].autoOutfitPrompt = autoOutfitSystem.systemPrompt;
                        saveSettingsDebounced();
                        return message;
                    } else {
                        const message = 'Auto outfit system not available';
                        if (!args?.quiet) {
                            toastr.error(message, 'Outfit System');
                        }
                        return message;
                    }
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
                    if (window.autoOutfitSystem) {
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
                    } else {
                        const message = 'Auto outfit system not available';
                        if (!args?.quiet) {
                            toastr.error(message, 'Outfit System');
                        }
                        return message;
                    }
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
                    if (window.autoOutfitSystem) {
                        const result = await autoOutfitSystem.manualTrigger();
                        toastr.info(result, 'Manual Outfit Check');
                        return result;
                    } else {
                        const message = 'Auto outfit system not available';
                        if (!args?.quiet) {
                            toastr.error(message, 'Outfit System');
                        }
                        return message;
                    }
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

        // Register the import-outfit command
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'import-outfit',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                
                try {
                    const result = await importOutfitFromCharacterCard();
                    
                    if (!isQuiet) {
                        toastr.info(result.message, 'Outfit Import');
                    }
                    return result.message;
                } catch (error) {
                    console.error('Error importing outfit from character card:', error);
                    const errorMessage = `Error importing outfit: ${error.message}`;
                    if (!isQuiet) {
                        toastr.error(errorMessage, 'Outfit Import');
                    }
                    return errorMessage;
                }
            },
            returns: 'imports outfit from character card and updates character description',
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
                    Imports outfit information from the character card and updates both the outfit tracker and character description.
                    This command will:
                    1. Extract clothing items from character description, personality, scenario, and character notes
                    2. Populate the outfit tracker with these items
                    3. Remove clothing references from the character card
                    4. Fix grammar/spelling outside quotes while preserving quoted text
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
                            <pre><code class="language-stscript">/import-outfit</code></pre>
                            Imports outfit from character card
                        </li>
                        <li>
                            <pre><code class="language-stscript">/import-outfit -quiet</code></pre>
                            Imports outfit from character card without notification
                        </li>
                    </ul>
                </div>
            `,
        }));

        // Register mobile-friendly slash commands for outfit operations
        // Character outfit commands
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'outfit-wear',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                // Parse slot and item from value
                const params = value?.toString().trim() || '';
                const parts = params.split(' ');
                
                if (parts.length < 2) {
                    const error = 'Usage: /outfit-wear <slot> <item>. Example: /outfit-wear headwear "Red Baseball Cap"';
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }
                
                const slot = parts[0];
                const item = parts.slice(1).join(' ');

                if (!botManager.slots.includes(slot)) {
                    const error = `Invalid slot: ${slot}. Valid slots: ${botManager.slots.join(', ')}`;
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await botManager.setOutfitItem(slot, item);
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        botPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error setting outfit item:', error);
                    const error_msg = `Error setting ${slot} to ${item}.`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'sets a character outfit item',
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
                    description: 'slot and item to wear',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Sets a character outfit item. Usage: /outfit-wear <slot> <item>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-wear headwear "Red Baseball Cap"</code></pre>
                            Sets the character's headwear to "Red Baseball Cap"
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-wear topwear "Blue T-Shirt"</code></pre>
                            Sets the character's topwear to "Blue T-Shirt"
                        </li>
                    </ul>
                </div>
            `,
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'outfit-remove',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                const slot = value?.toString().trim() || '';

                if (!botManager.slots.includes(slot)) {
                    const error = `Invalid slot: ${slot}. Valid slots: ${botManager.slots.join(', ')}`;
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await botManager.setOutfitItem(slot, 'None');
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        botPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error removing outfit item:', error);
                    const error_msg = `Error removing ${slot}.`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'removes a character outfit item',
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
                    description: 'slot to remove item from',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Removes a character outfit item. Usage: /outfit-remove <slot>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-remove headwear</code></pre>
                            Removes the character's headwear
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-remove topwear</code></pre>
                            Removes the character's topwear
                        </li>
                    </ul>
                </div>
            `,
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'outfit-change',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                // Parse slot and item from value
                const params = value?.toString().trim() || '';
                const parts = params.split(' ');
                
                if (parts.length < 2) {
                    const error = 'Usage: /outfit-change <slot> <item>. Example: /outfit-change headwear "Black Hat"';
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }
                
                const slot = parts[0];
                const item = parts.slice(1).join(' ');

                if (!botManager.slots.includes(slot)) {
                    const error = `Invalid slot: ${slot}. Valid slots: ${botManager.slots.join(', ')}`;
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await botManager.setOutfitItem(slot, item);
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        botPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error changing outfit item:', error);
                    const error_msg = `Error changing ${slot} to ${item}.`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'changes a character outfit item',
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
                    description: 'slot and new item',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Changes a character outfit item. Usage: /outfit-change <slot> <item>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-change headwear "Black Hat"</code></pre>
                            Changes the character's headwear to "Black Hat"
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-change topwear "Green Shirt"</code></pre>
                            Changes the character's topwear to "Green Shirt"
                        </li>
                    </ul>
                </div>
            `,
        }));

        // User outfit commands
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'user-outfit-wear',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                // Parse slot and item from value
                const params = value?.toString().trim() || '';
                const parts = params.split(' ');
                
                if (parts.length < 2) {
                    const error = 'Usage: /user-outfit-wear <slot> <item>. Example: /user-outfit-wear headwear "Red Baseball Cap"';
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }
                
                const slot = parts[0];
                const item = parts.slice(1).join(' ');

                if (!userManager.slots.includes(slot)) {
                    const error = `Invalid slot: ${slot}. Valid slots: ${userManager.slots.join(', ')}`;
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await userManager.setOutfitItem(slot, item);
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        userPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error setting user outfit item:', error);
                    const error_msg = `Error setting user ${slot} to ${item}.`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'sets a user outfit item',
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
                    description: 'slot and item to wear',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Sets a user outfit item. Usage: /user-outfit-wear <slot> <item>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/user-outfit-wear headwear "Red Baseball Cap"</code></pre>
                            Sets the user's headwear to "Red Baseball Cap"
                        </li>
                        <li>
                            <pre><code class="language-stscript">/user-outfit-wear topwear "Blue T-Shirt"</code></pre>
                            Sets the user's topwear to "Blue T-Shirt"
                        </li>
                    </ul>
                </div>
            `,
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'user-outfit-remove',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                const slot = value?.toString().trim() || '';

                if (!userManager.slots.includes(slot)) {
                    const error = `Invalid slot: ${slot}. Valid slots: ${userManager.slots.join(', ')}`;
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await userManager.setOutfitItem(slot, 'None');
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        userPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error removing user outfit item:', error);
                    const error_msg = `Error removing user ${slot}.`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'removes a user outfit item',
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
                    description: 'slot to remove item from',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Removes a user outfit item. Usage: /user-outfit-remove <slot>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/user-outfit-remove headwear</code></pre>
                            Removes the user's headwear
                        </li>
                        <li>
                            <pre><code class="language-stscript">/user-outfit-remove topwear</code></pre>
                            Removes the user's topwear
                        </li>
                    </ul>
                </div>
            `,
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'user-outfit-change',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                // Parse slot and item from value
                const params = value?.toString().trim() || '';
                const parts = params.split(' ');
                
                if (parts.length < 2) {
                    const error = 'Usage: /user-outfit-change <slot> <item>. Example: /user-outfit-change headwear "Black Hat"';
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }
                
                const slot = parts[0];
                const item = parts.slice(1).join(' ');

                if (!userManager.slots.includes(slot)) {
                    const error = `Invalid slot: ${slot}. Valid slots: ${userManager.slots.join(', ')}`;
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await userManager.setOutfitItem(slot, item);
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        userPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error changing user outfit item:', error);
                    const error_msg = `Error changing user ${slot} to ${item}.`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'changes a user outfit item',
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
                    description: 'slot and new item',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Changes a user outfit item. Usage: /user-outfit-change <slot> <item>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/user-outfit-change headwear "Black Hat"</code></pre>
                            Changes the user's headwear to "Black Hat"
                        </li>
                        <li>
                            <pre><code class="language-stscript">/user-outfit-change topwear "Green Shirt"</code></pre>
                            Changes the user's topwear to "Green Shirt"
                        </li>
                    </ul>
                </div>
            `,
        }));

        // Outfit preset commands
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'outfit-save',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                const presetName = value?.toString().trim() || '';

                if (!presetName) {
                    const error = 'Please specify a preset name. Usage: /outfit-save <name>';
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await botManager.savePreset(presetName);
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        botPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error saving outfit preset:', error);
                    const error_msg = `Error saving outfit preset "${presetName}".`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'saves character outfit as a preset',
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
                    description: 'preset name to save',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Saves character outfit as a preset. Usage: /outfit-save <name>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-save casual</code></pre>
                            Saves the character's current outfit as the "casual" preset
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-save formal</code></pre>
                            Saves the character's current outfit as the "formal" preset
                        </li>
                    </ul>
                </div>
            `,
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'outfit-delete',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                const presetName = value?.toString().trim() || '';

                if (!presetName) {
                    const error = 'Please specify a preset name. Usage: /outfit-delete <name>';
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await botManager.deletePreset(presetName);
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        botPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error deleting outfit preset:', error);
                    const error_msg = `Error deleting outfit preset "${presetName}".`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'deletes character outfit preset',
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
                    description: 'preset name to delete',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Deletes character outfit preset. Usage: /outfit-delete <name>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-delete casual</code></pre>
                            Deletes the "casual" outfit preset
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-delete formal</code></pre>
                            Deletes the "formal" outfit preset
                        </li>
                    </ul>
                </div>
            `,
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'user-outfit-save',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                const presetName = value?.toString().trim() || '';

                if (!presetName) {
                    const error = 'Please specify a preset name. Usage: /user-outfit-save <name>';
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await userManager.savePreset(presetName);
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        userPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error saving user outfit preset:', error);
                    const error_msg = `Error saving user outfit preset "${presetName}".`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'saves user outfit as a preset',
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
                    description: 'preset name to save',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Saves user outfit as a preset. Usage: /user-outfit-save <name>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/user-outfit-save casual</code></pre>
                            Saves the user's current outfit as the "casual" preset
                        </li>
                        <li>
                            <pre><code class="language-stscript">/user-outfit-save formal</code></pre>
                            Saves the user's current outfit as the "formal" preset
                        </li>
                    </ul>
                </div>
            `,
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'user-outfit-delete',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                const presetName = value?.toString().trim() || '';

                if (!presetName) {
                    const error = 'Please specify a preset name. Usage: /user-outfit-delete <name>';
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await userManager.deletePreset(presetName);
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        userPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error deleting user outfit preset:', error);
                    const error_msg = `Error deleting user outfit preset "${presetName}".`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'deletes user outfit preset',
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
                    description: 'preset name to delete',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Deletes user outfit preset. Usage: /user-outfit-delete <name>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/user-outfit-delete casual</code></pre>
                            Deletes the "casual" user outfit preset
                        </li>
                        <li>
                            <pre><code class="language-stscript">/user-outfit-delete formal</code></pre>
                            Deletes the "formal" user outfit preset
                        </li>
                    </ul>
                </div>
            `,
        }));

        // List all available outfits and presets
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'outfit-list',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                
                try {
                    // Get character presets
                    const botPresets = botManager.getPresets();
                    // Get user presets
                    const userPresets = userManager.getPresets();
                    
                    // Get current outfit data for both character and user
                    const botOutfitData = botManager.getOutfitData([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
                    const userOutfitData = userManager.getOutfitData([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
                    
                    let message = `Available character presets: ${botPresets.length > 0 ? botPresets.join(', ') : 'None'}\n`;
                    message += `Available user presets: ${userPresets.length > 0 ? userPresets.join(', ') : 'None'}\n\n`;
                    
                    // Add current outfit information
                    message += `Current ${botManager.character} outfit:\n`;
                    for (const item of botOutfitData) {
                        message += `  ${item.name}: ${item.value}\n`;
                    }
                    
                    message += `\nCurrent user outfit:\n`;
                    for (const item of userOutfitData) {
                        message += `  ${item.name}: ${item.value}\n`;
                    }
                    
                    if (!isQuiet) {
                        toastr.info('Outfit information retrieved', 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error listing outfits:', error);
                    const error_msg = 'Error listing outfit information.';
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'lists all available outfit presets and current outfits',
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
                    Lists all available outfit presets and current outfits. Usage: /outfit-list
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-list</code></pre>
                            Lists all available presets and current outfits
                        </li>
                    </ul>
                </div>
            `,
        }));

        // Outfit overwrite commands
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'outfit-overwrite',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                const presetName = value?.toString().trim() || '';

                if (!presetName) {
                    const error = 'Please specify a preset name. Usage: /outfit-overwrite <name>';
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await botManager.overwritePreset(presetName);
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        botPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error overwriting outfit preset:', error);
                    const error_msg = `Error overwriting outfit preset \"${presetName}\".`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'overwrites character outfit preset with current outfit',
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
                    description: 'preset name to overwrite',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Overwrites character outfit preset with current outfit. Usage: /outfit-overwrite <name>
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
                            <pre><code class="language-stscript">/outfit-overwrite casual</code></pre>
                            Overwrites the \"casual\" character outfit preset with the current outfit
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-overwrite formal</code></pre>
                            Overwrites the \"formal\" character outfit preset with the current outfit
                        </li>
                    </ul>
                </div>
            `,
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'user-outfit-overwrite',
            callback: async function (args, value) {
                const isQuiet = args?.quiet === true;
                const presetName = value?.toString().trim() || '';

                if (!presetName) {
                    const error = 'Please specify a preset name. Usage: /user-outfit-overwrite <name>';
                    if (!isQuiet) {
                        toastr.error(error, 'Outfit System');
                    }
                    return error;
                }

                try {
                    const message = await userManager.overwritePreset(presetName);
                    if (extension_settings.outfit_tracker?.enableSysMessages) {
                        userPanel.sendSystemMessage(message);
                    }
                    if (!isQuiet) {
                        toastr.info(message, 'Outfit System');
                    }
                    return message;
                } catch (error) {
                    console.error('Error overwriting user outfit preset:', error);
                    const error_msg = `Error overwriting user outfit preset \"${presetName}\".`;
                    if (!isQuiet) {
                        toastr.error(error_msg, 'Outfit System');
                    }
                    return error_msg;
                }
            },
            returns: 'overwrites user outfit preset with current outfit',
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
                    description: 'preset name to overwrite',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: `
                <div>
                    Overwrites user outfit preset with current outfit. Usage: /user-outfit-overwrite <name>
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
                            <pre><code class="language-stscript">/user-outfit-overwrite casual</code></pre>
                            Overwrites the \"casual\" user outfit preset with the current outfit
                        </li>
                        <li>
                            <pre><code class="language-stscript">/user-outfit-overwrite formal</code></pre>
                            Overwrites the \"formal\" user outfit preset with the current outfit
                        </li>
                    </ul>
                </div>
            `,
        }));
    }

    // Function to import outfit from character card using LLM analysis
    async function importOutfitFromCharacterCard() {
        const context = getContext();

        if (!context || !context.characters || context.characterId === undefined || context.characterId === null) {
            throw new Error("No character selected or context not ready");
        }

        const character = context.characters[context.characterId];
        if (!character) {
            throw new Error("Character not found");
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
        if (typeof updateCharacterInChat === 'function') {
            updateCharacterInChat();
        }
        
        // Update the character in the characters array (if context allows)
        context.characters[context.characterId] = character;

        // Return success message
        const itemsCount = outfitCommands ? outfitCommands.length : 0;
        return {
            message: `Successfully imported outfit with ${itemsCount} items from character card using LLM analysis and updated character description.`
        };
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
                        "You are an assistant that helps clean up character descriptions by removing clothing references while preserving other content and fixing grammar.",
                        context,
                        connectionProfile
                    );
                } else if (context.generateQuietPrompt) {
                    result = await LLMUtility.generateWithProfile(
                        prompt,
                        "You are an assistant that helps clean up character descriptions by removing clothing references while preserving other content and fixing grammar.",
                        context,
                        connectionProfile
                    );
                } else {
                    // Use AutoOutfitSystem's generation method as fallback
                    result = await autoOutfitSystem.generateWithProfile(prompt);
                }
            } catch (error) {
                console.warn("LLM did not return a valid response, returning original character info");
                return characterInfo;
            }
            
            // Extract content from the labeled sections
            const extractField = (text, startTag, endTag) => {
                const startIndex = text.indexOf(startTag);
                if (startIndex === -1) return null;
                
                const contentStart = startIndex + startTag.length;
                const endIndex = text.indexOf(endTag, contentStart);
                if (endIndex === -1) return null;
                
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
            console.error("Error using LLM to clean character info:", error);
            // If LLM processing fails, return the original character info
            return characterInfo;
        }
    }

    // Function to generate outfit from character info using LLM (same as bot panel)
    async function generateOutfitFromCharacterInfoLLM(characterInfo) {
        try {
            // Generate outfit from LLM using the same method as the bot panel
            const response = await generateOutfitFromLLM(characterInfo);
            
            // Parse the response to get the outfit commands
            const { extractCommands } = await import("./src/utils/StringProcessor.js");
            const commands = extractCommands(response);
            
            return commands;
        } catch (error) {
            console.error('Error in generateOutfitFromCharacterInfoLLM:', error);
            throw error;
        }
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
                    "You are an outfit generation system. Based on the character information provided, output outfit commands to set the character's clothing and accessories.",
                    context,
                    connectionProfile
                );
            } else if (context.generateQuietPrompt) {
                return await LLMUtility.generateWithProfile(
                    prompt,
                    "You are an outfit generation system. Based on the character information provided, output outfit commands to set the character's clothing and accessories.",
                    context,
                    connectionProfile
                );
            } else {
                // Use AutoOutfitSystem's generation method as fallback
                return await autoOutfitSystem.generateWithProfile(prompt);
            }
        } catch (error) {
            console.error('Error generating outfit from LLM:', error);
            throw error;
        }
    }

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



    function updateForCurrentCharacter() {
        try {
            const context = getContext();

            // Check if context is ready before trying to access character data
            if (!context || !context.characters || context.characterId === undefined || context.characterId === null) {
                console.log("[OutfitTracker] Context not ready or no character selected, setting as Unknown");
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
                console.log("[OutfitTracker] Character not found at index " + context.characterId + ", setting as Unknown");
                if (botManager) {
                    botManager.setCharacter('Unknown', null, null);
                }
                if (botPanel) {
                    botPanel.updateCharacter('Unknown');
                }
                return;
            }

            const charName = character.name || 'Unknown';
            console.log("[OutfitTracker] Updating character to: " + charName + " (ID: " + context.characterId + ")");
            
            // Check if we have a new chat or the same character but different first message
            const currentChatId = context.chatId;
            
            // Create a unique instance ID based on character ID and first message
            let instanceId = null;
            if (context.chat && context.chat.length > 0) {
                // Find all AI messages in the current chat and get the first one
                const aiMessages = context.chat.filter(msg => !msg.is_user && !msg.is_system);
                const firstMessage = aiMessages.length > 0 ? aiMessages[0] : null;
                
                if (firstMessage) {
                    // Use the content of the first message to create a unique instance ID
                    // This means if the first message changes, it's considered a different scenario/instance
                    const firstMessageText = firstMessage.mes || '';
                    
                    // Create a more robust and descriptive instance ID
                    const messagePreview = firstMessageText.substring(0, 20).replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
                    
                    if (firstMessageText.toLowerCase().includes('hello') || firstMessageText.toLowerCase().includes('hi')) {
                        // Create consistent ID based on message content
                        const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);
                        instanceId = `greeting_${messagePreview}_${textHash}`;
                    } else if (firstMessageText.toLowerCase().includes('bedroom') || firstMessageText.toLowerCase().includes('bed')) {
                        // Create consistent ID based on message content
                        const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);
                        instanceId = `bedroom_${messagePreview}_${textHash}`;
                    } else if (firstMessageText.toLowerCase().includes('office') || firstMessageText.toLowerCase().includes('work')) {
                        // Create consistent ID based on message content
                        const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);
                        instanceId = `office_${messagePreview}_${textHash}`;
                    } else {
                        // Create a hash-based ID with more information
                        const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);
                        instanceId = `scenario_${textHash}`;
                    }
                }
            }
            
            if (botManager) {
                // Update the character with characterId and chatId for proper namespace
                botManager.setCharacter(charName, context.characterId, currentChatId);
                
                // Set the outfit instance ID based on the first message scenario
                botManager.setOutfitInstanceId(instanceId);
                
                // Load the outfit data for the new instance
                botManager.loadOutfit();
            }
            if (botPanel) {
                botPanel.updateCharacter(charName);
            }

            // Update the user panel as well when chat changes
            if (userManager) {
                // Set the outfit instance ID for user based on the same first message scenario
                userManager.setOutfitInstanceId(instanceId);
                
                // Load the outfit data for the new instance
                userManager.loadOutfit();
            }
            if (userPanel) {
                userPanel.updateHeader();
            }

            // Make sure the panel renders the content with the new character name
            if (botPanel.isVisible && !botPanel.isMinimized && botPanel.renderContent) {
                botPanel.renderContent();
            }
            if (userPanel.isVisible && userPanel.renderContent) {
                userPanel.renderContent();
            }
        } catch (error) {
            console.error("[OutfitTracker] Error updating for current character:", error);
        }
    }

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
                outfitInfo += `\n**<BOT>'s Current Outfit**\n`;

                // Add clothing info
                CLOTHING_SLOTS.forEach(slot => {
                    const slotData = botOutfitData.find(data => data.name === slot);
                    if (slotData) {
                        const formattedSlotName = slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.charAt(0).toUpperCase()).replace('underwear', 'Underwear');
                        // Use the new instance-based variable name if an instance ID is set
                        let varName;
                        if (botManager.getOutfitInstanceId() && !botManager.getOutfitInstanceId().startsWith('temp_')) {
                            varName = `OUTFIT_INST_${botManager.characterId || 'unknown'}_${botManager.chatId || 'unknown'}_${botManager.getOutfitInstanceId()}_${slotData.name}`;
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
                        // Use the new instance-based variable name if an instance ID is set
                        let varName;
                        if (botManager.getOutfitInstanceId() && !botManager.getOutfitInstanceId().startsWith('temp_')) {
                            varName = `OUTFIT_INST_${botManager.characterId || 'unknown'}_${botManager.chatId || 'unknown'}_${botManager.getOutfitInstanceId()}_${slotData.name}`;
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
                outfitInfo += `\n**{{user}}'s Current Outfit**\n`;

                // Add user clothing info
                CLOTHING_SLOTS.forEach(slot => {
                    const slotData = userOutfitData.find(data => data.name === slot);
                    if (slotData) {
                        const formattedSlotName = slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.charAt(0).toUpperCase()).replace('underwear', 'Underwear');
                        // Use the new instance-based variable name if an instance ID is set for user
                        let varName;
                        if (userManager.getOutfitInstanceId() && !userManager.getOutfitInstanceId().startsWith('temp_')) {
                            varName = `OUTFIT_INST_USER_${userManager.getOutfitInstanceId()}_${slotData.name}`;
                        } else {
                            // If using temporary ID or no ID, fall back to standard naming
                            varName = `User_${slotData.name}`;
                        }
                        outfitInfo += `**${formattedSlotName}:** {{getglobalvar::${varName}}}\n`;
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
                        // Use the new instance-based variable name if an instance ID is set for user
                        let varName;
                        if (userManager.getOutfitInstanceId() && !userManager.getOutfitInstanceId().startsWith('temp_')) {
                            varName = `OUTFIT_INST_USER_${userManager.getOutfitInstanceId()}_${slotData.name}`;
                        } else {
                            // If using temporary ID or no ID, fall back to standard naming
                            varName = `User_${slotData.name}`;
                        }
                        outfitInfo += `**${formattedSlotName}:** {{getglobalvar::${varName}}}\n`;
                    }
                });
            }

            return outfitInfo;
        } catch (error) {
            console.error("[OutfitTracker] Error generating outfit info string:", error);
            return ''; // Return empty string if there's an error
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
            if (window.autoOutfitSystem) {
                autoOutfitSystem.markAppInitialized();
            }
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
            console.log("[OutfitTracker] CHAT_CREATED event fired - creating new outfit instance");
            // When a new chat is created, create a new outfit instance for this conversation
            try {
                const context = getContext();
                
                if (botManager) {
                    // Create a new outfit instance for this chat
                    // Initially, we don't know the first message yet, so we'll use a temporary ID
                    // Use a more descriptive temporary ID to avoid conflicts
                    const tempInstanceId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    botManager.setOutfitInstanceId(tempInstanceId);
                    
                    // The outfit will be properly initialized when we detect the first message
                    console.log("[OutfitTracker] Created new outfit instance for character:", tempInstanceId);
                }

                if (userManager) {
                    // Create a new outfit instance for this chat
                    const tempInstanceId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    userManager.setOutfitInstanceId(tempInstanceId);
                    
                    console.log("[OutfitTracker] Created new outfit instance for user:", tempInstanceId);
                }
            } catch (error) {
                console.error("[OutfitTracker] Error creating new outfit instance on chat creation:", error);
            }
            updateForCurrentCharacter(); // Update the character after creating new instance
        });

        // Listen for the first message selected event which is more specific than MESSAGE_RECEIVED


        // Listen for message swiped event to handle first message changes
        // The MESSAGE_SWIPED event is emitted with the index of the message that was swiped
        eventSource.on(event_types.MESSAGE_SWIPED, async (index) => {
            console.log(`[OutfitTracker] MESSAGE_SWIPED event fired with index: ${index}`);
            try {
                const context = getContext();
                if (context && context.chat && context.chat.length > 0 && index >= 0 && index < context.chat.length) {
                    // The event provides the index of the swiped message
                    const swipedMessage = context.chat[index];
                    
                    if (!swipedMessage) {
                        console.log("[OutfitTracker] Swiped message not found at provided index");
                        return;
                    }
                    
                    // Check if the swiped message is the first AI message in the chat
                    const aiMessages = context.chat.filter(msg => !msg.is_user && !msg.is_system);
                    const firstMessage = aiMessages.length > 0 ? aiMessages[0] : null;
                    
                    // Check if the swiped message is the first AI message (not a user message)
                    if (firstMessage && !swipedMessage.is_user && !swipedMessage.is_system &&
                        (swipedMessage.swid === firstMessage.swid || 
                         (swipedMessage.mes === firstMessage.mes && swipedMessage.name === firstMessage.name))) {
                        console.log("[OutfitTracker] First message was swiped, updating outfit instance");
                        
                        // Create a specific outfit instance based on the new first message content
                        const firstMessageText = swipedMessage.mes || '';
                        
                        // Determine scenario type based on message content
                        let instanceId = null;
                        
                        // Create a more robust and descriptive instance ID
                        const messagePreview = firstMessageText.substring(0, 20).replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
                        
                        if (firstMessageText.toLowerCase().includes('hello') || firstMessageText.toLowerCase().includes('hi')) {
                            // Create consistent ID based on message content
                            const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);
                            instanceId = `greeting_${messagePreview}_${textHash}`;
                        } else if (firstMessageText.toLowerCase().includes('bedroom') || firstMessageText.toLowerCase().includes('bed')) {
                            // Create consistent ID based on message content
                            const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);
                            instanceId = `bedroom_${messagePreview}_${textHash}`;
                        } else if (firstMessageText.toLowerCase().includes('office') || firstMessageText.toLowerCase().includes('work')) {
                            // Create consistent ID based on message content
                            const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);
                            instanceId = `office_${messagePreview}_${textHash}`;
                        } else {
                            // Create a hash-based ID with more information
                            const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);
                            instanceId = `scenario_${textHash}`;
                        }
                        
                        if (botManager) {
                            // Set the outfit instance ID based on the first message scenario
                            botManager.setOutfitInstanceId(instanceId);
                            console.log(`[OutfitTracker] Set bot outfit instance ID after swipe: ${instanceId}`);
                            
                            // Load the outfit data for the new instance
                            botManager.loadOutfit();
                        }
                        
                        if (userManager) {
                            // Also set a corresponding instance ID for the user
                            userManager.setOutfitInstanceId(instanceId);
                            console.log(`[OutfitTracker] Set user outfit instance ID after swipe: ${instanceId}`);
                            
                            // Load the outfit data for the new instance
                            userManager.loadOutfit();
                        }
                        
                        // Update the panels to reflect the new instance
                        if (botPanel && botPanel.isVisible) {
                            botPanel.updateCharacter(botManager.character);
                            botPanel.renderContent();
                        }
                        
                        if (userPanel && userPanel.isVisible) {
                            userPanel.updateHeader();
                            userPanel.renderContent();
                        }
                        
                        console.log(`[OutfitTracker] Created outfit instances after first message swipe: ${instanceId}`);
                    } else {
                        console.log("[OutfitTracker] Swiped message is not the first AI message, skipping instance update");
                    }
                }
            } catch (error) {
                console.error("[OutfitTracker] Error handling message swipe event:", error);
            }
        });

        // Hook into the clear chat functionality by overriding the clearChat function
        // This will be called when the user clears the current chat
        const originalClearChat = window.clearChat;
        window.clearChat = async function() {
            // Before clearing the chat, save all outfit data for current character
            let savedBotOutfits = {};
            let savedUserOutfits = {};
            
            if (botManager && botManager.characterId) {
                // Save all outfit instances for this character to preserve across chat resets
                const allVars = botManager.getAllVariables();
                const pattern = new RegExp(`^OUTFIT_INST_${botManager.characterId}_${botManager.chatId}_`);
                
                for (const varName in allVars) {
                    if (pattern.test(varName)) {
                        savedBotOutfits[varName] = allVars[varName];
                    }
                }
                
                console.log(`[OutfitTracker] Saved ${Object.keys(savedBotOutfits).length} bot outfit instances before chat clear`);
            }
            
            if (userManager) {
                // Save all user outfit instances to preserve across chat resets
                const allVars = userManager.getAllVariables();
                const pattern = /^OUTFIT_INST_USER_/;
                
                for (const varName in allVars) {
                    if (pattern.test(varName)) {
                        savedUserOutfits[varName] = allVars[varName];
                    }
                }
                
                console.log(`[OutfitTracker] Saved ${Object.keys(savedUserOutfits).length} user outfit instances before chat clear`);
            }

            // First call the original function to clear the chat
            if (typeof originalClearChat === 'function') {
                originalClearChat.apply(this, arguments);
            } else {
                // If the original function doesn't exist, manually clear the chat
                // Get the current chat and clear it
                const context = getContext();
                if (context && context.chat && Array.isArray(context.chat)) {
                    context.chat = [];
                    // Update the UI to reflect the cleared chat
                    if (typeof updateChatOutput === 'function') {
                        updateChatOutput();
                    }
                }
            }

            // Then update outfits after restoring saved instances
            setTimeout(async () => {
                try {
                    // Restore saved outfit data after chat is cleared
                    if (botManager && Object.keys(savedBotOutfits).length > 0) {
                        // Restore all saved bot outfit instances
                        for (const [varName, value] of Object.entries(savedBotOutfits)) {
                            botManager.setGlobalVariable(varName, value);
                        }
                        console.log("[OutfitTracker] Restored bot outfit instances after chat clear");
                        
                        // Now update the bot manager's current values to reflect the restored data
                        // so that when setOutfitInstanceId is called, it has the correct values
                        botManager.loadOutfit();
                    }

                    if (userManager && Object.keys(savedUserOutfits).length > 0) {
                        // Restore all saved user outfit instances
                        for (const [varName, value] of Object.entries(savedUserOutfits)) {
                            userManager.setGlobalVariable(varName, value);
                        }
                        console.log("[OutfitTracker] Restored user outfit instances after chat clear");
                        
                        // Now update the user manager's current values to reflect the restored data
                        // so that when setOutfitInstanceId is called, it has the correct values
                        userManager.loadOutfit();
                    }

                    // Update the current character which will properly set the instance ID based on first message
                    // (or create a new temporary one if no first message exists yet)
                    // Add a small delay to ensure context.chat is properly populated before updating
                    setTimeout(() => {
                        updateForCurrentCharacter();
                        
                        // Update the panel headers after chat is cleared
                        if (botPanel && botPanel.isVisible) {
                            botPanel.updateCharacter(botManager.character);
                            botPanel.renderContent();
                        }
                        
                        if (userPanel && userPanel.isVisible) {
                            userPanel.updateHeader();
                            userPanel.renderContent();
                        }
                    }, 300); // Increased delay to allow for chat to be fully populated
                } catch (error) {
                    console.error("[OutfitTracker] Error in outfit restoration after chat clear:", error);
                }
            }, 100); // Small delay to ensure chat is cleared before restoring
        };
        
        // Function to clean up old temporary outfit instances periodically
        function cleanupOldTempInstances() {
            try {
                if (botManager) {
                    botManager.cleanupTempInstances();
                }
                if (userManager) {
                    userManager.cleanupTempInstances();
                }
            } catch (error) {
                console.error("[OutfitTracker] Error during temp instance cleanup:", error);
            }
        }
        
        // Schedule cleanup of old temporary instances periodically (every 10 minutes)
        setInterval(cleanupOldTempInstances, 10 * 60 * 1000);
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
            <div class="flex-container setting-row">
                <label for="outfit-auto-system">Enable auto outfit updates</label>
                <input type="checkbox" id="outfit-auto-system"
                        ${extension_settings[MODULE_NAME].autoOutfitSystem ? 'checked' : ''}>
            </div>
            <div class="flex-container setting-row">
                <label for="outfit-connection-profile">Connection Profile (Optional):</label>
                <select id="outfit-connection-profile" class="option">
                    <option value="">Default Connection</option>
                    <option value="openrouter" ${extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                    <option value="ooba" ${extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'ooba' ? 'selected' : ''}>Oobabooga</option>
                    <option value="openai" ${extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'openai' ? 'selected' : ''}>OpenAI</option>
                    <option value="claude" ${extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'claude' ? 'selected' : ''}>Claude</option>
                </select>
            </div>
            <div class="flex-container setting-row">
                <label for="outfit-prompt-input">System Prompt:</label>
                <textarea id="outfit-prompt-input" placeholder="Enter system prompt for auto outfit detection">${extension_settings[MODULE_NAME].autoOutfitPrompt || ''}</textarea>
            </div>
            <div class="flex-container">
                <button id="outfit-prompt-reset-btn" class="menu_button">Reset to Default Prompt</button>
                <button id="outfit-prompt-view-btn" class="menu_button">View Current Prompt</button>
            </div>
        ` : `
            <div class="flex-container setting-row">
                <label>Auto Outfit System: <span class="error-text">Not Available</span></label>
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
                    <div class="setting-group">
                        <h4>General Settings</h4>
                        
                        <div class="flex-container setting-row">
                            <label for="outfit-sys-toggle">Enable system messages</label>
                            <input type="checkbox" id="outfit-sys-toggle"
                                   ${extension_settings[MODULE_NAME].enableSysMessages ? 'checked' : ''}>
                        </div>
                        
                        <div class="flex-container setting-row">
                            <label for="outfit-auto-bot">Auto-open character panel</label>
                            <input type="checkbox" id="outfit-auto-bot"
                                   ${extension_settings[MODULE_NAME].autoOpenBot ? 'checked' : ''}>
                        </div>
                        
                        <div class="flex-container setting-row">
                            <label for="outfit-auto-user">Auto-open user panel</label>
                            <input type="checkbox" id="outfit-auto-user"
                                   ${extension_settings[MODULE_NAME].autoOpenUser ? 'checked' : ''}>
                        </div>
                    </div>
                    
                    <!-- Panel Colors Customization Section -->
                    <div class="setting-group">
                        <h4>Panel Colors</h4>
                        
                        <!-- Bot Panel Colors -->
                        <div class="panel-color-section">
                            <h5 class="color-section-title">Character Panel</h5>
                            
                            <div class="color-setting-row">
                                <label for="bot-panel-primary-color" class="color-label">Primary Color:</label>
                                <div class="color-input-wrapper">
                                    <input type="color" id="bot-panel-primary-color-picker" value="#6a4fc1">
                                    <input type="text" id="bot-panel-primary-color" value="${extension_settings[MODULE_NAME]?.botPanelColors?.primary || 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)'}">
                                    <button id="bot-panel-primary-reset" class="color-reset-btn">Reset</button>
                                </div>
                            </div>
                            
                            <div class="color-setting-row">
                                <label for="bot-panel-border-color" class="color-label">Border Color:</label>
                                <div class="color-input-wrapper">
                                    <input type="color" id="bot-panel-border-color-picker" value="${extension_settings[MODULE_NAME]?.botPanelColors?.border || '#8a7fdb'}">
                                    <input type="text" id="bot-panel-border-color" value="${extension_settings[MODULE_NAME]?.botPanelColors?.border || '#8a7fdb'}">
                                    <button id="bot-panel-border-reset" class="color-reset-btn">Reset</button>
                                </div>
                            </div>
                            
                            <div class="color-setting-row">
                                <label for="bot-panel-shadow-color" class="color-label">Shadow Color:</label>
                                <div class="color-input-wrapper">
                                    <input type="color" id="bot-panel-shadow-color-picker" value="#6a4fc1">
                                    <input type="text" id="bot-panel-shadow-color" value="${extension_settings[MODULE_NAME]?.botPanelColors?.shadow || 'rgba(106, 79, 193, 0.4)'}">
                                    <button id="bot-panel-shadow-reset" class="color-reset-btn">Reset</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- User Panel Colors -->
                        <div class="panel-color-section">
                            <h5 class="color-section-title">User Panel</h5>
                            
                            <div class="color-setting-row">
                                <label for="user-panel-primary-color" class="color-label">Primary Color:</label>
                                <div class="color-input-wrapper">
                                    <input type="color" id="user-panel-primary-color-picker" value="#1a78d1">
                                    <input type="text" id="user-panel-primary-color" value="${extension_settings[MODULE_NAME]?.userPanelColors?.primary || 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)'}">
                                    <button id="user-panel-primary-reset" class="color-reset-btn">Reset</button>
                                </div>
                            </div>
                            
                            <div class="color-setting-row">
                                <label for="user-panel-border-color" class="color-label">Border Color:</label>
                                <div class="color-input-wrapper">
                                    <input type="color" id="user-panel-border-color-picker" value="${extension_settings[MODULE_NAME]?.userPanelColors?.border || '#5da6f0'}">
                                    <input type="text" id="user-panel-border-color" value="${extension_settings[MODULE_NAME]?.userPanelColors?.border || '#5da6f0'}">
                                    <button id="user-panel-border-reset" class="color-reset-btn">Reset</button>
                                </div>
                            </div>
                            
                            <div class="color-setting-row">
                                <label for="user-panel-shadow-color" class="color-label">Shadow Color:</label>
                                <div class="color-input-wrapper">
                                    <input type="color" id="user-panel-shadow-color-picker" value="#1a78d1">
                                    <input type="text" id="user-panel-shadow-color" value="${extension_settings[MODULE_NAME]?.userPanelColors?.shadow || 'rgba(26, 120, 209, 0.4)'}">
                                    <button id="user-panel-shadow-reset" class="color-reset-btn">Reset</button>
                                </div>
                            </div>
                        </div>
                        
                        <button id="apply-panel-colors" class="menu_button">Apply Panel Colors</button>
                    </div>
                    <div class="setting-group">
                        <h4>${hasAutoSystem ? 'Auto Outfit Settings' : 'Advanced Settings'}</h4>
                        ${autoSettingsHtml}
                    </div>
                </div>
            </div>
        </div>
        `;

        $("#extensions_settings").append(settingsHtml);

        // Custom toggle switch styling
        $(document).on("change", "#outfit-sys-toggle, #outfit-auto-bot, #outfit-auto-user", function() {
            extension_settings[MODULE_NAME].enableSysMessages = $("#outfit-sys-toggle").prop('checked');
            extension_settings[MODULE_NAME].autoOpenBot = $("#outfit-auto-bot").prop('checked');
            extension_settings[MODULE_NAME].autoOpenUser = $("#outfit-auto-user").prop('checked');
            saveSettingsDebounced();
        });

        // Update panel colors when settings change
        $(document).on("input", "#bot-panel-primary-color, #bot-panel-border-color, #bot-panel-shadow-color, #user-panel-primary-color, #user-panel-border-color, #user-panel-shadow-color", function() {
            updateColorSettingsAndApply();
        });

        // Color customization event listeners
        $("#apply-panel-colors").on("click", function() {
            updateColorSettingsAndApply();
            
            // Visual feedback for button click
            const originalText = $(this).text();
            $(this).text('Applied!').css('background', 'linear-gradient(135deg, #5a8d5a, #4a7d4a)');
            
            setTimeout(() => {
                $(this).text(originalText).css('background', 'linear-gradient(135deg, #4a5bb8 0%, #3a4ba8 100%)');
            }, 2000);
        });
        
        // Update text inputs when color pickers change
        $("#bot-panel-primary-color-picker").on("input", function() {
            // Extract hex color from the picker and update the text field
            const hexColor = $(this).val();
            $("#bot-panel-primary-color").val(`linear-gradient(135deg, ${hexColor} 0%, #5a49d0 50%, #4a43c0 100%)`);
        });
        
        $("#bot-panel-border-color-picker").on("input", function() {
            const hexColor = $(this).val();
            $("#bot-panel-border-color").val(hexColor);
        });
        
        $("#bot-panel-shadow-color-picker").on("input", function() {
            const hexColor = $(this).val();
            // Convert hex to rgba for shadow (with opacity)
            const rgba = hexToRgba(hexColor, 0.4);
            $("#bot-panel-shadow-color").val(rgba);
        });
        
        $("#user-panel-primary-color-picker").on("input", function() {
            const hexColor = $(this).val();
            $("#user-panel-primary-color").val(`linear-gradient(135deg, ${hexColor} 0%, #2a68c1 50%, #1a58b1 100%)`);
        });
        
        $("#user-panel-border-color-picker").on("input", function() {
            const hexColor = $(this).val();
            $("#user-panel-border-color").val(hexColor);
        });
        
        $("#user-panel-shadow-color-picker").on("input", function() {
            const hexColor = $(this).val();
            // Convert hex to rgba for shadow (with opacity)
            const rgba = hexToRgba(hexColor, 0.4);
            $("#user-panel-shadow-color").val(rgba);
        });
        
        // Update color pickers when text inputs change (in case users type in values)
        $(document).on("input", "#bot-panel-primary-color, #bot-panel-border-color, #bot-panel-shadow-color, #user-panel-primary-color, #user-panel-border-color, #user-panel-shadow-color", function() {
            updateColorPickersFromText();
        });
        
        // Add hover effects to the apply button
        $("#apply-panel-colors").hover(
            function() { // Mouse enter
                $(this).css('background', 'linear-gradient(135deg, #5a6bc8 0%, #4a5ba8 100%)');
            }, 
            function() { // Mouse leave
                $(this).css('background', 'linear-gradient(135deg, #4a5bb8 0%, #3a4ba8 100%)');
            }
        );
        
        // Store original default values for comparison
        const originalDefaults = {
            bot: {
                primary: 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)',
                border: '#8a7fdb',
                shadow: 'rgba(106, 79, 193, 0.4)'
            },
            user: {
                primary: 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)',
                border: '#5da6f0',
                shadow: 'rgba(26, 120, 209, 0.4)'
            }
        };
        
        // Function to check if a field has been modified from its default
        function isFieldModified(fieldId, defaultValue) {
            const currentValue = $(`#${fieldId}`).val();
            return currentValue !== defaultValue;
        }
        
        // Function to update reset button visibility
        function updateResetButtonVisibility() {
            // Bot panel
            toggleResetButton('bot-panel-primary-reset', isFieldModified('bot-panel-primary-color', originalDefaults.bot.primary));
            toggleResetButton('bot-panel-border-reset', isFieldModified('bot-panel-border-color', originalDefaults.bot.border));
            toggleResetButton('bot-panel-shadow-reset', isFieldModified('bot-panel-shadow-color', originalDefaults.bot.shadow));
            
            // User panel
            toggleResetButton('user-panel-primary-reset', isFieldModified('user-panel-primary-color', originalDefaults.user.primary));
            toggleResetButton('user-panel-border-reset', isFieldModified('user-panel-border-color', originalDefaults.user.border));
            toggleResetButton('user-panel-shadow-reset', isFieldModified('user-panel-shadow-color', originalDefaults.user.shadow));
        }
        
        // Helper function to toggle reset button visibility
        function toggleResetButton(buttonId, show) {
            const button = $(`#${buttonId}`);
            if (show) {
                button.show();
            } else {
                button.hide();
            }
        }
        
        // Attach input event listeners to text fields to check for modifications
        $("#bot-panel-primary-color, #bot-panel-border-color, #bot-panel-shadow-color, #user-panel-primary-color, #user-panel-border-color, #user-panel-shadow-color").on('input', function() {
            updateResetButtonVisibility();
        });
        
        // Initialize reset button visibility after UI is created
        setTimeout(updateResetButtonVisibility, 200);
        
        // Reset button event handlers
        $("#bot-panel-primary-reset").on("click", function() {
            $("#bot-panel-primary-color").val(originalDefaults.bot.primary);
            $("#bot-panel-primary-color-picker").val(extractHexFromGradient(originalDefaults.bot.primary));
            updateResetButtonVisibility();
            updateColorSettingsAndApply();
        });
        
        $("#bot-panel-border-reset").on("click", function() {
            $("#bot-panel-border-color").val(originalDefaults.bot.border);
            $("#bot-panel-border-color-picker").val(originalDefaults.bot.border);
            updateResetButtonVisibility();
            updateColorSettingsAndApply();
        });
        
        $("#bot-panel-shadow-reset").on("click", function() {
            $("#bot-panel-shadow-color").val(originalDefaults.bot.shadow);
            $("#bot-panel-shadow-color-picker").val(extractHexFromGradient(originalDefaults.bot.shadow));
            updateResetButtonVisibility();
            updateColorSettingsAndApply();
        });
        
        $("#user-panel-primary-reset").on("click", function() {
            $("#user-panel-primary-color").val(originalDefaults.user.primary);
            $("#user-panel-primary-color-picker").val(extractHexFromGradient(originalDefaults.user.primary));
            updateResetButtonVisibility();
            updateColorSettingsAndApply();
        });
        
        $("#user-panel-border-reset").on("click", function() {
            $("#user-panel-border-color").val(originalDefaults.user.border);
            $("#user-panel-border-color-picker").val(originalDefaults.user.border);
            updateResetButtonVisibility();
            updateColorSettingsAndApply();
        });
        
        $("#user-panel-shadow-reset").on("click", function() {
            $("#user-panel-shadow-color").val(originalDefaults.user.shadow);
            $("#user-panel-shadow-color-picker").val(extractHexFromGradient(originalDefaults.user.shadow));
            updateResetButtonVisibility();
            updateColorSettingsAndApply();
        });
        
        // Helper function to convert hex color to rgba
        function hexToRgba(hex, opacity) {
            // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
            var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            hex = hex.replace(shorthandRegex, function(m, r, g, b) {
                return r + r + g + g + b + b;
            });

            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? 
                `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})` : 
                'rgba(0, 0, 0, 0.4)'; // default fallback
        }
        
        // Helper function to extract hex color from gradient string
        function extractHexFromGradient(gradientStr) {
            // Match hex color in gradient string
            const match = gradientStr.match(/#([a-fA-F0-9]{6})/);
            return match ? match[0] : '#6a4fc1'; // Default color if not found
        }
        
        // Function to update the color pickers based on text input values
        function updateColorPickersFromText() {
            // Update bot panel color pickers
            const botPrimaryText = $("#bot-panel-primary-color").val();
            if (botPrimaryText.startsWith('linear-gradient')) {
                $("#bot-panel-primary-color-picker").val(extractHexFromGradient(botPrimaryText));
            } else {
                $("#bot-panel-primary-color-picker").val(botPrimaryText);
            }
            
            const botBorderText = $("#bot-panel-border-color").val();
            $("#bot-panel-border-color-picker").val(extractHexFromGradient(botBorderText) || botBorderText);
            
            const botShadowText = $("#bot-panel-shadow-color").val();
            // Extract hex from rgba if possible
            const rgbaMatch = botShadowText.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
            if (rgbaMatch) {
                const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
                const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
                const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
                $("#bot-panel-shadow-color-picker").val(`#${r}${g}${b}`);
            } else {
                $("#bot-panel-shadow-color-picker").val(extractHexFromGradient(botShadowText) || botShadowText);
            }
            
            // Update user panel color pickers
            const userPrimaryText = $("#user-panel-primary-color").val();
            if (userPrimaryText.startsWith('linear-gradient')) {
                $("#user-panel-primary-color-picker").val(extractHexFromGradient(userPrimaryText));
            } else {
                $("#user-panel-primary-color-picker").val(userPrimaryText);
            }
            
            const userBorderText = $("#user-panel-border-color").val();
            $("#user-panel-border-color-picker").val(extractHexFromGradient(userBorderText) || userBorderText);
            
            const userShadowText = $("#user-panel-shadow-color").val();
            // Extract hex from rgba if possible
            const userRgbaMatch = userShadowText.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
            if (userRgbaMatch) {
                const r = parseInt(userRgbaMatch[1]).toString(16).padStart(2, '0');
                const g = parseInt(userRgbaMatch[2]).toString(16).padStart(2, '0');
                const b = parseInt(userRgbaMatch[3]).toString(16).padStart(2, '0');
                $("#user-panel-shadow-color-picker").val(`#${r}${g}${b}`);
            } else {
                $("#user-panel-shadow-color-picker").val(extractHexFromGradient(userShadowText) || userShadowText);
            }
        }
        
        // Function to update settings and apply colors
        function updateColorSettingsAndApply() {
            // Update the extension settings with new color values
            extension_settings[MODULE_NAME].botPanelColors = {
                primary: $("#bot-panel-primary-color").val(),
                border: $("#bot-panel-border-color").val(),
                shadow: $("#bot-panel-shadow-color").val()
            };
            
            extension_settings[MODULE_NAME].userPanelColors = {
                primary: $("#user-panel-primary-color").val(),
                border: $("#user-panel-border-color").val(),
                shadow: $("#user-panel-shadow-color").val()
            };
            
            saveSettingsDebounced();
            
            // Apply the new colors to the panels
            updatePanelStyles();
            
            // Show a confirmation message
            toastr.success('Panel colors updated successfully!', 'Outfit Colors');
        }
        
        // Initialize color pickers with current values when the settings UI loads
        setTimeout(updateColorPickersFromText, 100);

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

    // Function to detect if the user is on a mobile device
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768 || // Common mobile breakpoint
               ('ontouchstart' in window) || // Has touch capabilities
               (navigator.maxTouchPoints > 1); // Has multiple touch points
    }

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

    // Helper function to generate a simple hash from text for use as instance ID
    function generateInstanceIdFromText(text) {
        let hash = 0;
        const str = text.substring(0, 100); // Only use first 100 chars to keep ID manageable
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Convert to positive and return string representation
        return Math.abs(hash).toString(36);
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
