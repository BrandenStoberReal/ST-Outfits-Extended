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

Important: Always use the exact slot names listed above. Never invent new slot names.

IMPORTANT: Output ONLY valid JSON with the "commands" array. Do not include any other text or commentary.`;
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
        if (!this.isEnabled || !this.systemPrompt || this.isProcessing) return;

        try {
            this.showPopup('Auto outfit check started, please wait...', 'info');
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
                const commands = await this.executeSingleAttempt();
                this.consecutiveFailures = 0;
                
                if (commands && commands.length > 0) {
                    this.showPopup('Auto outfit check completed successfully.', 'success');
                } else {
                    this.showPopup('No outfit changes detected in recent messages.', 'info');
                }
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

        const recentMessages = this.getLastMessages(3);
        if (!recentMessages.trim()) {
            throw new Error('No recent messages to process');
        }

        // Use a more direct approach without JSON schema first
        let result;
        try {
            result = await generateRaw({
                systemPrompt: 'You are an outfit command parser. Extract valid outfit commands from the text. Output ONLY the commands array in JSON format.',
                prompt: `${this.systemPrompt}\n\nLast 3 messages:\n${recentMessages}`,
                jsonSchema: {
                    name: 'OutfitCommands',
                    description: 'Extracted outfit commands from text',
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
        } catch (schemaError) {
            console.warn('JSON schema generation failed, trying raw generation:', schemaError);
            
            // Fallback: try without JSON schema
            result = await generateRaw({
                systemPrompt: 'You are an outfit command parser. Extract valid outfit commands from the text. Output ONLY the commands array in JSON format like: {"commands": ["outfit-system_wear_headwear(\"hat\")"]}',
                prompt: `${this.systemPrompt}\n\nLast 3 messages:\n${recentMessages}`
            });
        }

        const commands = this.extractCommandsFromResponse(result);
        await this.executeCommands(commands);
        return commands;
    }

    extractCommandsFromResponse(response) {
        console.log('[OutfitSystem] Raw AI response:', response);
        
        if (!response || typeof response !== 'string') {
            return [];
        }

        // Method 1: Try to parse as JSON first
        try {
            const parsed = JSON.parse(response.trim());
            if (parsed && Array.isArray(parsed.commands)) {
                console.log('[OutfitSystem] Found commands in JSON:', parsed.commands);
                return parsed.commands;
            }
        } catch (e) {
            // Not JSON, continue to other methods
        }

        // Method 2: Look for JSON-like structure in text
        const jsonMatch = response.match(/\{"commands":\s*\[[^\]]*\]\}/) || 
                         response.match(/\[[^\]]*\]/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    console.log('[OutfitSystem] Found array in text:', parsed);
                    return parsed;
                } else if (parsed.commands && Array.isArray(parsed.commands)) {
                    console.log('[OutfitSystem] Found commands object in text:', parsed.commands);
                    return parsed.commands;
                }
            } catch (e) {
                // Continue to next method
            }
        }

        // Method 3: Direct command extraction from any text
        const commands = [];
        const commandRegex = /outfit-system_(\w+)_(\w+)\(([^)]*)\)/g;
        let match;
        
        while ((match = commandRegex.exec(response)) !== null) {
            const fullCommand = match[0];
            commands.push(fullCommand);
            console.log('[OutfitSystem] Found command in text:', fullCommand);
        }

        // Method 4: Look for commands in code blocks or quotes
        if (commands.length === 0) {
            const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
            let codeMatch;
            
            while ((codeMatch = codeBlockRegex.exec(response)) !== null) {
                const codeContent = codeMatch[1];
                const codeCommands = this.extractCommandsFromResponse(codeContent);
                commands.push(...codeCommands);
            }
        }

        console.log('[OutfitSystem] Final extracted commands:', commands);
        return commands;
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
            return 0;
        }
        
        let executedCount = 0;
        for (const command of commands) {
            try {
                const match = command.match(/outfit-system_(\w+)_(\w+)\(([^)]*)\)/);
                if (match) {
                    const [, action, slot, value] = match;
                    const cleanedValue = value.replace(/"/g, '').trim();
                    
                    if (cleanedValue === '' && action !== 'remove') {
                        console.warn(`Skipping empty value command: ${command}`);
                        continue;
                    }
                    
                    await this.executeCommand(action, slot, cleanedValue);
                    executedCount++;
                    console.log(`[OutfitSystem] Executed: ${action}_${slot}(${cleanedValue})`);
                }
            } catch (error) {
                console.error(`Error executing command "${command}":`, error);
            }
        }
        
        if (executedCount > 0 && extension_settings.outfit_tracker?.enableSysMessages) {
            this.sendSystemMessage(`[Outfit System] Processed ${executedCount} outfit change(s) automatically.`);
        }
        
        return executedCount;
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
            lastProcessAgo: this.lastProcessTime ? this.formatTimeAgo(this.lastProcessTime) : 'Never'
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

    // Debug function to test command extraction
    testCommandExtraction(text) {
        const commands = this.extractCommandsFromResponse(text);
        console.log('Test results:', { input: text, output: commands });
        this.showPopup(`Found ${commands.length} commands in test text`, 'info');
        return commands;
    }
}
