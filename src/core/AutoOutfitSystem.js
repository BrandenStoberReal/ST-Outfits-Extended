import { extractCommands } from '../utils/StringProcessor.js';
import { generateOutfitFromLLM } from '../services/LLMService.js';
import { customMacroSystem } from '../utils/CustomMacroSystem.js';

export class AutoOutfitSystem {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isEnabled = false;
        this.systemPrompt = this.getDefaultPrompt();
        this.connectionProfile = null;
        this.isProcessing = false;
        this.consecutiveFailures = 0;
        this.maxConsecutiveFailures = 5;
        this.eventHandler = null;
        this.maxRetries = 3;
        this.retryDelay = 2000;
        this.currentRetryCount = 0;
        this.commandQueue = [];
        this.isProcessingQueue = false;
        this.processingTimeout = null;
        this.appInitialized = false;
        this.lastSuccessfulProcessing = null;
    }

    getDefaultPrompt() {
        return `Analyze the recent conversation for any mentions of the character putting on, wearing, removing, or changing clothing items or accessories.
        
CONTEXT:
Current outfit for {{char}}:
{{char_headwear}} | {{char_topwear}} | {{char_topunderwear}} | {{char_bottomwear}} | {{char_bottomunderwear}} | {{char_footwear}} | {{char_footunderwear}}
Accessories: {{char_head-accessory}} | {{char_ears-accessory}} | {{char_eyes-accessory}} | {{char_mouth-accessory}} | {{char_neck-accessory}} | {{char_body-accessory}} | {{char_arms-accessory}} | {{char_hands-accessory}} | {{char_waist-accessory}} | {{char_bottom-accessory}} | {{char_legs-accessory}} | {{char_foot-accessory}}

TASK:
If clothing/accessory changes occur, output only outfit-system commands (one per line) in this exact format:
outfit-system_wear_headwear("item name")
outfit-system_remove_topwear()
outfit-system_change_bottomwear("new item name")

SLOTS:
Clothing: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear
Accessories: head-accessory, ears-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory

NOTES:
- Only output commands for explicit clothing changes
- Use "change" to modify existing items ("White Blouse" to "White Blouse (unbuttoned)")
- If no changes detected, output: [none]
- Output only commands, no explanations`;
    }

    enable() {
        if (this.isEnabled) {return '[Outfit System] Auto outfit updates already enabled.';}
        
        this.isEnabled = true;
        this.consecutiveFailures = 0;
        this.currentRetryCount = 0;
        this.setupEventListeners();
        return '[Outfit System] Auto outfit updates enabled.';
    }

    disable() {
        if (!this.isEnabled) {return '[Outfit System] Auto outfit updates already disabled.';}
        
        this.isEnabled = false;
        this.removeEventListeners();
        this.commandQueue = [];
        return '[Outfit System] Auto outfit updates disabled.';
    }

    setupEventListeners() {
        this.removeEventListeners();
        
        try {
            const context = window.getContext();

            if (!context || !context.eventSource || !context.event_types) {
                console.error('[AutoOutfitSystem] Context not ready for event listeners');
                return;
            }
            
            const { eventSource, event_types } = context;

            this.eventHandler = (data) => {
                if (this.isEnabled && !this.isProcessing && this.appInitialized && data && !data.is_user) {
                    console.log('[AutoOutfitSystem] New AI message received, processing...');
                    if (this.processingTimeout) {clearTimeout(this.processingTimeout);}
                    
                    this.processingTimeout = setTimeout(() => {
                        this.processOutfitCommands().catch(error => {
                            console.error('Auto outfit processing failed:', error);
                            this.consecutiveFailures++;
                        });
                    }, 1000);
                }
            };
            
            eventSource.on(event_types.MESSAGE_RECEIVED, this.eventHandler);
            console.log('[AutoOutfitSystem] Event listener registered for MESSAGE_RECEIVED');
        } catch (error) {
            console.error('[AutoOutfitSystem] Failed to set up event listeners:', error);
        }
    }

    removeEventListeners() {
        try {
            if (this.eventHandler) {
                const context = window.getContext();

                if (context && context.eventSource && context.event_types) {
                    context.eventSource.off(context.event_types.MESSAGE_RECEIVED, this.eventHandler);
                }
                this.eventHandler = null;
                if (this.processingTimeout) {
                    clearTimeout(this.processingTimeout);
                    this.processingTimeout = null;
                }
                console.log('[AutoOutfitSystem] Event listener removed');
            }
        } catch (error) {
            console.error('[AutoOutfitSystem] Failed to remove event listeners:', error);
        }
    }

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
        
        if (!this.outfitManager || !this.outfitManager.setCharacter) {
            console.error('[AutoOutfitSystem] Outfit manager not properly initialized');
            return;
        }
        
        this.isProcessing = true;
        this.currentRetryCount = 0;
        
        try {
            await this.processWithRetry();
            this.lastSuccessfulProcessing = new Date();
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
                return;
            } catch (error) {
                this.currentRetryCount++;
                if (this.currentRetryCount < this.maxRetries) {
                    console.log(`[AutoOutfitSystem] Attempt ${this.currentRetryCount} failed, retrying in ${this.retryDelay}ms...`, error);
                    await this.delay(this.retryDelay);
                } else {
                    throw error;
                }
            }
        }
    }

    async executeGenCommand() {
        const recentMessages = this.getLastMessages(3);

        if (!recentMessages.trim()) {
            throw new Error('No valid messages to process');
        }

        const processedSystemPrompt = this.replaceMacrosInPrompt(this.systemPrompt);
        const promptText = `${processedSystemPrompt}\n\nRecent Messages:\n${recentMessages}\n\nOutput:`;

        console.log('[AutoOutfitSystem] Generating outfit commands with LLMService...');

        try {
            const result = await generateOutfitFromLLM({ prompt: promptText }, this);

            console.log('[AutoOutfitSystem] Generated result:', result);

            const commands = this.parseGeneratedText(result);

            if (commands.length > 0) {
                console.log(`[AutoOutfitSystem] Found ${commands.length} commands, processing...`);
                await this.processCommandBatch(commands);
            } else {
                console.log('[AutoOutfitSystem] No outfit commands found in response');
                if (result.trim() !== '[none]') {
                    this.showPopup('LLM could not parse any clothing data from the character.', 'warning');
                }
            }
        } catch (error) {
            console.error('[AutoOutfitSystem] Generation failed:', error);
            throw error;
        }
    }

    replaceMacrosInPrompt(prompt) {
        return customMacroSystem.replaceMacrosInText(prompt);
    }

    parseGeneratedText(text) {
        if (!text || text.trim() === '[none]') {
            return [];
        }
        
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
        
        if (successfulCommands.length > 0 && window.extension_settings?.outfit_tracker?.enableSysMessages) {
            const messagesByCharacter = {};

            successfulCommands.forEach(({ message }) => {
                const charName = message.match(/(\w+) put on|removed|changed/)?.[1] || 'Character';

                if (!messagesByCharacter[charName]) {
                    messagesByCharacter[charName] = [];
                }
                messagesByCharacter[charName].push(message);
            });
            
            for (const [charName, messages] of Object.entries(messagesByCharacter)) {
                this.showPopup(messages.length === 1 ? messages[0] : `${charName} made multiple outfit changes.`, 'info');
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
            const commandRegex = /^outfit-system_(wear|remove|change)_([a-zA-Z0-9_-]+)\((?:"(.*?)")?\)$/;
            const match = command.match(commandRegex);

            if (!match) {
                throw new Error(`Invalid command format: ${command}`);
            }

            const [, action, slot, value] = match;
            const cleanValue = value !== undefined ? value.replace(/"/g, '').trim() : '';

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

        return this.outfitManager.setOutfitItem(slot, action === 'remove' ? 'None' : value);
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
            const context = window.getContext();
            const chat = context?.chat;
            
            if (!chat || !Array.isArray(chat) || chat.length === 0) {
                return '';
            }
            
            return chat.slice(-count).map(msg => {
                if (!msg || typeof msg.mes !== 'string') {return '';}
                const prefix = msg.is_user ? 'User' : (msg.name || 'AI');

                return `${prefix}: ${msg.mes}`;
            }).join('\n');
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

                toastr[type](message, 'Outfit System', options);
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
            hasPrompt: Boolean(this.systemPrompt),
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

    getProcessedSystemPrompt() {
        return this.replaceMacrosInPrompt(this.systemPrompt);
    }
    
    getUserName() {
        return customMacroSystem.getCurrentUserName();
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
}