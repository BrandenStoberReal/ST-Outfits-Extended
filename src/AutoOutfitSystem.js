import { getContext } from "../../../../extensions.js";
import { extension_settings } from "../../../../extensions.js";

export class AutoOutfitSystem {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isEnabled = false;
        this.systemPrompt = this.getDefaultPrompt();
        this.commandPattern = /outfit-system_(\w+)_(\w+)\(([^)]*)\)/g;
        this.messageHandler = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds between retries
        this.isProcessing = false;
        this.lastProcessTime = null;
        this.consecutiveFailures = 0;
        this.maxConsecutiveFailures = 5;
        this.lastMessageId = null;
        this.tempVarName = 'outfitsystem_charmes'; // Temporary variable name
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
        this.consecutiveFailures = 0; // Reset failure counter when enabling
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
        
        // Remove any existing listener first
        this.removeEventListener();
        
        // Listen for when AI messages are fully rendered (completed)
        this.messageHandler = this.handleMessage.bind(this);
        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, this.messageHandler);
    }

    removeEventListener() {
        const { eventSource, event_types } = getContext();
        if (this.messageHandler) {
            eventSource.off(event_types.CHARACTER_MESSAGE_RENDERED, this.messageHandler);
        }
    }

    async handleMessage(data) {
        // Skip if not enabled, processing, or no prompt
        if (!this.isEnabled || !this.systemPrompt || this.isProcessing) return;

        // Get the current chat context to check the latest message
        const context = getContext();
        const chat = context.chat || [];
        
        if (chat.length === 0) return;
        
        // Get the latest AI message (should be the one that just rendered)
        const latestMessage = chat[chat.length - 1];
        
        // Skip if this isn't an AI message or if we've already processed it
        if (latestMessage.is_user || latestMessage.mes_id === this.lastMessageId) return;
        
        // Store the message ID to prevent duplicate processing
        this.lastMessageId = latestMessage.mes_id;
        
        try {
            // Show starting message as popup
            this.showPopup('Auto outfit check started, please wait...', 'info');
            
            // Wait a moment to ensure the message is fully settled
            setTimeout(async () => {
                await this.processOutfitCommands();
            }, 1000);
        } catch (error) {
            console.error('Auto outfit processing error:', error);
            this.showPopup('Auto outfit check failed to start.', 'error');
        }
    }

    async processOutfitCommands() {
        if (this.isProcessing) {
            console.log('[OutfitSystem] Already processing, skipping duplicate request');
            this.showPopup('Auto outfit check already in progress.', 'warning');
            return;
        }

        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            console.warn('[OutfitSystem] Too many consecutive failures, auto-disabling');
            this.disable();
            this.showPopup('Auto outfit updates disabled due to repeated failures.', 'error');
            return;
        }

        this.isProcessing = true;
        this.retryCount = 0;
        
        try {
            await this.executeWithRetry();
        } catch (error) {
            console.error('[OutfitSystem] Final processing failure:', error);
            this.consecutiveFailures++;
            this.showPopup(`Auto outfit check failed ${this.consecutiveFailures} time(s).`, 'error');
        } finally {
            this.isProcessing = false;
            this.lastProcessTime = Date.now();
            this.cleanupTempVar(); // Clean up temporary variable
        }
    }

    async executeWithRetry() {
        while (this.retryCount < this.maxRetries) {
            try {
                await this.executeSingleAttempt();
                this.consecutiveFailures = 0; // Reset on success
                this.showPopup('Auto outfit check completed successfully.', 'success');
                return; // Success, exit retry loop
            } catch (error) {
                this.retryCount++;
                
                if (this.retryCount < this.maxRetries) {
                    console.warn(`[OutfitSystem] Attempt ${this.retryCount} failed, retrying in ${this.retryDelay}ms:`, error.message);
                    this.showPopup(`Auto outfit check failed (attempt ${this.retryCount}), retrying...`, 'warning');
                    await this.delay(this.retryDelay);
                } else {
                    console.error('[OutfitSystem] All retry attempts failed:', error);
                    this.showPopup('Auto outfit check failed 3 times.', 'error');
                    throw error; // Re-throw after final retry
                }
            }
        }
    }

    async executeSingleAttempt() {
        // Get the last 3 completed messages
        const recentMessages = this.getLastMessages(3);
        if (!recentMessages.trim()) {
            throw new Error('No recent messages to process');
        }

        this.showPopup('Generating outfit commands using /gen command...', 'info');

        // Use /gen as=system command with pipe to temporary variable
        await this.executeGenCommand(recentMessages);
        
        // Wait a moment for the command to complete
        await this.delay(1000);
        
        // Check the temporary variable for generated commands
        const generatedOutput = this.getTempVarValue();
        if (!generatedOutput) {
            throw new Error('No output generated from /gen command');
        }
        
        // Parse the generated output for commands
        const commands = this.parseGeneratedOutput(generatedOutput);
        await this.executeCommands(commands);
    }

    async executeGenCommand(recentMessages) {
        try {
            const chatInput = document.getElementById('send_textarea');
            if (!chatInput) {
                throw new Error('Chat input not found');
            }
            
            // Construct the /gen command with pipe to temporary variable
            const genCommand = `/gen as=system lock=on ${this.systemPrompt}\n\nRecent Messages:\n${recentMessages} | /setvar key=${this.tempVarName} {{pipe}}`;
            
            chatInput.value = genCommand;
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Send the command
            setTimeout(() => {
                const sendButton = document.querySelector('#send_but');
                if (sendButton) {
                    sendButton.click();
                } else {
                    const event = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        bubbles: true
                    });
                    chatInput.dispatchEvent(event);
                }
            }, 100);
            
            // Wait for command to complete
            await this.delay(3000);
            
        } catch (error) {
            console.error('Failed to execute /gen command:', error);
            throw new Error('Failed to execute outfit command generation');
        }
    }

    getTempVarValue() {
        try {
            // Check both extension settings and window global variables
            const globalVars = extension_settings.variables?.global || {};
            return globalVars[this.tempVarName] || window[this.tempVarName] || '';
        } catch (error) {
            console.error('Failed to get temporary variable value:', error);
            return '';
        }
    }

    cleanupTempVar() {
        try {
            // Clean up the temporary variable
            if (extension_settings.variables?.global?.[this.tempVarName]) {
                delete extension_settings.variables.global[this.tempVarName];
            }
            if (window[this.tempVarName]) {
                delete window[this.tempVarName];
            }
        } catch (error) {
            console.error('Failed to cleanup temporary variable:', error);
        }
    }

    parseGeneratedOutput(output) {
        if (!output) return [];
        
        try {
            // First try to parse as JSON (if the AI followed structured output)
            if (output.trim().startsWith('{') || output.trim().startsWith('[')) {
                const parsed = JSON.parse(output);
                if (parsed && Array.isArray(parsed.commands)) {
                    return parsed.commands;
                }
            }
            
            // Otherwise, extract commands using regex pattern matching
            const commands = [];
            const matches = output.matchAll(this.commandPattern);
            
            for (const match of matches) {
                commands.push(match[0]);
            }
            
            return commands;
            
        } catch (error) {
            console.error('Failed to parse generated output:', error);
            
            // Fallback: try regex extraction even if JSON parsing failed
            const commands = [];
            const matches = output.matchAll(this.commandPattern);
            
            for (const match of matches) {
                commands.push(match[0]);
            }
            
            return commands;
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getLastMessages(count = 3) {
        const { chat } = getContext();
        if (!chat || chat.length === 0) return '';
        
        const recentMessages = chat.slice(-count);
        return recentMessages.map(msg => 
            `${msg.is_user ? 'User' : 'AI'}: ${msg.mes}`
        ).join('\n');
    }

    async executeCommands(commands) {
        if (!commands || commands.length === 0) {
            this.showPopup('No outfit commands found in generated output.', 'info');
            return;
        }
        
        let executedCount = 0;
        for (const command of commands) {
            try {
                const match = command.match(/outfit-system_(\w+)_(\w+)\(([^)]*)\)/);
                if (match) {
                    const [, action, slot, value] = match;
                    await this.executeCommand(action, slot, value.replace(/"/g, ''));
                    executedCount++;
                }
            } catch (error) {
                console.error(`Error executing command "${command}":`, error);
                this.showPopup(`Failed to execute outfit command: ${command}`, 'error');
            }
        }
        
        if (executedCount > 0 && extension_settings.outfit_tracker?.enableSysMessages) {
            // Only send actual outfit changes as system messages
            this.sendSystemMessage(`[Outfit System] Processed ${executedCount} outfit change(s) automatically.`);
            this.showPopup(`Applied ${executedCount} outfit change(s) from AI analysis.`, 'success');
        }
    }

    async executeCommand(action, slot, value) {
        const validSlots = [...this.outfitManager.slots];
        
        if (!validSlots.includes(slot)) {
            throw new Error(`Invalid slot: ${slot}`);
        }

        switch(action) {
            case 'wear':
                await this.outfitManager.setOutfitItem(slot, value);
                break;
            case 'remove':
                await this.outfitManager.setOutfitItem(slot, 'None');
                break;
            case 'change':
                await this.outfitManager.setOutfitItem(slot, value);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
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

    sendSystemMessage(message) {
        try {
            const chatInput = document.getElementById('send_textarea');
            if (!chatInput) return;
            
            chatInput.value = `/sys compact=true ${message}`;
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
                const sendButton = document.querySelector('#send_but');
                if (sendButton) {
                    sendButton.click();
                }
            }, 100);
        } catch (error) {
            console.error('Failed to send system message:', error);
        }
    }

    getStatus() {
        return {
            enabled: this.isEnabled,
            hasPrompt: !!this.systemPrompt,
            promptLength: this.systemPrompt?.length || 0,
            isProcessing: this.isProcessing,
            retryCount: this.retryCount,
            consecutiveFailures: this.consecutiveFailures,
            lastProcessTime: this.lastProcessTime ? new Date(this.lastProcessTime).toLocaleTimeString() : 'Never',
            lastProcessAgo: this.lastProcessTime ? this.formatTimeAgo(this.lastProcessTime) : 'Never',
            lastMessageId: this.lastMessageId,
            tempVarValue: this.getTempVarValue() || 'Empty'
        };
    }

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }

    // Manual trigger for testing/debugging
    async manualTrigger() {
        if (!this.isEnabled) {
            this.showPopup('Auto updates are disabled. Enable first with /outfit-auto on', 'warning');
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
