import { replaceAll as replaceAllStr, extractCommands, extractMacros } from './StringProcessor.js';

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
        
        // Track initialization state
        this.appInitialized = false;
    }

    getDefaultPrompt() {
        return `Analyze the character's actions in the recent messages. If the character puts on, wears, removes, or changes any clothing items, output the appropriate outfit commands.

Here is what character is currently wearing:

**<BOT>'s Current Outfit**
Headwear: {{getglobalvar::<BOT>_headwear}}
Topwear: {{getglobalvar::<BOT>_topwear}}
Top Underwear: {{getglobalvar::<BOT>_topunderwear}}
Bottomwear: {{getglobalvar::<BOT>_bottomwear}}
Bottom Underwear: {{getglobalvar::<BOT>_bottomunderwear}}
Footwear: {{getglobalvar::<BOT>_footwear}}
Foot Underwear: {{getglobalvar::<BOT>_footunderwear}}

**<BOT>'s Accessories**
Head Accessory: {{getglobalvar::<BOT>_head-accessory}}
Ears Accessory: {{getglobalvar::<BOT>_ears-accessory}}
Eyes Accessory: {{getglobalvar::<BOT>_eyes-accessory}}
Mouth Accessory: {{getglobalvar::<BOT>_mouth-accessory}}
Neck Accessory: {{getglobalvar::<BOT>_neck-accessory}}
Body Accessory: {{getglobalvar::<BOT>_body-accessory}}
Arms Accessory: {{getglobalvar::<BOT>_arms-accessory}}
Hands Accessory: {{getglobalvar::<BOT>_hands-accessory}}
Waist Accessory: {{getglobalvar::<BOT>_waist-accessory}}
Bottom Accessory: {{getglobalvar::<BOT>_bottom-accessory}}
Legs Accessory: {{getglobalvar::<BOT>_legs-accessory}}
Foot Accessory: {{getglobalvar::<BOT>_foot-accessory}}

IMPORTANT: Output commands as plain text, NOT as JSON. Use this format:
outfit-system_wear_headwear("Red Baseball Cap")
outfit-system_remove_topwear()

Do NOT output JSON arrays or any other format.

Available actions: wear, remove, change
Available clothing slots: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear
Available accessory slots: head-accessory, ears-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory

Example commands:
- outfit-system_wear_headwear("Red Baseball Cap")
- outfit-system_remove_topwear()
- outfit-system_change_bottomwear("Blue Jeans")

Only output commands if clothing changes are explicitly mentioned. If no changes, output [none].

You can use "change" to change an already worn item with another item. You can also use "change to change state of the same item you are wearing. For example if you are wearing "White Button Blouse" and in story you unbuttoned the front, you can change it into "White Button Blouse (unbuttoned front)"

Important: Always use the exact slot names listed above. Never invent new slot names.`;
    }

    enable() {
        if (this.isEnabled) return '[Outfit System] Auto outfit updates already enabled.';
        
        this.isEnabled = true;
        this.consecutiveFailures = 0;
        this.currentRetryCount = 0;
        this.setupEventListeners();
        return '[Outfit System] Auto outfit updates enabled.';
    }

    disable() {
        if (!this.isEnabled) return '[Outfit System] Auto outfit updates already disabled.';
        
        this.isEnabled = false;
        this.removeEventListeners();
        this.commandQueue = [];
        return '[Outfit System] Auto outfit updates disabled.';
    }

    setupEventListeners() {
        this.removeEventListeners();
        
        const { eventSource, event_types } = window.getContext();
        
        // Use MESSAGE_RECEIVED instead of CHARACTER_MESSAGE_RENDERED
        // This event fires when new messages are added to chat (before rendering)
        this.eventHandler = (data) => {
            // Only process AI messages (not user messages) and only after app is initialized
            if (this.isEnabled && !this.isProcessing && this.appInitialized && 
                data && !data.is_user) {
                console.log('[AutoOutfitSystem] New AI message received, processing...');
                setTimeout(() => {
                    this.processOutfitCommands().catch(error => {
                        console.error('Auto outfit processing failed:', error);
                        this.consecutiveFailures++;
                    });
                }, 1000); // Shorter delay since we're processing earlier
            }
        };
        
        eventSource.on(event_types.MESSAGE_RECEIVED, this.eventHandler);
        console.log('[AutoOutfitSystem] Event listener registered for MESSAGE_RECEIVED');
    }

    removeEventListeners() {
        if (this.eventHandler) {
            const { eventSource, event_types } = window.getContext();
            eventSource.off(event_types.MESSAGE_RECEIVED, this.eventHandler);
            this.eventHandler = null;
            console.log('[AutoOutfitSystem] Event listener removed');
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
        
        this.isProcessing = true;
        this.currentRetryCount = 0;
        
        try {
            await this.processWithRetry();
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

        const { generateRaw } = window.getContext();
        
        // Replace macros in the system prompt before sending to the AI
        const processedSystemPrompt = this.replaceMacrosInPrompt(this.systemPrompt);
        const promptText = `${processedSystemPrompt}\n\nRecent Messages:\n${recentMessages}\n\nOutput:`;
        
        console.log('[AutoOutfitSystem] Generating outfit commands with generateRaw...');
        
        try {
            const result = await generateRaw({
                prompt: promptText,
                systemPrompt: "You are an outfit change detection system. Analyze the conversation and output outfit commands when clothing changes occur."
            });

            if (!result) {
                throw new Error('No output generated from generation');
            }
            
            console.log('[AutoOutfitSystem] Generated result:', result);
            
            const commands = this.parseGeneratedText(result);
            
            if (commands.length > 0) {
                console.log(`[AutoOutfitSystem] Found ${commands.length} commands, processing...`);
                await this.processCommandBatch(commands);
            } else {
                console.log('[AutoOutfitSystem] No outfit commands found in response');
            }
            
        } catch (error) {
            console.error('[AutoOutfitSystem] Generation failed:', error);
            await this.tryFallbackGeneration(promptText);
        }
    }

    replaceMacrosInPrompt(prompt) {
        // Get current character name from the outfit manager
        const characterName = this.outfitManager.character || '<BOT>';
        // Normalize the character name to create the proper variable name format
        const normalizedCharName = characterName.replace(/\s+/g, '_'); // This one is ok to keep as it's just for normalization

        // Replace all <BOT> instances with the actual character name
        let processedPrompt = replaceAllStr(prompt, '<BOT>', characterName);

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
                    console.warn('Could not access global variables for macro replacement:', error);
                }
            }
            
            // Replace the macro with the actual value
            processedPrompt = replaceAllStr(processedPrompt, fullMacro, value);
        }
        
        return processedPrompt;
    }

    async tryFallbackGeneration(originalPromptText) {
        // Process the prompt to replace any macros (though they should already be replaced, 
        // this is a safety measure)
        const processedPromptText = this.replaceMacrosInPrompt(originalPromptText);
        
        try {
            const context = window.getContext();
            
            let result;
            if (context.generateQuietPrompt) {
                result = await context.generateQuietPrompt({
                    quietPrompt: processedPromptText
                });
            } else if (context.generateRaw) {
                // Try standard generateRaw as a fallback if generateQuietPrompt is not available
                result = await context.generateRaw({
                    prompt: processedPromptText,
                    systemPrompt: "You are an outfit change detection system. Analyze the conversation and output outfit commands when clothing changes occur."
                });
            } else {
                // If neither method is available, use the connection profile method
                result = await this.generateWithProfile(processedPromptText);
            }

            if (!result) {
                throw new Error('No output generated from fallback generation');
            }
            
            console.log('[AutoOutfitSystem] Fallback result:', result);
            
            const commands = this.parseGeneratedText(result);
            
            if (commands.length > 0) {
                await this.processCommandBatch(commands);
            }
            
        } catch (fallbackError) {
            console.error('[AutoOutfitSystem] Fallback generation also failed:', fallbackError);
            throw new Error(`Both generation methods failed: ${fallbackError.message}`);
        }
    }

    parseGeneratedText(text) {
        if (!text) return [];
        
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
        
        if (successfulCommands.length > 0 && extension_settings.outfit_tracker?.enableSysMessages) {
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

        return await this.outfitManager.setOutfitItem(slot, action === 'remove' ? 'None' : value);
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
            const { chat } = window.getContext();
            
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
                `${msg.is_user ? 'User' : (msg.name || 'AI')}: ${msg.mes}`
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
            hasPrompt: !!this.systemPrompt,
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
        // In SillyTavern, different connection profiles are handled through
        // the connection profile system. We'll implement a more standard approach
        // that would work with the SillyTavern architecture.
        
        const context = window.getContext();
        
        // Process the prompt to replace any macros (though they should already be replaced, 
        // this is a safety measure)
        const processedPromptText = this.replaceMacrosInPrompt(originalPromptText);
        
        // This is a simplified implementation - in a real system, you would
        // implement actual profile-specific connection logic
        console.log(`[AutoOutfitSystem] Generating with profile: ${this.connectionProfile}`);
        
        // For now, try to use getContext to determine if we can access different endpoints
        // Most likely, we'll still use the standard generation methods but this can 
        // be extended based on the specific connection profile requested
        
        // The actual implementation of using different connection profiles would depend
        // on SillyTavern's internal architecture for switching between different endpoints
        // We'll implement a standard approach here
        try {
            if (context.generateRaw) {
                return await context.generateRaw({
                    prompt: processedPromptText,
                    systemPrompt: "You are an outfit change detection system. Analyze the conversation and output outfit commands when clothing changes occur."
                });
            } else if (context.generateQuietPrompt) {
                return await context.generateQuietPrompt({
                    quietPrompt: processedPromptText
                });
            } else {
                // Fallback to standard generation
                throw new Error('No generation method available');
            }
        } catch (error) {
            console.error(`[AutoOutfitSystem] Error using profile ${this.connectionProfile}:`, error);
            // Fallback to default generation
            if (context.generateRaw) {
                return await context.generateRaw({
                    prompt: processedPromptText,
                    systemPrompt: "You are an outfit change detection system. Analyze the conversation and output outfit commands when clothing changes occur."
                });
            } else {
                return await context.generateQuietPrompt({
                    quietPrompt: processedPromptText
                });
            }
        }
    }


}