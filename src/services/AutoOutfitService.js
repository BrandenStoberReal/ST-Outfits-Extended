/**
 * AutoOutfitSystem - Refactored class to handle automatic outfit updates
 * This system monitors chat messages and automatically updates character outfits
 * based on detected clothing changes in the conversation
 */

import {extractCommands} from '../processors/StringProcessor.js';
import {generateOutfitFromLLM} from './LLMService.js';
import {customMacroSystem} from './CustomMacroService.js';
import {outfitStore} from '../common/Store.js';

export class AutoOutfitService {
    /**
     * Creates a new AutoOutfitSystem instance.
     * @param {object} outfitManager - The outfit manager to use for updating outfits
     */
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isEnabled = false;
        this.systemPrompt = this.getDefaultPrompt();
        this.connectionProfile = null;
        this.isProcessing = false;
        this.consecutiveFailures = 0;
        this.maxConsecutiveFailures = 5;
        this.eventHandler = null;
        this.maxRetries = 3;
        this.retryDelay = 2000;
        this.currentRetryCount = 0;
        this.appInitialized = false;
        this.lastSuccessfulProcessing = null;
        this.llmOutput = '';
        this.generatedCommands = [];
    }

    /**
     * Get the default system prompt for outfit detection
     * @returns {string} The default system prompt used for outfit detection by the LLM
     */
    getDefaultPrompt() {
        return `You are a sophisticated outfit management AI. Your task is to analyze conversation snippets and identify any changes to a character's clothing or accessories. Based on your analysis, you must output a series of commands to update the character's outfit accordingly.

**CONTEXT**
Current outfit for {{char}}:
- Headwear: {{char_headwear}}
- Topwear: {{char_topwear}}
- Top Underwear: {{char_topunderwear}}
- Bottomwear: {{char_bottomwear}}
- Bottom Underwear: {{char_bottomunderwear}}
- Footwear: {{char_footwear}}
- Foot Underwear: {{char_footunderwear}}
- Accessories:
  - Head: {{char_head-accessory}}
  - Ears: {{char_ears-accessory}}
  - Eyes: {{char_eyes-accessory}}
  - Mouth: {{char_mouth-accessory}}
  - Neck: {{char_neck-accessory}}
  - Body: {{char_body-accessory}}
  - Arms: {{char_arms-accessory}}
  - Hands: {{char_hands-accessory}}
  - Waist: {{char_waist-accessory}}
  - Bottom: {{char_bottom-accessory}}
  - Legs: {{char_legs-accessory}}
  - Foot: {{char_foot-accessory}}

**TASK**
Based on the provided conversation, generate a sequence of commands to reflect any and all changes to the character's outfit.

**COMMANDS**
You have the following commands at your disposal:
- \`outfit-system_wear_<slot>("item name")\`: To put on a new item.
- \`outfit-system_remove_<slot>()\`: To take off an item.
- \`outfit-system_change_<slot>("new item name")\`: To modify an existing item (e.g., from "White Blouse" to "White Blouse (unbuttoned)").
- \`outfit-system_replace_<slot>("new item name")\`: To replace an existing item with a new one.
- \`outfit-system_unequip_<slot>()\`: To remove an item from a specific slot.

**SLOTS**
- Clothing: \`headwear\`, \`topwear\`, \`topunderwear\`, \`bottomwear\`, \`bottomunderwear\`, \`footwear\`, \`footunderwear\`
- Accessories: \`head-accessory\`, \`ears-accessory\`, \`eyes-accessory\`, \`mouth-accessory\`, \`neck-accessory\`, \`body-accessory\`, \`arms-accessory\`, \`hands-accessory\`, \`waist-accessory\`, \`bottom-accessory\`, \`legs-accessory\`, \`foot-accessory\`

**INSTRUCTIONS**
- Only output commands for explicit clothing changes.
- If no changes are detected, output only \`[none]\`.
- Do not include any explanations or conversational text in your output.
- Ensure that the item names are enclosed in double quotes.

**EXAMPLES**
- **User:** I'm feeling a bit cold.
  **{{char}}:** I'll put on my favorite sweater.
  **Output:**
  \`outfit-system_wear_topwear("Favorite Sweater")\`

- **User:** Your shoes are untied.
  **{{char}}:** Oh, thanks for letting me know. I'll take them off and tie them properly.
  **Output:**
  \`outfit-system_remove_footwear()\`

- **User:** That's a nice hat.
  **{{char}}:** Thanks! It's new. I'll take it off for a moment to show you.
  **Output:**
  \`outfit-system_unequip_headwear()\`

- **User:** I like your shirt.
  **{{char}}:** Thanks! I think I'll unbutton it a bit.
  **Output:**
  \`outfit-system_change_topwear("Shirt (unbuttoned)")\`

- **User:** It's getting warm in here.
  **{{char}}:** I agree. I'll take off my jacket and put on this t-shirt instead.
  **Output:**
  \`outfit-system_replace_topwear("T-shirt")\`
`;
    }

    /**
     * Enable the auto outfit system
     * @returns {string} A status message indicating the result of the operation
     */
    enable() {
        if (this.isEnabled) {
            return '[Outfit System] Auto outfit updates already enabled.';
        }

        this.isEnabled = true;
        this.consecutiveFailures = 0;
        this.currentRetryCount = 0;
        this.setupEventListeners();
        return '[Outfit System] Auto outfit updates enabled.';
    }

    /**
     * Disable the auto outfit system
     * @returns {string} A status message indicating the result of the operation
     */
    disable() {
        if (!this.isEnabled) {
            return '[Outfit System] Auto outfit updates already disabled.';
        }

        this.isEnabled = false;
        this.removeEventListeners();
        return '[Outfit System] Auto outfit updates disabled.';
    }

    /**
     * Set up event listeners for chat messages
     * @returns {void}
     */
    setupEventListeners() {
        this.removeEventListeners();

        try {
            // Try to get the context from SillyTavern first, then fall back to window.getContext
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

            if (!context || !context.eventSource || !context.event_types) {
                console.error('[AutoOutfitSystem] Context not ready for event listeners');
                return;
            }

            const {eventSource, event_types} = context;

            this.eventHandler = (data) => {
                if (this.isEnabled && !this.isProcessing && this.appInitialized && data && !data.is_user) {
                    console.log('[AutoOutfitSystem] New AI message received, processing...');

                    // Add a delay to ensure the message has been fully processed
                    setTimeout(() => {
                        this.processOutfitCommands().catch(error => {
                            console.error('Auto outfit processing failed:', error);
                            this.consecutiveFailures++;
                        });
                    }, 1000);
                }
            };

            eventSource.on(event_types.MESSAGE_RECEIVED, this.eventHandler);
            console.log('[AutoOutfitSystem] Event listener registered for MESSAGE_RECEIVED');
        } catch (error) {
            console.error('[AutoOutfitSystem] Failed to set up event listeners:', error);
        }
    }

    /**
     * Remove event listeners
     * @returns {void}
     */
    removeEventListeners() {
        try {
            if (this.eventHandler) {
                const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

                if (context && context.eventSource && context.event_types) {
                    context.eventSource.off(context.event_types.MESSAGE_RECEIVED, this.eventHandler);
                }
                this.eventHandler = null;
                console.log('[AutoOutfitSystem] Event listener removed');
            }
        } catch (error) {
            console.error('[AutoOutfitSystem] Failed to remove event listeners:', error);
        }
    }

    /**
     * Mark the app as initialized (allows processing to begin)
     * @returns {void}
     */
    markAppInitialized() {
        if (!this.appInitialized) {
            this.appInitialized = true;
            console.log('[AutoOutfitSystem] App marked as initialized - will now process new AI messages');
        }
    }

    /**
     * Process outfit commands based on chat context
     * @returns {Promise<void>} A promise that resolves when processing is complete
     */
    async processOutfitCommands() {
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            this.disable();
            this.showPopup('Auto outfit updates disabled due to repeated failures.', 'error');
            return;
        }

        if (this.isProcessing) {
            console.log('[AutoOutfitSystem] Already processing, skipping');
            return;
        }

        if (!this.outfitManager || !this.outfitManager.setCharacter) {
            console.error('[AutoOutfitSystem] Outfit manager not properly initialized');
            return;
        }

        this.isProcessing = true;
        this.currentRetryCount = 0;

        try {
            await this.processWithRetry();
            this.lastSuccessfulProcessing = new Date();
        } catch (error) {
            console.error('Outfit command processing failed after retries:', error);
            this.consecutiveFailures++;
            this.showPopup(`Outfit check failed ${this.consecutiveFailures} time(s).`, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process with retry mechanism
     * @returns {Promise<void>} A promise that resolves when the processing is complete
     * @throws {Error} If all retry attempts fail
     */
    async processWithRetry() {
        while (this.currentRetryCount < this.maxRetries) {
            try {
                this.showPopup(`Checking for outfit changes... (Attempt ${this.currentRetryCount + 1}/${this.maxRetries})`, 'info');
                await this.executeGenCommand();
                this.consecutiveFailures = 0;
                this.showPopup('Outfit check completed.', 'success');
                return;
            } catch (error) {
                this.currentRetryCount++;
                if (this.currentRetryCount < this.maxRetries) {
                    console.log(`[AutoOutfitSystem] Attempt ${this.currentRetryCount} failed, retrying in ${this.retryDelay}ms...`, error);
                    await this.delay(this.retryDelay);
                } else {
                    throw error;
                }
            }
        }
    }

    /**
     * Execute the generation command
     * @returns {Promise<void>} A promise that resolves when the generation command is complete
     * @throws {Error} If there are no valid messages to process or generation fails
     */
    async executeGenCommand() {
        const recentMessages = this.getLastMessages(3);

        if (!recentMessages.trim()) {
            throw new Error('No valid messages to process');
        }

        const processedSystemPrompt = this.replaceMacrosInPrompt(this.systemPrompt);
        const promptText = `${processedSystemPrompt}\n\nRecent Messages:\n${recentMessages}\n\nOutput:`;

        console.log('[AutoOutfitSystem] Generating outfit commands with LLMService...');

        try {
            const result = await generateOutfitFromLLM({prompt: promptText}, this);

            this.llmOutput = result; // Store the LLM output
            console.log('[AutoOutfitSystem] Generated result:', result);

            const commands = this.parseGeneratedText(result);

            this.generatedCommands = commands; // Store the generated commands

            if (commands.length > 0) {
                console.log(`[AutoOutfitSystem] Found ${commands.length} commands, processing...`);
                await this.processCommandBatch(commands);
            } else {
                console.log('[AutoOutfitSystem] No outfit commands found in response');
                if (result.trim() !== '[none]') {
                    this.showPopup('LLM could not parse any clothing data from the character.', 'warning');
                }
            }
        } catch (error) {
            console.error('[AutoOutfitSystem] Generation failed:', error);
            throw error;
        }
    }

    getLlmOutput() {
        return {
            llmOutput: this.llmOutput,
            generatedCommands: this.generatedCommands,
        };
    }

    /**
     * Replace macros in the system prompt
     * @param {string} prompt - The prompt to replace macros in
     * @returns {string} The prompt with macros replaced
     */
    replaceMacrosInPrompt(prompt) {
        return customMacroSystem.replaceMacrosInText(prompt);
    }

    /**
     * Parse the generated text to extract commands
     * @param {string} text - The text to parse for commands
     * @returns {Array<string>} An array of extracted outfit commands
     */
    parseGeneratedText(text) {
        if (!text || text.trim() === '[none]') {
            return [];
        }

        const commands = extractCommands(text);

        console.log(`[AutoOutfitSystem] Found ${commands.length} commands:`, commands);
        return commands;
    }

    /**
     * Process a batch of commands
     * @param {Array<string>} commands - An array of outfit command strings to process
     * @returns {Promise<void>} A promise that resolves when all commands in the batch are processed
     */
    async processCommandBatch(commands) {
        if (!commands || commands.length === 0) {
            console.log('[AutoOutfitSystem] No commands to process');
            return;
        }

        console.log(`[AutoOutfitSystem] Processing batch of ${commands.length} commands`);

        const successfulCommands = [];
        const failedCommands = [];
        const lowConfidenceCommands = [];

        for (const command of commands) {
            try {
                const confidence = this.calculateConfidenceScore(command);

                if (confidence < 0.7) {
                    lowConfidenceCommands.push({command, confidence});
                    continue;
                }

                const result = await this.processSingleCommand(command);

                if (result.success) {
                    successfulCommands.push(result);
                } else {
                    failedCommands.push({command, error: result.error});
                }
            } catch (error) {
                failedCommands.push({command, error: error.message});
                console.error(`Error processing command "${command}":`, error);
            }
        }

        if (successfulCommands.length > 0) {
            // Check if system messages are enabled using the store
            const storeState = outfitStore.getState();
            const enableSysMessages = storeState.settings?.enableSysMessages ?? true;

            if (enableSysMessages) {
                // Get the active character name without using regex
                const activeCharName = this.getActiveCharacterName();
                const message = successfulCommands.length === 1
                    ? `${activeCharName} made an outfit change.`
                    : `${activeCharName} made multiple outfit changes.`;

                this.showPopup(message, 'info');
                await this.delay(1000);

                this.updateOutfitPanel();
            }
        }

        if (failedCommands.length > 0) {
            console.warn(`[AutoOutfitSystem] ${failedCommands.length} commands failed:`, failedCommands);
        }

        if (lowConfidenceCommands.length > 0) {
            console.warn(`[AutoOutfitSystem] ${lowConfidenceCommands.length} commands with low confidence were ignored:`, lowConfidenceCommands);
        }

        console.log(`[AutoOutfitSystem] Batch completed: ${successfulCommands.length} successful, ${failedCommands.length} failed, ${lowConfidenceCommands.length} low confidence`);
    }

    /**
     * Calculate a confidence score for a generated command
     * @param {string} command - The command to analyze
     * @returns {number} A confidence score between 0 and 1
     */
    calculateConfidenceScore(command) {
        const parsed = this.parseCommand(command);

        if (!parsed) {
            return 0;
        }

        let score = 0;
        const {action, slot, value} = parsed;

        // Base score for a valid command structure
        score += 0.5;

        // Increase score for valid actions
        if (['wear', 'remove', 'change', 'replace', 'unequip'].includes(action)) {
            score += 0.2;
        }

        // Increase score for a valid slot
        if (this.outfitManager.slots.includes(slot)) {
            score += 0.2;
        }

        // Increase score if value is present for actions that require it
        if (value && ['wear', 'change', 'replace'].includes(action)) {
            score += 0.1;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Get the active character name without using regex
     * @returns {string} The name of the active character
     */
    getActiveCharacterName() {
        try {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext();

            if (context && context.characters && context.this_chid !== undefined) {
                const character = context.characters[context.this_chid];

                return character?.name || 'Character';
            }
            return 'Character';
        } catch (error) {
            console.error('Error getting active character name:', error);
            return 'Character';
        }
    }

    /**
     * Parse a command string to extract action, slot, and value without using regex
     * @param {string} command - The outfit command string to parse
     * @returns {object|null} An object containing action, slot, and value properties, or null if invalid
     */
    parseCommand(command) {
        if (!command || typeof command !== 'string') {
            return null;
        }

        const commandRegex = /^outfit-system_(wear|remove|change|replace|unequip)_([a-zA-Z0-9_-]+)\((?:"([^"]*)"|)\)$/;
        const match = command.match(commandRegex);

        if (!match) {
            return null;
        }

        const [, action, slot, value] = match;

        return {
            action,
            slot,
            value: value || ''
        };
    }

    /**
     * Check if a slot name is valid (contains only alphanumeric characters, underscores, and hyphens)
     * @param {string} str - The slot name to validate
     * @returns {boolean} True if the slot name is valid, false otherwise
     */
    isValidSlotName(str) {
        if (str.length === 0) {
            return false;
        }

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            if (!((char >= 'a' && char <= 'z') ||
                (char >= 'A' && char <= 'Z') ||
                (char >= '0' && char <= '9') ||
                char === '_' ||
                char === '-')) {
                return false;
            }
        }

        return true;
    }

    /**
     * Replace all occurrences of a substring without using regex
     * @param {string} str - The string to perform replacements on
     * @param {string} searchValue - The substring to search for
     * @param {string} replaceValue - The replacement string
     * @returns {string} The string with all occurrences of searchValue replaced with replaceValue
     */
    replaceAll(str, searchValue, replaceValue) {
        if (!searchValue) {
            return str;
        }

        // Prevent infinite loops when the replacement value contains the search value
        if (searchValue === replaceValue) {
            return str;
        }

        let result = str;
        let index = result.indexOf(searchValue);

        while (index !== -1) {
            result = result.substring(0, index) + replaceValue + result.substring(index + searchValue.length);
            // Move past the replacement value to prevent infinite loops
            index = result.indexOf(searchValue, index + replaceValue.length);
        }

        return result;
    }

    /**
     * Process a single command
     * @param {string} command - The outfit command to process
     * @returns {Promise<object>} An object containing the result of the command execution
     * @throws {Error} If the command format is invalid
     */
    async processSingleCommand(command) {
        try {
            // Parse command without using regex
            const parsedCommand = this.parseCommand(command);

            if (!parsedCommand) {
                throw new Error(`Invalid command format: ${command}`);
            }

            const {action, slot, value} = parsedCommand;
            const cleanValue = value !== undefined ? this.replaceAll(value, '"', '').trim() : '';

            console.log(`[AutoOutfitSystem] Processing: ${action} ${slot} "${cleanValue}"`);

            const message = await this.executeCommand(action, slot, cleanValue);

            return {
                success: true,
                command,
                message,
                action,
                slot,
                value: cleanValue
            };
        } catch (error) {
            return {
                success: false,
                command,
                error: error.message
            };
        }
    }

    /**
     * Execute a specific command on the outfit manager
     * @param {string} action - The action to perform (wear, remove, or change)
     * @param {string} slot - The outfit slot to modify
     * @param {string} value - The value to set for the slot
     * @returns {Promise<string>} A message indicating the result of the command execution
     * @throws {Error} If the slot is invalid or the action is not recognized
     */
    async executeCommand(action, slot, value) {
        const validSlots = [...this.outfitManager.slots];

        if (!validSlots.includes(slot)) {
            throw new Error(`Invalid slot: ${slot}. Valid slots: ${validSlots.join(', ')}`);
        }

        const validActions = ['wear', 'remove', 'change', 'replace', 'unequip'];

        if (!validActions.includes(action)) {
            throw new Error(`Invalid action: ${action}. Valid actions: ${validActions.join(', ')}`);
        }

        let finalAction = action;

        if (action === 'replace') {
            finalAction = 'change';
        } else if (action === 'unequip') {
            finalAction = 'remove';
        }

        return this.outfitManager.setOutfitItem(slot, finalAction === 'remove' ? 'None' : value);
    }

    /**
     * Update the outfit panel UI
     * @returns {void}
     */
    updateOutfitPanel() {
        if (window.botOutfitPanel && window.botOutfitPanel.isVisible) {
            setTimeout(() => {
                try {
                    const outfitInstanceId = window.botOutfitPanel.outfitManager.getOutfitInstanceId();

                    window.botOutfitPanel.outfitManager.loadOutfit(outfitInstanceId);
                    window.botOutfitPanel.renderContent();
                    console.log('[AutoOutfitSystem] Outfit panel updated');
                } catch (error) {
                    console.error('Failed to update outfit panel:', error);
                }
            }, 500);
        }
    }

    /**
     * Get the last N messages from the chat
     * @param {number} count - The number of recent messages to retrieve (default: 3)
     * @returns {string} The last N messages joined with newlines, or an empty string if no chat exists
     */
    getLastMessages(count = 3) {
        try {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext();
            const chat = context?.chat;

            if (!chat || !Array.isArray(chat) || chat.length === 0) {
                return '';
            }

            return chat.slice(-count).map(msg => {
                if (!msg || typeof msg.mes !== 'string') {
                    return '';
                }
                const prefix = msg.is_user ? 'User' : (msg.name || 'AI');

                return `${prefix}: ${msg.mes}`;
            }).join('\n');
        } catch (error) {
            console.error('Error getting last messages:', error);
            return '';
        }
    }

    /**
     * Show a popup notification
     * @param {string} message - The message to display in the popup
     * @param {string} type - The type of notification ('info', 'success', 'warning', or 'error'). Default: 'info'
     * @returns {void}
     */
    showPopup(message, type = 'info') {
        try {
            if (typeof toastr !== 'undefined') {
                const options = {
                    timeOut: type === 'error' ? 5000 : 3000,
                    extendedTimeOut: type === 'error' ? 10000 : 5000
                };

                toastr[type](message, 'Outfit System', options);
            }
        } catch (error) {
            console.error('Failed to show popup:', error);
        }
    }

    /**
     * Simple delay function
     * @param {number} ms - The number of milliseconds to delay
     * @returns {Promise<void>} A promise that resolves after the specified delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get system status
     * @returns {object} An object containing the current status of the auto outfit system
     * @property {boolean} enabled - Whether the auto outfit system is enabled
     * @property {boolean} hasPrompt - Whether the system has a prompt set
     * @property {number} promptLength - The length of the current system prompt
     * @property {boolean} isProcessing - Whether the system is currently processing
     * @property {number} consecutiveFailures - The number of consecutive processing failures
     * @property {number} currentRetryCount - The current retry attempt count
     * @property {number} maxRetries - The maximum number of retry attempts
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            hasPrompt: Boolean(this.systemPrompt),
            promptLength: this.systemPrompt?.length || 0,
            isProcessing: this.isProcessing,
            consecutiveFailures: this.consecutiveFailures,
            currentRetryCount: this.currentRetryCount,
            maxRetries: this.maxRetries
        };
    }

    /**
     * Manual trigger for outfit processing
     * @returns {Promise<void>} A promise that resolves when the manual trigger completes
     */
    async manualTrigger() {
        if (this.isProcessing) {
            this.showPopup('Auto outfit check already in progress.', 'warning');
            return;
        }

        try {
            this.showPopup('Manual outfit check started...', 'info');
            await this.processOutfitCommands();
        } catch (error) {
            this.showPopup(`Manual trigger failed: ${error.message}`, 'error');
        }
    }

    /**
     * Set a custom prompt
     * @param {string} prompt - The custom prompt to set, or null to reset to default
     * @returns {string} A status message indicating the prompt was updated
     */
    setPrompt(prompt) {
        this.systemPrompt = prompt || this.getDefaultPrompt();
        return '[Outfit System] System prompt updated.';
    }

    /**
     * Get the processed system prompt
     * @returns {string} The system prompt with macros replaced
     */
    getProcessedSystemPrompt() {
        return this.replaceMacrosInPrompt(this.systemPrompt);
    }

    /**
     * Get current user name
     * @returns {string} The current user's name
     */
    getUserName() {
        return customMacroSystem.getCurrentUserName();
    }

    /**
     * Reset to default prompt
     * @returns {string} A status message indicating the prompt was reset
     */
    resetToDefaultPrompt() {
        this.systemPrompt = this.getDefaultPrompt();
        return '[Outfit System] Reset to default prompt.';
    }

    /**
     * Set connection profile
     * @param {string} profile - The connection profile to use
     * @returns {string} A status message indicating the profile was set
     */
    setConnectionProfile(profile) {
        this.connectionProfile = profile;
        return `[Outfit System] Connection profile set to: ${profile || 'default'}`;
    }

    /**
     * Get connection profile
     * @returns {string|null} The currently set connection profile, or null if none is set
     */
    getConnectionProfile() {
        return this.connectionProfile;
    }
}