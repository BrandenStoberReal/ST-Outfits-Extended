// Import various string processing utilities
import { replaceAll as replaceAllStr, extractCommands, extractMacros, safeGet } from '../utils/StringProcessor.js';

// Import LLM utility for outfit generation
import { LLMUtility } from '../utils/LLMUtility.js';

export class AutoOutfitSystem {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isEnabled = false;
        this.systemPrompt = this.getDefaultPrompt();
        this.connectionProfile = null; // Store connection profile for alternative LLM
        // Removed regex commandPattern - now using extractCommands function
        this.isProcessing = false;
        this.consecutiveFailures = 0;
        this.maxConsecutiveFailures = 5;
        this.eventHandler = null;
        this.maxRetries = 3;
        this.retryDelay = 2000;
        this.currentRetryCount = 0;
        this.commandQueue = [];
        this.isProcessingQueue = false;
        this.processingTimeout = null;
        
        // Track initialization state
        this.appInitialized = false;
        
        // Add a timestamp to track when the last successful processing occurred
        this.lastSuccessfulProcessing = null;
    }

    getDefaultPrompt() {
        return `Analyze the recent conversation for any mentions of the character putting on, wearing, removing, or changing clothing items or accessories.
        
CONTEXT:
Current outfit for <BOT>:
{{getglobalvar::<BOT>_headwear}} | {{getglobalvar::<BOT>_topwear}} | {{getglobalvar::<BOT>_topunderwear}} | {{getglobalvar::<BOT>_bottomwear}} | {{getglobalvar::<BOT>_bottomunderwear}} | {{getglobalvar::<BOT>_footwear}} | {{getglobalvar::<BOT>_footunderwear}}
Accessories: {{getglobalvar::<BOT>_head-accessory}} | {{getglobalvar::<BOT>_ears-accessory}} | {{getglobalvar::<BOT>_eyes-accessory}} | {{getglobalvar::<BOT>_mouth-accessory}} | {{getglobalvar::<BOT>_neck-accessory}} | {{getglobalvar::<BOT>_body-accessory}} | {{getglobalvar::<BOT>_arms-accessory}} | {{getglobalvar::<BOT>_hands-accessory}} | {{getglobalvar::<BOT>_waist-accessory}} | {{getglobalvar::<BOT>_bottom-accessory}} | {{getglobalvar::<BOT>_legs-accessory}} | {{getglobalvar::<BOT>_foot-accessory}}

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

    enable() {
        if (this.isEnabled) {return '[Outfit System] Auto outfit updates already enabled.';}
        
        this.isEnabled = true;
        this.consecutiveFailures = 0;
        this.currentRetryCount = 0;
        this.setupEventListeners();
        return '[Outfit System] Auto outfit updates enabled.';
    }

    disable() {
        if (!this.isEnabled) {return '[Outfit System] Auto outfit updates already disabled.';}
        
        this.isEnabled = false;
        this.removeEventListeners();
        this.commandQueue = [];
        return '[Outfit System] Auto outfit updates disabled.';
    }

    setupEventListeners() {
        this.removeEventListeners();
        
        try {
            const context = window.getContext();

            if (!context || !context.eventSource || !context.event_types) {
                console.error('[AutoOutfitSystem] Context not ready for event listeners');
                return;
            }
            
            const { eventSource, event_types } = context;
            
            // Use MESSAGE_RECEIVED instead of CHARACTER_MESSAGE_RENDERED
            // This event fires when new messages are added to chat (before rendering)
            this.eventHandler = (data) => {
                // Only process AI messages (not user messages) and only after app is initialized
                if (this.isEnabled && !this.isProcessing && this.appInitialized && 
                    data && !data.is_user) {
                    console.log('[AutoOutfitSystem] New AI message received, processing...');
                    // Clear any existing timeout to prevent multiple simultaneous processing
                    if (this.processingTimeout) {
                        clearTimeout(this.processingTimeout);
                    }
                    
                    // Add a delay before processing to ensure message is fully rendered
                    this.processingTimeout = setTimeout(() => {
                        this.processOutfitCommands().catch(error => {
                            console.error('Auto outfit processing failed:', error);
                            this.consecutiveFailures++;
                        });
                    }, 1000); // Shorter delay since we're processing earlier
                }
            };
            
            eventSource.on(event_types.MESSAGE_RECEIVED, this.eventHandler);
            console.log('[AutoOutfitSystem] Event listener registered for MESSAGE_RECEIVED');
        } catch (error) {
            console.error('[AutoOutfitSystem] Failed to set up event listeners:', error);
        }
    }

    removeEventListeners() {
        try {
            if (this.eventHandler) {
                const context = window.getContext();

                if (context && context.eventSource && context.event_types) {
                    context.eventSource.off(context.event_types.MESSAGE_RECEIVED, this.eventHandler);
                }
                this.eventHandler = null;
                // Clear any pending timeout
                if (this.processingTimeout) {
                    clearTimeout(this.processingTimeout);
                    this.processingTimeout = null;
                }
                console.log('[AutoOutfitSystem] Event listener removed');
            }
        } catch (error) {
            console.error('[AutoOutfitSystem] Failed to remove event listeners:', error);
        }
    }

    // Mark app as initialized to prevent processing of existing messages
    markAppInitialized() {
        if (!this.appInitialized) {
            this.appInitialized = true;
            console.log('[AutoOutfitSystem] App marked as initialized - will now process new AI messages');
        }
    }

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
        
        // Check if the outfit manager is properly initialized
        if (!this.outfitManager || !this.outfitManager.setCharacter) {
            console.error('[AutoOutfitSystem] Outfit manager not properly initialized');
            return;
        }
        
        this.isProcessing = true;
        this.currentRetryCount = 0;
        
        try {
            await this.processWithRetry();
            // Record the successful processing time
            this.lastSuccessfulProcessing = new Date();
        } catch (error) {
            console.error('Outfit command processing failed after retries:', error);
            this.consecutiveFailures++;
            this.showPopup(`Outfit check failed ${this.consecutiveFailures} time(s).`, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    async processWithRetry() {
        while (this.currentRetryCount < this.maxRetries) {
            try {
                this.showPopup(`Checking for outfit changes... (Attempt ${this.currentRetryCount + 1}/${this.maxRetries})`, 'info');
                
                await this.executeGenCommand();
                
                this.consecutiveFailures = 0;
                this.showPopup('Outfit check completed.', 'success');
                return; // Success!
                
            } catch (error) {
                this.currentRetryCount++;
                
                if (this.currentRetryCount < this.maxRetries) {
                    console.log(`[AutoOutfitSystem] Attempt ${this.currentRetryCount} failed, retrying in ${this.retryDelay}ms...`, error);
                    await this.delay(this.retryDelay);
                } else {
                    throw error; // All retries exhausted
                }
            }
        }
    }

    async executeGenCommand() {
        const recentMessages = this.getLastMessages(3);

        if (!recentMessages.trim()) {
            throw new Error('No valid messages to process');
        }

        // Replace macros in the system prompt before sending to the AI
        const processedSystemPrompt = this.replaceMacrosInPrompt(this.systemPrompt);
        const promptText = `${processedSystemPrompt}\n\nRecent Messages:\n${recentMessages}\n\nOutput:`;
        
        console.log('[AutoOutfitSystem] Generating outfit commands with unified LLM utility...');
        
        try {
            const context = window.getContext();

            if (!context) {
                throw new Error('Context not available for LLM generation');
            }
            
            const result = await LLMUtility.generateWithProfile(
                promptText,
                'You are an outfit change detection system. Analyze the conversation and output outfit commands when clothing changes occur.',
                context,
                this.connectionProfile
            );
            
            console.log('[AutoOutfitSystem] Generated result:', result);
            
            const commands = this.parseGeneratedText(result);
            
            if (commands.length > 0) {
                console.log(`[AutoOutfitSystem] Found ${commands.length} commands, processing...`);
                await this.processCommandBatch(commands);
            } else {
                console.log('[AutoOutfitSystem] No outfit commands found in response');
                // Don't show a warning for empty responses when there are no changes - this is normal
                if (result.trim() !== '[none]') {
                    // Only show the warning if the LLM didn't return an explicit "no changes" message
                    this.showPopup('LLM could not parse any clothing data from the character.', 'warning');
                }
            }
            
        } catch (error) {
            console.error('[AutoOutfitSystem] Generation failed, trying fallback:', error);
            await this.tryFallbackGeneration(promptText);
        }
    }

    replaceMacrosInPrompt(prompt) {
        try {
            // Get current character name from the outfit manager
            const characterName = this.outfitManager.character || '<BOT>';
            // Normalize the character name to create the proper variable name format
            const normalizedCharName = characterName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

            // Replace all <BOT> instances with the actual character name
            let processedPrompt = replaceAllStr(prompt, '<BOT>', characterName);
            
            // Replace {{user}} with the current active persona name
            // Get the current persona name from the active chat
            const userName = this.getUserName();
            
            processedPrompt = replaceAllStr(processedPrompt, '{{user}}', userName);

            // Extract all macros from the prompt
            const macros = extractMacros(processedPrompt);
            
            // Process each macro and replace with actual values
            for (const { fullMacro, varName } of macros) {
                let value = 'None'; // Default value if not found

                // Check if it's a character-specific variable (checking multiple possible formats)
                if (varName.startsWith(`${characterName}_`) || varName.startsWith(`${normalizedCharName}_`)) {
                    // Extract slot name after the character name prefix
                    let slot;

                    if (varName.startsWith(`${characterName}_`)) {
                        slot = varName.substring(characterName.length + 1);
                    } else if (varName.startsWith(`${normalizedCharName}_`)) {
                        slot = varName.substring(normalizedCharName.length + 1);
                    }
                    
                    // Try to get the value using both formats to ensure compatibility
                    const originalFormatVarName = `${characterName}_${slot}`;
                    const normalizedFormatVarName = `${normalizedCharName}_${slot}`;
                    
                    // Use safeGet to access global variables
                    const globalVars = safeGet(window, 'extension_settings.variables.global', {});
                    
                    if (globalVars[originalFormatVarName] !== undefined) {
                        value = globalVars[originalFormatVarName];
                    } else if (globalVars[normalizedFormatVarName] !== undefined) {
                        value = globalVars[normalizedFormatVarName];
                    }
                }
                // Check if it's a user variable
                else if (varName.startsWith('User_')) {
                    try {
                        const globalVars = safeGet(window, 'extension_settings.variables.global', {});

                        if (globalVars[varName] !== undefined) {
                            value = globalVars[varName];
                        }
                    } catch (error) {
                        console.warn('Could not access global variables for macro replacement:', error);
                    }
                }
                
                // Replace the macro with the actual value
                processedPrompt = replaceAllStr(processedPrompt, fullMacro, value);
            }
            
            return processedPrompt;
        } catch (error) {
            console.error('[AutoOutfitSystem] Error in replaceMacrosInPrompt:', error);
            // Return the original prompt if processing fails
            return prompt;
        }
    }

    async tryFallbackGeneration(originalPromptText) {
        // Process the prompt to replace any macros (though they should already be replaced, 
        // this is a safety measure)
        const processedPromptText = this.replaceMacrosInPrompt(originalPromptText);
        
        try {
            const context = window.getContext();
            let result;
            
            if (context.generateQuietPrompt) {
                result = await LLMUtility.generateWithProfile(
                    processedPromptText,
                    'You are an outfit change detection system. Analyze the conversation and output outfit commands when clothing changes occur.',
                    context,
                    this.connectionProfile
                );
            } else if (context.generateRaw) {
                // Try standard generateRaw as a fallback if generateQuietPrompt is not available
                result = await LLMUtility.generateWithProfile(
                    processedPromptText,
                    'You are an outfit change detection system. Analyze the conversation and output outfit commands when clothing changes occur.',
                    context,
                    this.connectionProfile
                );
            } else {
                // If neither method is available, use the connection profile method
                result = await this.generateWithProfile(processedPromptText);
            }
            
            console.log('[AutoOutfitSystem] Fallback result:', result);
            
            const commands = this.parseGeneratedText(result);
            
            if (commands.length > 0) {
                await this.processCommandBatch(commands);
            } else {
                console.log('[AutoOutfitSystem] No outfit commands found in fallback response');
                // Don't show a warning for empty responses when there are no changes - this is normal
                if (result.trim() !== '[none]') {
                    // Only show the warning if the LLM didn't return an explicit "no changes" message
                    this.showPopup('LLM could not parse any clothing data from the character.', 'warning');
                }
            }
            
        } catch (fallbackError) {
            console.error('[AutoOutfitSystem] Fallback generation also failed:', fallbackError);
            throw new Error(`Both generation methods failed: ${fallbackError.message}`);
        }
    }

    parseGeneratedText(text) {
        if (!text) {return [];}
        
        // Check if the text is just "[none]" (meaning no changes detected)
        if (text.trim() === '[none]') {
            console.log('[AutoOutfitSystem] No outfit changes detected by LLM');
            return [];
        }
        
        // Use the non-regex function to extract commands
        const commands = extractCommands(text);
        
        console.log(`[AutoOutfitSystem] Found ${commands.length} commands:`, commands);
        return commands;
    }

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
        
        if (successfulCommands.length > 0 && window.extension_settings?.outfit_tracker?.enableSysMessages) {
            console.log(`[AutoOutfitSystem] Showing ${successfulCommands.length} popup messages`);
            
            const messagesByCharacter = {};

            successfulCommands.forEach(({ message }) => {
                const charName = message.match(/(\w+) put on|removed|changed/)?.[1] || 'Character';

                if (!messagesByCharacter[charName]) {
                    messagesByCharacter[charName] = [];
                }
                messagesByCharacter[charName].push(message);
            });
            
            for (const [charName, messages] of Object.entries(messagesByCharacter)) {
                if (messages.length === 1) {
                    this.showPopup(messages[0], 'info');
                } else {
                    this.showPopup(`${charName} made multiple outfit changes.`, 'info');
                }
                await this.delay(1000);
            }
            
            this.updateOutfitPanel();
        }
        
        if (failedCommands.length > 0) {
            console.warn(`[AutoOutfitSystem] ${failedCommands.length} commands failed:`, failedCommands);
        }
        
        console.log(`[AutoOutfitSystem] Batch completed: ${successfulCommands.length} successful, ${failedCommands.length} failed`);
    }

    async processSingleCommand(command) {
        try {
            // Non-regex approach to parse command
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

    updateOutfitPanel() {
        if (window.botOutfitPanel && window.botOutfitPanel.isVisible) {
            setTimeout(() => {
                try {
                    window.botOutfitPanel.outfitManager.loadOutfit();
                    window.botOutfitPanel.renderContent();
                    console.log('[AutoOutfitSystem] Outfit panel updated');
                } catch (error) {
                    console.error('Failed to update outfit panel:', error);
                }
            }, 500);
        }
    }

    getLastMessages(count = 3) {
        try {
            const context = window.getContext();
            const chat = safeGet(context, 'chat');
            
            if (!chat || !Array.isArray(chat) || chat.length === 0) {
                console.log('[AutoOutfitSystem] No chat or empty chat array');
                return '';
            }
            
            const validMessages = chat.filter(msg => 
                msg && typeof msg === 'object' && 
                typeof msg.mes === 'string' && 
                typeof msg.is_user === 'boolean'
            );
            
            if (validMessages.length === 0) {
                console.log('[AutoOutfitSystem] No valid messages found');
                return '';
            }
            
            const recentMessages = validMessages.slice(-count);

            return recentMessages.map(msg => 
                `${msg.is_user ? 'User' : (safeGet(msg, 'name', 'AI'))}: ${safeGet(msg, 'mes', '')}`
            ).join('\n');
            
        } catch (error) {
            console.error('Error getting last messages:', error);
            return '';
        }
    }

    showPopup(message, type = 'info') {
        try {
            if (typeof toastr !== 'undefined') {
                const options = {
                    timeOut: type === 'error' ? 5000 : 3000,
                    extendedTimeOut: type === 'error' ? 10000 : 5000
                };
                
                switch(type) {
                case 'error':
                    toastr.error(message, 'Outfit System', options);
                    break;
                case 'warning':
                    toastr.warning(message, 'Outfit System', options);
                    break;
                case 'success':
                    toastr.success(message, 'Outfit System', options);
                    break;
                default:
                    toastr.info(message, 'Outfit System', options);
                }
            }
        } catch (error) {
            console.error('Failed to show popup:', error);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

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

    setPrompt(prompt) {
        this.systemPrompt = prompt || this.getDefaultPrompt();
        return '[Outfit System] System prompt updated.';
    }

    // Method to get the processed system prompt with macros replaced
    getProcessedSystemPrompt() {
        return this.replaceMacrosInPrompt(this.systemPrompt);
    }
    
    // Helper method to get the current user's name
    getUserName() {
        // Default fallback
        let userName = 'User';
        
        // Get the context and try to extract persona from the current chat
        const context = window.getContext ? window.getContext() : null;

        if (context && safeGet(context, 'chat')) {
            // Filter messages that are from the user to get their avatars
            const userMessages = safeGet(context, 'chat', []).filter(message => message.is_user);
            
            if (userMessages.length > 0) {
                // Get the most recent user message to determine current persona
                const mostRecentUserMessage = userMessages[userMessages.length - 1];
                
                userName = this.extractUserName(mostRecentUserMessage);
            }
        }
        
        // Fallback: try the old power_user method if we still don't have a name
        if (userName === 'User') {
            if (typeof window.power_user !== 'undefined' && window.power_user && window.power_user.personas && 
                typeof window.user_avatar !== 'undefined' && window.user_avatar) {
                // Get the name from the mapping of avatar to name
                const personaName = window.power_user.personas[window.user_avatar];
                
                // If we found the persona in the mapping, use it; otherwise fall back to name1 or 'User'
                userName = personaName || (typeof window.name1 !== 'undefined' ? window.name1 : 'User');
            } else if (typeof window.name1 !== 'undefined' && window.name1) {
                // Fallback to window.name1 if the above method doesn't work
                userName = window.name1;
            }
        }
        
        return userName;
    }

    resetToDefaultPrompt() {
        this.systemPrompt = this.getDefaultPrompt();
        return '[Outfit System] Reset to default prompt.';
    }
    
    setConnectionProfile(profile) {
        this.connectionProfile = profile;
        return `[Outfit System] Connection profile set to: ${profile || 'default'}`;
    }
    
    getConnectionProfile() {
        return this.connectionProfile;
    }
    

    


    // Helper method to generate with a specific connection profile
    async generateWithProfile(originalPromptText) {
        // Process the prompt to replace any macros (though they should already be replaced, 
        // this is a safety measure)
        const processedPromptText = this.replaceMacrosInPrompt(originalPromptText);
        
        // Use the unified LLM utility with profile
        return LLMUtility.generateWithProfile(
            processedPromptText,
            'You are an outfit change detection system. Analyze the conversation and output outfit commands when clothing changes occur.',
            window.getContext(),
            this.connectionProfile
        );
    }

    // Helper function to extract username from message
    extractUserName(mostRecentUserMessage) {
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
        } else if (mostRecentUserMessage.name) {
            // If force_avatar doesn't exist, try to get name from the message itself
            userName = mostRecentUserMessage.name;
        }
        
        return userName;
    }


}