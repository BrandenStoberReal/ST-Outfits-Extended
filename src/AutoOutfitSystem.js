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
        this.retryDelay = 2000;
        this.isProcessing = false;
        this.lastProcessTime = null;
        this.consecutiveFailures = 0;
        this.maxConsecutiveFailures = 5;
        this.lastPipeContent = null;
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
        
        // Remove any existing listener first
        this.removeEventListener();
        
        // Listen for when AI messages are fully rendered
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

        // Get the current chat context
        const context = getContext();
        const chat = context.chat || [];
        
        if (chat.length === 0) return;
        
        // Get the latest AI message
        const latestMessage = chat[chat.length - 1];
        
        // Skip if this isn't an AI message
        if (latestMessage.is_user) return;
        
        try {
            this.showPopup('Auto outfit check started...', 'info');
            
            // Wait a moment to ensure message is fully settled
            setTimeout(async () => {
                await this.processOutfitCommands();
            }, 1500);
        } catch (error) {
            console.error('Auto outfit processing error:', error);
            this.showPopup('Auto outfit check failed to start.', 'error');
        }
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
        }
    }

    async executeWithRetry() {
        while (this.retryCount < this.maxRetries) {
            try {
                await this.executeSingleAttempt();
                this.consecutiveFailures = 0;
                this.showPopup('Auto outfit check completed successfully.', 'success');
                return;
            } catch (error) {
                this.retryCount++;
                
                if (this.retryCount < this.maxRetries) {
                    this.showPopup(`Auto outfit check failed (attempt ${this.retryCount}), retrying...`, 'warning');
                    await this.delay(this.retryDelay);
                } else {
                    this.showPopup('Auto outfit check failed 3 times.', 'error');
                    throw error;
                }
            }
        }
    }

    async executeSingleAttempt() {
        const { generateRaw } = getContext();
        
        if (!generateRaw) {
            throw new Error('generateRaw function not available');
        }

        // Get the last 3 completed messages
        const recentMessages = this.getLastCompletedMessages(3);
        if (!recentMessages.trim()) {
            throw new Error('No recent completed messages to process');
        }

        // Use {{pipe}} to capture the output of our generation
        const pipeCommand = `{{pipe}}`;
        
        const result = await generateRaw({
            systemPrompt: 'You are an outfit command parser. Extract valid outfit commands from COMPLETED text.',
            prompt: `${this.systemPrompt}\n\nLast 3 COMPLETED messages:\n${recentMessages}\n\nIMPORTANT: Only analyze COMPLETED messages. Output your analysis here: ${pipeCommand}`,
            jsonSchema: {
                name: 'OutfitCommands',
                description: 'Extracted outfit commands from completed text',
                strict: true,
                value: {
                    '$schema': 'http://json-schema.org/draft-04/schema#',
                    'type': 'object',
                    'properties': {
                        'commands': {
                            'type': 'array',
                            'items': {
                                'type': 'string'
                            }
                        }
                    },
                    'required': ['commands']
                }
            }
        });

        // Extract the content from {{pipe}} macro
        const pipeContent = this.extractPipeContent(result);
        this.lastPipeContent = pipeContent;
        
        if (!pipeContent) {
            throw new Error('No content captured from pipe macro');
        }

        // Now parse the pipe content for commands
        const parsedResult = this.parsePipeContent(pipeContent);
        await this.executeCommands(parsedResult.commands || []);
    }

    extractPipeContent(result) {
        // The {{pipe}} macro captures the AI's thinking process
        // We need to extract the actual command output from it
        if (typeof result === 'string') {
            // Look for JSON content within the pipe output
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return jsonMatch[0];
            }
            return result;
        }
        return null;
    }

    parsePipeContent(pipeContent) {
        try {
            // Try to parse the pipe content as JSON
            if (typeof pipeContent === 'string' && pipeContent.trim()) {
                const parsed = JSON.parse(pipeContent);
                if (parsed && Array.isArray(parsed.commands)) {
                    return { commands: parsed.commands };
                }
                
                // If it's not JSON, try to extract commands from text
                const commands = [];
                const commandMatches = pipeContent.match(/outfit-system_\w+_\w+\([^)]*\)/g);
                if (commandMatches) {
                    commands.push(...commandMatches);
                }
                return { commands };
            }
        } catch (error) {
            console.error('Failed to parse pipe content:', error);
            // Fallback: try to extract commands from raw text
            const commands = [];
            const commandMatches = pipeContent.match(/outfit-system_\w+_\w+\([^)]*\)/g);
            if (commandMatches) {
                commands.push(...commandMatches);
            }
            return { commands };
        }
        return { commands: [] };
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getLastCompletedMessages(count = 3) {
        const { chat } = getContext();
        if (!chat || chat.length === 0) return '';
        
        const completedMessages = chat.slice(-count);
        return completedMessages.map(msg => 
            `${msg.is_user ? 'User' : 'AI'}: ${msg.mes}`
        ).join('\n');
    }

    async executeCommands(commands) {
        if (!commands || commands.length === 0) {
            this.showPopup('No outfit changes detected in completed messages.', 'info');
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
            this.showPopup(`Applied ${executedCount} outfit change(s) from completed messages.`, 'success');
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
            lastPipeContent: this.lastPipeContent
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
