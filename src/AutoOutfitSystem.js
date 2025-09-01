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
        this.lastGenerationId = null; // Track the last processed generation
        this.pendingGeneration = null; // Store the last generation data
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
        
        // Listen for generation completion events
        this.generationStartHandler = this.handleGenerationStart.bind(this);
        this.generationEndHandler = this.handleGenerationEnd.bind(this);
        
        eventSource.on(event_types.GENERATION_AFTER_COMMANDS, this.generationStartHandler);
        eventSource.on(event_types.GENERATION_ENDED, this.generationEndHandler);
    }

    removeEventListener() {
        const { eventSource, event_types } = getContext();
        if (this.generationStartHandler) {
            eventSource.off(event_types.GENERATION_AFTER_COMMANDS, this.generationStartHandler);
        }
        if (this.generationEndHandler) {
            eventSource.off(event_types.GENERATION_ENDED, this.generationEndHandler);
        }
    }

    handleGenerationStart(data) {
        // Store that a generation is starting
        this.pendingGeneration = {
            startTime: Date.now(),
            data: data
        };
    }

    async handleGenerationEnd(data) {
        // Skip if not enabled, processing, or no prompt
        if (!this.isEnabled || !this.systemPrompt || this.isProcessing) return;
        
        // Skip if generation failed or was aborted
        if (data?.error || data?.aborted) {
            console.log('[OutfitSystem] Generation failed or aborted, skipping processing');
            this.pendingGeneration = null;
            return;
        }
        
        // Skip if we don't have a pending generation or it's too old
        if (!this.pendingGeneration || (Date.now() - this.pendingGeneration.startTime > 30000)) {
            this.pendingGeneration = null;
            return;
        }
        
        // Skip if this is a duplicate generation (same ID)
        if (data?.mes_id && data.mes_id === this.lastGenerationId) {
            console.log('[OutfitSystem] Duplicate generation ID, skipping');
            this.pendingGeneration = null;
            return;
        }
        
        // Store the generation ID to prevent duplicate processing
        this.lastGenerationId = data?.mes_id;
        
        try {
            // Show starting message as popup
            this.showPopup('Auto outfit check started, please wait...', 'info');
            
            // Process the completed generation
            setTimeout(async () => {
                await this.processGenerationOutput(data);
            }, 1000); // Short delay to ensure everything is settled
        } catch (error) {
            console.error('Auto outfit processing error:', error);
            this.showPopup('Auto outfit check failed to start.', 'error');
        } finally {
            this.pendingGeneration = null;
        }
    }

    async processGenerationOutput(generationData) {
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
            await this.executeWithRetry(generationData);
        } catch (error) {
            console.error('[OutfitSystem] Final processing failure:', error);
            this.consecutiveFailures++;
            this.showPopup(`Auto outfit check failed ${this.consecutiveFailures} time(s).`, 'error');
        } finally {
            this.isProcessing = false;
            this.lastProcessTime = Date.now();
        }
    }

    async executeWithRetry(generationData) {
        while (this.retryCount < this.maxRetries) {
            try {
                await this.executeSingleAttempt(generationData);
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

    async executeSingleAttempt(generationData) {
        const { generateRaw } = getContext();
        
        if (!generateRaw) {
            throw new Error('generateRaw function not available');
        }

        // Extract the generated text from the completed generation
        const generatedText = this.extractGeneratedText(generationData);
        if (!generatedText.trim()) {
            throw new Error('No generated text to process');
        }

        this.showPopup('Analyzing AI response for outfit commands...', 'info');

        // Use the generated text as the prompt for command extraction
        const result = await generateRaw({
            systemPrompt: 'You are an outfit command parser. Extract valid outfit commands from the generated text.',
            prompt: `${this.systemPrompt}\n\nGenerated AI Text:\n${generatedText}\n\nIMPORTANT: Extract ONLY completed outfit commands from the text above.`,
            jsonSchema: {
                name: 'OutfitCommands',
                description: 'Extracted outfit commands from generated text',
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

        const parsedResult = this.parseResult(result);
        await this.executeCommands(parsedResult.commands || []);
    }

    extractGeneratedText(generationData) {
        // Try to extract the generated text from various possible locations
        if (generationData?.mes) {
            return generationData.mes; // Most likely location
        }
        if (generationData?.text) {
            return generationData.text;
        }
        if (generationData?.result?.text) {
            return generationData.result.text;
        }
        if (generationData?.response) {
            return generationData.response;
        }
        
        // Fallback: check the chat for the latest AI message
        const context = getContext();
        const chat = context.chat || [];
        if (chat.length > 0) {
            const latestMessage = chat[chat.length - 1];
            if (!latestMessage.is_user) {
                return latestMessage.mes;
            }
        }
        
        return '';
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    parseResult(result) {
        try {
            if (typeof result === 'string' && result.trim()) {
                const parsed = JSON.parse(result);
                if (parsed && Array.isArray(parsed.commands)) {
                    return { commands: parsed.commands };
                }
            }
        } catch (error) {
            console.error('Failed to parse outfit commands:', error);
            throw new Error('Invalid JSON response from AI');
        }
        return { commands: [] };
    }

    async executeCommands(commands) {
        if (!commands || commands.length === 0) {
            this.showPopup('No outfit commands found in AI response.', 'info');
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
            this.showPopup(`Applied ${executedCount} outfit change(s) from AI response.`, 'success');
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
            lastGenerationId: this.lastGenerationId
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
            // For manual trigger, we'll process the last AI message
            const context = getContext();
            const chat = context.chat || [];
            const aiMessages = chat.filter(msg => !msg.is_user);
            
            if (aiMessages.length === 0) {
                this.showPopup('No AI messages found to process.', 'warning');
                return;
            }
            
            const lastAIMessage = aiMessages[aiMessages.length - 1];
            await this.processGenerationOutput({ mes: lastAIMessage.mes });
        } catch (error) {
            this.showPopup(`Manual trigger failed: ${error.message}`, 'error');
        }
    }
}
