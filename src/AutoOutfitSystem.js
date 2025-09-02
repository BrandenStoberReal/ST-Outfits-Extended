import { getContext } from "../../../../extensions.js";
import { extension_settings } from "../../../../extensions.js";

export class AutoOutfitSystem {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isEnabled = false;
        this.systemPrompt = this.getDefaultPrompt();
        this.commandPattern = /outfit-system_(\w+)_([\w-]+)\(([^)]*)\)/g;
        this.isProcessing = false;
        this.consecutiveFailures = 0;
        this.maxConsecutiveFailures = 5;
        this.eventHandler = null;
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds between retries
        this.currentRetryCount = 0;
        this.commandQueue = [];
        this.isProcessingQueue = false;
    }

    getDefaultPrompt() {
        return `Analyze the character's actions in the recent messages. If the character puts on, wears, removes, or changes any clothing items, output the appropriate outfit commands.

Here is what character is currently wearing:

**<BOT>'s Current Outfit**
**Headwear:** {{getglobalvar::<BOT>_headwear}}
**Topwear:** {{getglobalvar::<BOT>_topwear}}
**Top Underwear:** {{getglobalvar::<BOT>_topunderwear}}
**Bottomwear:** {{getglobalvar::<BOT>_bottomwear}}
**Bottom Underwear:** {{getglobalvar::<BOT>_bottomunderwear}}
**Footwear:** {{getglobalvar::<BOT>_footwear}}
**Foot Underwear:** {{getglobalvar::<BOT>_footunderwear}}

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
Available accessory slots: head-accessory, ears_accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory

Example commands:
- outfit-system_wear_headwear("Red Baseball Cap")
- outfit-system_remove_topwear()
- outfit-system_change_bottomwear("Blue Jeans")

Only output commands if clothing changes are explicitly mentioned. If no changes, output nothing.

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
        
        const { eventSource, event_types } = getContext();
        
        // Listen for when AI messages are fully rendered (after generation completes)
        this.eventHandler = (data) => {
            if (this.isEnabled && !this.isProcessing) {
                console.log('[AutoOutfitSystem] AI message rendered, processing...');
                setTimeout(() => {
                    this.processOutfitCommands().catch(error => {
                        console.error('Auto outfit processing failed:', error);
                        this.consecutiveFailures++;
                    });
                }, 2000); // Wait a bit for message to be fully processed
            }
        };
        
        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, this.eventHandler);
        console.log('[AutoOutfitSystem] Event listener registered');
    }

    removeEventListeners() {
        if (this.eventHandler) {
            const { eventSource, event_types } = getContext();
            eventSource.off(event_types.CHARACTER_MESSAGE_RENDERED, this.eventHandler);
            this.eventHandler = null;
            console.log('[AutoOutfitSystem] Event listener removed');
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

        // Use generateRaw for more reliable generation
        const { generateRaw } = getContext();
        
        const promptText = `${this.systemPrompt}\n\nRecent Messages:\n${recentMessages}\n\nOutput:`;
        
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
            
            // Parse and execute commands
            const commands = this.parseGeneratedText(result);
            
            if (commands.length > 0) {
                console.log(`[AutoOutfitSystem] Found ${commands.length} commands, processing...`);
                await this.processCommandBatch(commands);
            } else {
                console.log('[AutoOutfitSystem] No outfit commands found in response');
            }
            
        } catch (error) {
            console.error('[AutoOutfitSystem] Generation failed:', error);
            
            // Fallback: Try generateQuietPrompt if generateRaw fails
            console.log('[AutoOutfitSystem] Trying fallback with generateQuietPrompt...');
            await this.tryFallbackGeneration(promptText);
        }
    }

    async tryFallbackGeneration(promptText) {
        try {
            const { generateQuietPrompt } = getContext();
            
            if (!generateQuietPrompt) {
                throw new Error('generateQuietPrompt not available');
            }
            
            const result = await generateQuietPrompt({
                quietPrompt: promptText
            });

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
        
        const commands = [];
        // Use the fixed regex pattern that handles hyphens in slot names
        const matches = text.matchAll(/outfit-system_(\w+)_([\w-]+)\(([^)]*)\)/g);
        
        for (const match of matches) {
            commands.push(match[0]);
        }
        
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
        
        // Process all commands in sequence
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
        
        // Send popup messages for successful commands
        if (successfulCommands.length > 0 && extension_settings.outfit_tracker?.enableSysMessages) {
            console.log(`[AutoOutfitSystem] Showing ${successfulCommands.length} popup messages`);
            
            // Group messages by character for better formatting
            const messagesByCharacter = {};
            successfulCommands.forEach(({ message }) => {
                const charName = message.match(/(\w+) put on|removed|changed/)?.[1] || 'Character';
                if (!messagesByCharacter[charName]) {
                    messagesByCharacter[charName] = [];
                }
                messagesByCharacter[charName].push(message);
            });
            
            // Show grouped popups
            for (const [charName, messages] of Object.entries(messagesByCharacter)) {
                if (messages.length === 1) {
                    this.showPopup(messages[0], 'info');
                } else {
                    this.showPopup(`${charName} made multiple outfit changes.`, 'info');
                }
                await this.delay(1000); // Short delay between popups
            }
            
            // Update the outfit panel to reflect changes
            this.updateOutfitPanel();
        }
        
        // Log failures
        if (failedCommands.length > 0) {
            console.warn(`[AutoOutfitSystem] ${failedCommands.length} commands failed:`, failedCommands);
        }
        
        console.log(`[AutoOutfitSystem] Batch completed: ${successfulCommands.length} successful, ${failedCommands.length} failed`);
    }

    async processSingleCommand(command) {
        try {
            // Use the fixed regex pattern that handles hyphens in slot names
            const match = command.match(/outfit-system_(\w+)_([\w-]+)\(([^)]*)\)/);
            if (!match) {
                throw new Error(`Invalid command format: ${command}`);
            }
            
            const [, action, slot, value] = match;
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

        // Use the outfitManager's setOutfitItem which returns the proper message
        return await this.outfitManager.setOutfitItem(slot, action === 'remove' ? 'None' : value);
    }

    // Update the outfit panel to reflect changes
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
            const { chat } = getContext();
            
            // SAFETY CHECK: Ensure chat exists and has valid messages
            if (!chat || !Array.isArray(chat) || chat.length === 0) {
                console.log('[AutoOutfitSystem] No chat or empty chat array');
                return '';
            }
            
            // Filter out any undefined or invalid messages
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

    async sendSystemMessageDirect(message) {
        try {
            // Use the direct system message approach that works with the existing panels
            if (window.botOutfitPanel && typeof window.botOutfitPanel.sendSystemMessage === 'function') {
                window.botOutfitPanel.sendSystemMessage(message);
                console.log('[AutoOutfitSystem] System message sent via bot panel:', message);
                return;
            }
            
            // Fallback: Use the manual slash command approach
            await this.sendSystemMessageManual(message);
            
        } catch (error) {
            console.error('Failed to send system message directly:', error);
            // Don't throw error here - just log and continue
        }
    }

    async sendSystemMessageManual(message) {
        return new Promise((resolve) => {
            try {
                const chatInput = document.getElementById('send_textarea');
                if (!chatInput) {
                    console.error('Chat input not found for manual system message');
                    resolve();
                    return;
                }
                
                // Store current value
                const originalValue = chatInput.value;
                
                // Set the system message with proper formatting
                const formattedMessage = `/sys compact=true ${message}`;
                chatInput.value = formattedMessage;
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                setTimeout(() => {
                    // Try to find and click the send button
                    const sendButton = document.querySelector('#send_but');
                    if (sendButton && !sendButton.disabled) {
                        sendButton.click();
                        console.log('[AutoOutfitSystem] Manual system message sent:', message);
                    } else {
                        // Try keyboard event as fallback
                        const event = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        });
                        chatInput.dispatchEvent(event);
                        console.log('[AutoOutfitSystem] Manual system message sent via keyboard:', message);
                    }
                    
                    setTimeout(() => {
                        // Restore original value
                        chatInput.value = originalValue;
                        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                        resolve();
                    }, 100);
                    
                }, 100);
            } catch (error) {
                console.error('Manual system message failed:', error);
                resolve(); // Don't reject, just continue
            }
        });
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

    resetToDefaultPrompt() {
        this.systemPrompt = this.getDefaultPrompt();
        return '[Outfit System] Reset to default prompt.';
    }
}
