import { getContext } from "../../../../extensions.js";
import { extension_settings } from "../../../../extensions.js";

export class AutoOutfitSystem {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isEnabled = false;
        this.systemPrompt = this.getDefaultPrompt();
        this.commandPattern = /outfit-system_(\w+)_(\w+)\(([^)]*)\)/g;
        this.isProcessing = false;
        this.lastProcessTime = null;
        this.consecutiveFailures = 0;
        this.maxConsecutiveFailures = 5;
        this.generationCheckInterval = null;
        this.lastMessageTime = 0;
        this.pendingMessages = [];
        this.lastAIMessageId = null;
    }

    getDefaultPrompt() {
        return `Analyze the character's actions in the recent messages. If the character puts on, wears, removes, or changes any clothing items, output the appropriate outfit commands. Use the format: outfit-system_[action]_[slot]("[item name]").

Available actions: wear, remove, change
Available slots: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear, head-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory

Example commands:
- outfit-system_wear_headwear("Red Baseball Cap")
- outfit-system_remove_topwear()
- outfit-system_change_bottomwear("Blue Jeans")

Only output commands if clothing changes are explicitly mentioned. If no changes, output empty array.

Important: Always use the exact slot names listed above. Never invent new slot names.`;
    }

    enable() {
        if (this.isEnabled) return '[Outfit System] Auto outfit updates already enabled.';
        
        this.isEnabled = true;
        this.consecutiveFailures = 0;
        this.setupEventListener();
        return '[Outfit System] Auto outfit updates enabled.';
    }

    disable() {
        if (!this.isEnabled) return '[Outfit System] Auto outfit updates already disabled.';
        
        this.isEnabled = false;
        this.removeEventListener();
        return '[Outfit System] Auto outfit updates disabled.';
    }

    setPrompt(prompt) {
        this.systemPrompt = prompt || this.getDefaultPrompt();
        return '[Outfit System] System prompt updated.';
    }

    resetToDefaultPrompt() {
        this.systemPrompt = this.getDefaultPrompt();
        return '[Outfit System] Reset to default prompt.';
    }

    setupEventListener() {
        const { eventSource, event_types } = getContext();
        this.removeEventListener();
        
        // Use a different approach - listen for chat changes and check for new AI messages
        this.chatChangeHandler = this.handleChatChange.bind(this);
        eventSource.on(event_types.CHAT_CHANGED, this.chatChangeHandler);
        
        // Also listen for new messages being added
        this.messageSentHandler = this.handleMessageSent.bind(this);
        eventSource.on(event_types.MESSAGE_SENT, this.messageSentHandler);
        
        console.log('[AutoOutfitSystem] Event listeners set up');
    }

    handleChatChange() {
        // Reset tracking when chat changes
        this.lastAIMessageId = null;
    }

    handleMessageSent(data) {
        if (!this.isEnabled || this.isProcessing) return;
        
        // Track the last message ID to avoid processing the same message multiple times
        if (data && data.mes_id) {
            this.lastAIMessageId = data.mes_id;
        }
    }

    removeEventListener() {
        const { eventSource, event_types } = getContext();
        if (this.chatChangeHandler) {
            eventSource.off(event_types.CHAT_CHANGED, this.chatChangeHandler);
        }
        if (this.messageSentHandler) {
            eventSource.off(event_types.MESSAGE_SENT, this.messageSentHandler);
        }
        if (this.generationCheckInterval) {
            clearInterval(this.generationCheckInterval);
            this.generationCheckInterval = null;
        }
    }

    checkForNewAIMessages() {
        try {
            const { chat } = getContext();
            if (!chat || chat.length === 0) return false;
            
            const lastMessage = chat[chat.length - 1];
            
            // Only process AI messages that haven't been processed yet
            if (!lastMessage.is_user && 
                !lastMessage.is_system && 
                lastMessage.mes_id !== this.lastAIMessageId) {
                
                this.lastAIMessageId = lastMessage.mes_id;
                return true;
            }
        } catch (error) {
            console.error('Error checking for AI messages:', error);
        }
        return false;
    }

    isGenerationActive() {
        try {
            // Check multiple indicators of active generation
            const stopButton = document.querySelector('#stop_generation');
            const sendButton = document.querySelector('#send_but');
            
            return (stopButton && stopButton.style.display !== 'none') ||
                   (sendButton && sendButton.disabled) ||
                   document.querySelector('.generating') !== null ||
                   document.querySelector('.msg_in_progress') !== null;
        } catch (error) {
            console.error('Error checking generation status:', error);
            return false;
        }
    }

    waitForGenerationComplete() {
        return new Promise((resolve) => {
            if (!this.isGenerationActive()) {
                return resolve();
            }
            
            const checkInterval = setInterval(() => {
                if (!this.isGenerationActive()) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);
        });
    }

    async processOutfitCommands() {
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            this.disable();
            this.showPopup('Auto outfit updates disabled due to repeated failures.', 'error');
            return;
        }

        if (this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            // Wait for any ongoing generation to complete
            await this.waitForGenerationComplete();
            
            // Additional delay to ensure everything is settled
            await this.delay(1000);
            
            this.showPopup('Checking for outfit changes...', 'info');
            await this.executeGenCommand();
            this.consecutiveFailures = 0;
            this.showPopup('Outfit check completed.', 'success');
        } catch (error) {
            console.error('Outfit command processing failed:', error);
            this.consecutiveFailures++;
            this.showPopup(`Outfit check failed ${this.consecutiveFailures} time(s).`, 'error');
        } finally {
            this.isProcessing = false;
            this.lastProcessTime = Date.now();
        }
    }

    async executeGenCommand() {
        const recentMessages = this.getLastMessages(3);
        if (!recentMessages.trim()) {
            throw new Error('No recent messages to process');
        }

        // Double-check that no generation is active
        if (this.isGenerationActive()) {
            throw new Error('Generation still active - cannot proceed');
        }

        // Use generateQuietPrompt for background processing
        const { generateQuietPrompt } = getContext();
        
        const promptText = `${this.systemPrompt}\n\nRecent Messages:\n${recentMessages}`;
        
        console.log('Generating outfit commands quietly...');
        const result = await generateQuietPrompt({
            quietPrompt: promptText
        });

        if (!result) {
            throw new Error('No output generated from generation');
        }
        
        console.log('Generated result:', result);
        
        // Parse and execute commands
        const commands = this.parseGeneratedText(result);
        await this.executeCommands(commands);
    }

    parseGeneratedText(text) {
        if (!text) return [];
        
        const commands = [];
        const matches = text.matchAll(this.commandPattern);
        
        for (const match of matches) {
            commands.push(match[0]);
        }
        
        return commands;
    }

    async executeCommands(commands) {
        if (!commands || commands.length === 0) {
            return; // No commands found, silently return
        }
        
        let executedCount = 0;
        const individualMessages = [];
        
        for (const command of commands) {
            try {
                const match = command.match(/outfit-system_(\w+)_(\w+)\(([^)]*)\)/);
                if (match) {
                    const [, action, slot, value] = match;
                    const message = await this.executeCommand(action, slot, value.replace(/"/g, ''));
                    executedCount++;
                    
                    if (message) {
                        individualMessages.push(message);
                    }
                }
            } catch (error) {
                console.error(`Error executing command "${command}":`, error);
            }
        }
        
        // Send individual outfit change messages instead of summary
        if (executedCount > 0 && extension_settings.outfit_tracker?.enableSysMessages) {
            for (const message of individualMessages) {
                await this.sendSystemMessage(message);
                await this.delay(500); // Small delay between messages
            }
            
            // Update the outfit panel to reflect changes
            this.updateOutfitPanel();
        }
    }

    async executeCommand(action, slot, value) {
        const validSlots = [...this.outfitManager.slots];
        
        if (!validSlots.includes(slot)) {
            throw new Error(`Invalid slot: ${slot}`);
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
                } catch (error) {
                    console.error('Failed to update outfit panel:', error);
                }
            }, 300);
        }
    }

    getLastMessages(count = 3) {
        try {
            const { chat } = getContext();
            if (!chat || chat.length === 0) return '';
            
            const recentMessages = chat.slice(-count);
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

    async sendSystemMessage(message) {
        return new Promise((resolve) => {
            try {
                // Use the direct send method instead of /sys command
                const { sendSystemMessage } = getContext();
                
                if (sendSystemMessage) {
                    sendSystemMessage(message);
                    resolve();
                    return;
                }
                
                // Fallback - use a different approach that doesn't interfere with /sys
                this.sendSystemMessageAlternative(message).then(resolve).catch(() => {
                    console.error('Failed to send system message');
                    resolve();
                });
            } catch (error) {
                console.error('Failed to send system message:', error);
                resolve();
            }
        });
    }

    async sendSystemMessageAlternative(message) {
        return new Promise((resolve, reject) => {
            try {
                // Create a temporary button to send the message
                const tempButton = document.createElement('button');
                tempButton.style.display = 'none';
                tempButton.onclick = () => {
                    try {
                        const { addOneMessage } = getContext();
                        if (addOneMessage) {
                            addOneMessage({
                                is_system: true,
                                is_user: false,
                                mes: message,
                                name: 'System',
                                send_date: Date.now()
                            });
                            resolve();
                        } else {
                            reject(new Error('addOneMessage not available'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                
                document.body.appendChild(tempButton);
                tempButton.click();
                setTimeout(() => {
                    document.body.removeChild(tempButton);
                }, 100);
                
            } catch (error) {
                reject(error);
            }
        });
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
            lastProcessTime: this.lastProcessTime ? new Date(this.lastProcessTime).toLocaleTimeString() : 'Never',
            lastMessageTime: this.lastMessageTime ? new Date(this.lastMessageTime).toLocaleTimeString() : 'Never'
        };
    }

    async manualTrigger() {
        if (!this.isEnabled) {
            this.showPopup('Enable auto updates first with /outfit-auto on', 'warning');
            return;
        }
        
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

    // Manual trigger method that can be called from elsewhere
    triggerOutfitCheck() {
        if (this.checkForNewAIMessages()) {
            this.processOutfitCommands().catch(error => {
                console.error('Manual outfit check failed:', error);
            });
        }
    }
}
