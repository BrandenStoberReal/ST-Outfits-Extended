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
        
        // Listen when generation finishes
        this.messageHandler = this.handleGenerationEnded.bind(this);
        eventSource.on(event_types.GENERATION_ENDED, this.messageHandler);
    }

    handleGenerationEnded(data) {
        // Only run if generation was successful and outfit system is enabled
        if (!this.isEnabled || this.isProcessing || !data?.success) return;
        if (!this.lastMessageWasAI()) return;

        // Process after a short delay to ensure UI updates
        setTimeout(() => {
            this.processOutfitCommands().catch(error => {
                console.error('Auto outfit processing failed:', error);
                this.consecutiveFailures++;
            });
        }, 1000);
    }

    lastMessageWasAI() {
        const { chat, characterId } = getContext();
        if (!chat || chat.length === 0) return false;
        
        const lastMessage = chat[chat.length - 1];
        return !lastMessage.is_user && 
               !lastMessage.is_system;
    }

    removeEventListener() {
        const { eventSource, event_types } = getContext();
        if (this.messageHandler) {
            eventSource.off(event_types.GENERATION_ENDED, this.messageHandler);
        }
        if (this.generationTimeout) {
            clearTimeout(this.generationTimeout);
            this.generationTimeout = null;
        }
    }

    async processOutfitCommands() {
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            this.disable();
            this.showPopup('Auto outfit updates disabled due to repeated failures.', 'error');
            return;
        }

        // Wait until any generation locks are cleared
        await this.waitForIdleGeneration();
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        try {
            this.showPopup('Generating outfit commands...', 'info');
            await this.executeGenCommand();
            this.consecutiveFailures = 0;
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

    // Wait until SillyTavern is ready to accept new commands
    waitForIdleGeneration() {
        return new Promise((resolve) => {
            const checkIdle = () => {
                if (this.isGenerationActive()) {
                    setTimeout(checkIdle, 500);
                } else {
                    resolve();
                }
            };
            checkIdle();
        });
    }

    isGenerationActive() {
        // Robust check for any ongoing generation
        return document.querySelector('#stop_generation:not([style*="none"])') || 
               document.querySelector('#send_but[disabled]') ||
               document.querySelector('.generating') ||
               document.querySelector('.msg_in_progress');
    }

    async executeGenCommand() {
        const recentMessages = this.getLastMessages(3);
        if (!recentMessages.trim()) {
            throw new Error('No recent messages to process');
        }

        // Clean up any previous temp variable
        this.cleanupTempVar();
        
        // Construct the /gen command
        const promptText = `${this.systemPrompt}\n\nRecent Messages:\n${recentMessages}`;
        const genCommand = `/gen as=system lock=on ${this.escapePrompt(promptText)} | /setvar key=${this.tempVarName} {{pipe}}`;
        
        console.log('Executing outfit command:', genCommand);
        await this.sendViaChatInput(genCommand);
        
        // Wait for generation result
        const generatedText = await this.waitForGenerationResult(30000);
        
        if (!generatedText) {
            throw new Error('No output generated from /gen command');
        }
        
        console.log('Generated text:', generatedText);
        
        // Parse and execute commands
        const commands = this.parseGeneratedText(generatedText);
        await this.executeCommands(commands);
    }

    escapePrompt(text) {
        // Escape double quotes and preserve newlines
        return text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }

    async sendViaChatInput(command) {
        return new Promise((resolve) => {
            // Use the chat input bypass method
            const chatInput = document.getElementById('send_textarea');
            if (!chatInput) {
                throw new Error('Chat input not found');
            }
            
            // Clear any existing content immediately
            chatInput.value = '';
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Set the command after a brief delay
            setTimeout(() => {
                chatInput.value = command;
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Wait a moment for the input to be processed
                setTimeout(() => {
                    // Trigger send via keyboard event
                    const enterEvent = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    });
                    chatInput.dispatchEvent(enterEvent);
                    resolve();
                }, 300);
            }, 300);
        });
    }

    async waitForGenerationResult(timeoutMs = 30000) {
        const startTime = Date.now();
        const isGenerationComplete = () => {
            return !this.isGenerationActive() || 
                   document.querySelector('.swipe_right')?.style.display === 'block';
        };
        
        while (Date.now() - startTime < timeoutMs) {
            if (!isGenerationComplete()) {
                await this.delay(500);
                continue;
            }
            
            const result = this.getTempVarValue();
            if (result && result.trim()) {
                return result;
            }
            await this.delay(500);
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
        if (!commands || commands.length === 0) return;
        
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
            }
        }
        
        if (executedCount > 0 && extension_settings.outfit_tracker?.enableSysMessages) {
            this.sendSystemMessage(`[Outfit System] Processed ${executedCount} outfit change(s) automatically.`);
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
            `${msg.is_user ? 'User' : msg.name}: ${msg.mes}`
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
                const event = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    bubbles: true
                });
                chatInput.dispatchEvent(event);
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
            this.showPopup('Enable auto updates first with /outfit-auto on', 'warning');
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
