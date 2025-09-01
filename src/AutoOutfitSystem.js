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
        this.lastChatLength = 0;
        this.pollingInterval = null;
        this.lastMessageId = null;
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
        this.setupPolling();
        return '[Outfit System] Auto outfit updates enabled.';
    }

    disable() {
        if (!this.isEnabled) return '[Outfit System] Auto outfit updates already disabled.';
        
        this.isEnabled = false;
        this.stopPolling();
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

    setupPolling() {
        this.stopPolling();
        
        // Poll every 3 seconds to check for new AI messages
        this.pollingInterval = setInterval(() => {
            this.checkForNewAIMessages();
        }, 3000);
        
        console.log('[AutoOutfitSystem] Polling started');
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    checkForNewAIMessages() {
        if (!this.isEnabled || this.isProcessing || this.isGenerationActive()) return;
        
        try {
            const { chat } = getContext();
            if (!chat || chat.length === 0) return;
            
            const lastMessage = chat[chat.length - 1];
            
            // Check if this is a new AI message that we haven't processed
            if (lastMessage && 
                !lastMessage.is_user && 
                !lastMessage.is_system &&
                lastMessage.mes_id !== this.lastMessageId) {
                
                this.lastMessageId = lastMessage.mes_id;
                console.log('[AutoOutfitSystem] New AI message detected, processing...');
                
                // Process after a short delay to ensure message is fully rendered
                setTimeout(() => {
                    this.processOutfitCommands().catch(error => {
                        console.error('Auto outfit processing failed:', error);
                        this.consecutiveFailures++;
                    });
                }, 2000);
            }
        } catch (error) {
            console.error('Error checking for AI messages:', error);
        }
    }

    isGenerationActive() {
        try {
            // Check for active generation indicators
            const stopButton = document.querySelector('#stop_generation');
            return stopButton && stopButton.style.display !== 'none';
        } catch (error) {
            console.error('Error checking generation status:', error);
            return false;
        }
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
            }, 1000);
        });
    }

    async executeGenCommand() {
        const recentMessages = this.getLastMessages(3);
        if (!recentMessages.trim()) {
            throw new Error('No recent messages to process');
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
                    const cleanValue = value.replace(/"/g, '').trim();
                    
                    const message = await this.executeCommand(action, slot, cleanValue);
                    executedCount++;
                    
                    if (message) {
                        individualMessages.push(message);
                    }
                }
            } catch (error) {
                console.error(`Error executing command "${command}":`, error);
            }
        }
        
        // Send individual outfit change messages using proper SillyTavern API
        if (executedCount > 0 && extension_settings.outfit_tracker?.enableSysMessages) {
            for (const message of individualMessages) {
                await this.sendSystemMessage(message);
                await this.delay(800); // Small delay between messages
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

    async sendSystemMessage(message) {
        try {
            const { sendSystemMessage } = getContext();
            
            if (sendSystemMessage) {
                // Use the proper SillyTavern system message function
                sendSystemMessage(message);
                console.log('System message sent:', message);
                return;
            }
            
            // Fallback: Use the chat input method
            await this.sendSystemMessageFallback(message);
            
        } catch (error) {
            console.error('Failed to send system message:', error);
            throw error;
        }
    }

    async sendSystemMessageFallback(message) {
        return new Promise((resolve, reject) => {
            try {
                const chatInput = document.getElementById('send_textarea');
                if (!chatInput) {
                    reject(new Error('Chat input not found'));
                    return;
                }
                
                // Store current value
                const originalValue = chatInput.value;
                
                // Set the system message
                chatInput.value = `/sys ${message}`;
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                setTimeout(() => {
                    // Try to find and click the send button
                    const sendButton = document.querySelector('#send_but');
                    if (sendButton && !sendButton.disabled) {
                        sendButton.click();
                        setTimeout(() => {
                            // Restore original value
                            chatInput.value = originalValue;
                            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                            resolve();
                        }, 100);
                        return;
                    }
                    
                    reject(new Error('Send button not available'));
                }, 100);
            } catch (error) {
                reject(error);
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
            lastProcessTime: this.lastProcessTime ? new Date(this.lastProcessTime).toLocaleTimeString() : 'Never'
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
}
