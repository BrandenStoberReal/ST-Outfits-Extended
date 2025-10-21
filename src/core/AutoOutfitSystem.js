/**
 * AutoOutfitSystem - Refactored class to handle automatic outfit updates
 * This system monitors chat messages and automatically updates character outfits
 * based on detected clothing changes in the conversation
 */

import { extractCommands, replaceAll } from '../utils/StringProcessor.js';
import { generateOutfitFromLLM } from '../services/LLMService.js';
import { customMacroSystem } from '../utils/CustomMacroSystem.js';
import { outfitStore } from '../common/Store.js';

export class AutoOutfitSystem {
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
    }

    /**
     * Get the default system prompt for outfit detection
     */
    getDefaultPrompt() {
        return `Analyze the recent conversation for any mentions of the character putting on, wearing, removing, or changing clothing items or accessories.
        
CONTEXT:
Current outfit for {{char}}:
{{char_headwear}} | {{char_topwear}} | {{char_topunderwear}} | {{char_bottomwear}} | {{char_bottomunderwear}} | {{char_footwear}} | {{char_footunderwear}}
Accessories: {{char_head-accessory}} | {{char_ears-accessory}} | {{char_eyes-accessory}} | {{char_mouth-accessory}} | {{char_neck-accessory}} | {{char_body-accessory}} | {{char_arms-accessory}} | {{char_hands-accessory}} | {{char_waist-accessory}} | {{char_bottom-accessory}} | {{char_legs-accessory}} | {{char_foot-accessory}}

TASK:
If clothing/accessory changes occur, output only outfit-system commands (one per line) in this exact format:
outfit-system_wear_headwear("item name")
outfit-system_remove_topwear()
outfit-system_change_bottomwear("new item name")

SLOTS:
Clothing: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear
Accessories: head-accessory, ears-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory

NOTES:
- Only output commands for explicit clothing changes
- Use "change" to modify existing items ("White Blouse" to "White Blouse (unbuttoned)")
- If no changes detected, output: [none]
- Output only commands, no explanations`;
    }

    /**
     * Enable the auto outfit system
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
            
            const { eventSource, event_types } = context;

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
     */
    markAppInitialized() {
        if (!this.appInitialized) {
            this.appInitialized = true;
            console.log('[AutoOutfitSystem] App marked as initialized - will now process new AI messages');
        }
    }

    /**
     * Process outfit commands based on chat context
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
            const result = await generateOutfitFromLLM({ prompt: promptText }, this);

            console.log('[AutoOutfitSystem] Generated result:', result);

            const commands = this.parseGeneratedText(result);

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

    /**
     * Replace macros in the system prompt
     */
    replaceMacrosInPrompt(prompt) {
        return customMacroSystem.replaceMacrosInText(prompt);
    }

    /**
     * Parse the generated text to extract commands
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
     */
    async processCommandBatch(commands) {
        if (!commands || commands.length === 0) {
            console.log('[AutoOutfitSystem] No commands to process');
            return;
        }

        console.log(`[AutoOutfitSystem] Processing batch of ${commands.length} commands`);
        
        const successfulCommands = [];
        const failedCommands = [];
        
        for (const command of commands) {
            try {
                const result = await this.processSingleCommand(command);

                if (result.success) {
                    successfulCommands.push(result);
                } else {
                    failedCommands.push({ command, error: result.error });
                }
            } catch (error) {
                failedCommands.push({ command, error: error.message });
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
        
        console.log(`[AutoOutfitSystem] Batch completed: ${successfulCommands.length} successful, ${failedCommands.length} failed`);
    }

    /**
     * Get the active character name without using regex
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
     */
    parseCommand(command) {
        if (!command || typeof command !== 'string') {
            return null;
        }

        // Check if command starts with 'outfit-system_'
        if (!command.startsWith('outfit-system_')) {
            return null;
        }

        // Find the first underscore after 'outfit-system_'
        let index = 'outfit-system_'.length;
        const actionStart = index;
        const firstUnderscoreAfterSystem = command.indexOf('_', index);
        
        if (firstUnderscoreAfterSystem === -1) {
            return null; // No action found
        }

        const action = command.substring(actionStart, firstUnderscoreAfterSystem);
        
        // Check if action is valid
        if (!['wear', 'remove', 'change'].includes(action)) {
            return null;
        }

        const slotStart = firstUnderscoreAfterSystem + 1;
        const parenIndex = command.indexOf('(', slotStart);
        
        if (parenIndex === -1) {
            return null; // No opening parenthesis found
        }

        const slot = command.substring(slotStart, parenIndex);
        
        // Validate slot name - check if it contains only valid characters
        if (!this.isValidSlotName(slot)) {
            return null;
        }

        // Extract the value inside parentheses
        const parenStart = parenIndex + 1;
        
        // Check if it's an empty call like outfit-system_remove_headwear()
        if (command[parenStart] === ')') {
            return {
                action,
                slot,
                value: ''
            };
        }
        
        // Check if it starts with a quote
        if (command[parenStart] !== '"') {
            return null; // Invalid format
        }

        const valueStart = parenStart + 1;
        let valueEnd = -1;
        
        // Find the closing quote, handling escaped quotes
        let i = valueStart;

        while (i < command.length - 1) { // -1 to account for last char being 
            if (command[i] === '"') {
                // Check if this quote is not escaped (i.e., not preceded by a backslash)
                let backslashes = 0;
                let j = i - 1;

                while (j >= 0 && command[j] === '\\') {
                    backslashes++;
                    j--;
                }
                
                // If even number of backslashes before quote, it's not escaped
                if (backslashes % 2 === 0) {
                    valueEnd = i;
                    break;
                }
            }
            i++;
        }

        if (valueEnd === -1) {
            return null; // No closing quote found
        }

        const value = command.substring(valueStart, valueEnd);
        
        // Check if the quote is followed by a closing parenthesis
        if (command[valueEnd + 1] !== ')') {
            return null; // Invalid format
        }

        // Ensure the command ends with ')', or has nothing after ')'
        if (valueEnd + 2 < command.length) {
            // Allow whitespace after the closing parenthesis
            const remaining = command.substring(valueEnd + 2).trim();

            if (remaining !== '') {
                return null; // Invalid format
            }
        }

        return {
            action,
            slot,
            value
        };
    }

    /**
     * Check if a slot name is valid (contains only alphanumeric characters, underscores, and hyphens)
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
     */
    replaceAll(str, searchValue, replaceValue) {
        if (!searchValue) {return str;}
        
        // Prevent infinite loops when the replacement value contains the search value
        if (searchValue === replaceValue) {return str;}
        
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
     */
    async processSingleCommand(command) {
        try {
            // Parse command without using regex
            const parsedCommand = this.parseCommand(command);

            if (!parsedCommand) {
                throw new Error(`Invalid command format: ${command}`);
            }

            const { action, slot, value } = parsedCommand;
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
     */
    async executeCommand(action, slot, value) {
        const validSlots = [...this.outfitManager.slots];

        if (!validSlots.includes(slot)) {
            throw new Error(`Invalid slot: ${slot}. Valid slots: ${validSlots.join(', ')}`);
        }

        if (!['wear', 'remove', 'change'].includes(action)) {
            throw new Error(`Invalid action: ${action}. Valid actions: wear, remove, change`);
        }

        return this.outfitManager.setOutfitItem(slot, action === 'remove' ? 'None' : value);
    }

    /**
     * Update the outfit panel UI
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
     */
    getLastMessages(count = 3) {
        try {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext();
            const chat = context?.chat;
            
            if (!chat || !Array.isArray(chat) || chat.length === 0) {
                return '';
            }
            
            return chat.slice(-count).map(msg => {
                if (!msg || typeof msg.mes !== 'string') {return '';}
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
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get system status
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
     */
    setPrompt(prompt) {
        this.systemPrompt = prompt || this.getDefaultPrompt();
        return '[Outfit System] System prompt updated.';
    }

    /**
     * Get the processed system prompt
     */
    getProcessedSystemPrompt() {
        return this.replaceMacrosInPrompt(this.systemPrompt);
    }
    
    /**
     * Get current user name
     */
    getUserName() {
        return customMacroSystem.getCurrentUserName();
    }

    /**
     * Reset to default prompt
     */
    resetToDefaultPrompt() {
        this.systemPrompt = this.getDefaultPrompt();
        return '[Outfit System] Reset to default prompt.';
    }
    
    /**
     * Set connection profile
     */
    setConnectionProfile(profile) {
        this.connectionProfile = profile;
        return `[Outfit System] Connection profile set to: ${profile || 'default'}`;
    }
    
    /**
     * Get connection profile
     */
    getConnectionProfile() {
        return this.connectionProfile;
    }
}