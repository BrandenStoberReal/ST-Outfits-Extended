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
        this.tempVarName = 'outfitsystem_charmes';
        this.generationTimeout = null;
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
        this.cleanupTempVar();
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
        
        // Listen for completed AI messages - use MESSAGE_RECEIVED instead
        this.messageHandler = this.handleMessageReceived.bind(this);
        eventSource.on(event_types.MESSAGE_RECEIVED, this.messageHandler);
    }

    removeEventListener() {
        const { eventSource, event_types } = getContext();
        if (this.messageHandler) {
            eventSource.off(event_types.MESSAGE_RECEIVED, this.messageHandler);
        }
        if (this.generationTimeout) {
            clearTimeout(this.generationTimeout);
            this.generationTimeout = null;
        }
    }

    handleMessageReceived() {
        if (!this.isEnabled || this.isProcessing) return;
        
        // Wait a moment before processing to ensure message is settled
        this.generationTimeout = setTimeout(() => {
            this.processOutfitCommands().catch(error => {
                console.error('Auto outfit processing failed:', error);
            });
        }, 1500);
    }

    async processOutfitCommands() {
        if (this.isProcessing) {
            this.showPopup('Auto outfit check already in progress.', 'warning');
            return;
        }

        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            this.disable();
            this.showPopup('Auto outfit updates disabled due to repeated failures.', 'error');
            return;
        }

        // Check if generation is currently active
        if (this.isGenerationActive()) {
            this.showPopup('Cannot process outfit commands while generation is active.', 'warning');
            return;
        }

        this.isProcessing = true;
        
        try {
            this.showPopup('Starting outfit command generation...', 'info');
            await this.executeGenCommand();
            this.consecutiveFailures = 0;
            this.showPopup('Outfit check completed successfully.', 'success');
        } catch (error) {
            console.error('Outfit command processing failed:', error);
            this.consecutiveFailures++;
            this.showPopup(`Auto outfit check failed ${this.consecutiveFailures} time(s).`, 'error');
        } finally {
            this.isProcessing = false;
            this.lastProcessTime = Date.now();
            this.cleanupTempVar();
        }
    }

    isGenerationActive() {
        // Check various indicators that generation might be active
        const sendButton = document.querySelector('#send_but');
        const stopButton = document.querySelector('#stop_generation');
        
        return (
            (sendButton && sendButton.disabled) ||
            (stopButton && stopButton.style.display !== 'none') ||
            document.body.classList.contains('generating')
        );
    }

    async executeGenCommand() {
        const recentMessages = this.getLastMessages(3);
        if (!recentMessages.trim()) {
            throw new Error('No recent messages to process');
        }

        // Clean up any previous temp variable
        this.cleanupTempVar();
        
        // Construct the /gen command with pipe to temporary variable
        const promptText = `${this.systemPrompt}\n\nRecent Messages:\n${recentMessages}`;
        const genCommand = `/gen as=system lock=on ${this.escapePrompt(promptText)} | /setvar key=${this.tempVarName} {{pipe}}`;
        
        console.log('Executing outfit command:', genCommand);
        
        // Execute the command using chat input method
        await this.sendViaChatInput(genCommand);
        
        // Wait for generation to complete and check for results
        const generatedText = await this.waitForGenerationResult(25000);
        
        if (!generatedText) {
            throw new Error('No output generated from /gen command');
        }
        
        console.log('Generated text:', generatedText);
        
        // Parse and execute commands
        const commands = this.parseGeneratedText(generatedText);
        await this.executeCommands(commands);
    }

    escapePrompt(text) {
        // Escape special characters for command input
        return text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }

    async sendViaChatInput(command) {
        return new Promise((resolve, reject) => {
            const chatInput = document.getElementById('send_textarea');
            if (!chatInput) {
                reject(new Error('Chat input not found'));
                return;
            }
            
            // Clear any existing content
            chatInput.value = '';
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Set the command after a brief delay
            setTimeout(() => {
                chatInput.value = command;
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Wait a moment for the input to be processed
                setTimeout(() => {
                    // Find and click the send button
                    const sendButton = document.querySelector('#send_but');
                    if (sendButton && !sendButton.disabled) {
                        sendButton.click();
                        resolve();
                    } else {
                        // Fallback: simulate Enter key press
                        const event = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        });
                        chatInput.dispatchEvent(event);
                        resolve();
                    }
                }, 300);
            }, 300);
        });
    }

    async waitForGenerationResult(timeoutMs = 25000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            // Check if generation is still active
            if (this.isGenerationActive()) {
                await this.delay(1000);
                continue;
            }
            
            const result = this.getTempVarValue();
            if (result && result.trim()) {
                return result;
            }
            await this.delay(1000);
        }
        
        return null;
    }

    getTempVarValue() {
        try {
            const globalVars = extension_settings.variables?.global || {};
            return globalVars[this.tempVarName] || window[this.tempVarName] || '';
        } catch (error) {
            console.error('Failed to get temporary variable:', error);
            return '';
        }
    }

    cleanupTempVar() {
        try {
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
            this.sendSystemMessage(`[Outfit System] Processed ${executedCount} outfit change(s) automatically.`);
            this.showPopup(`Applied ${executedCount} outfit change(s).`, 'success');
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

    delay(ms) {
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
            consecutiveFailures: this.consecutiveFailures,
            lastProcessTime: this.lastProcessTime ? new Date(this.lastProcessTime).toLocaleTimeString() : 'Never',
            tempVarExists: !!this.getTempVarValue()
        };
    }

    async manualTrigger() {
        if (!this.isEnabled) {
            this.showPopup('Auto updates are disabled. Enable first with /outfit-auto on', 'warning');
            return;
        }
        
        // Check if generation is currently active
        if (this.isGenerationActive()) {
            this.showPopup('Cannot trigger outfit check while generation is active.', 'warning');
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
