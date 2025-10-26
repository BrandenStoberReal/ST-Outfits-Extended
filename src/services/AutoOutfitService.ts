import {extractCommands} from '../processors/StringProcessor';
import {generateOutfitFromLLM} from './LLMService';
import {customMacroSystem} from './CustomMacroService';
import {outfitStore} from '../common/Store';
import {CharacterInfoType, getCharacterInfoById} from '../utils/CharacterUtils';

declare const window: any;
declare const toastr: any;

export interface IAutoOutfitSystemStatus {
    enabled: boolean;
    hasPrompt: boolean;
    promptLength: number;
    isProcessing: boolean;
    consecutiveFailures: number;
    currentRetryCount: number;
    maxRetries: number;
}

export class AutoOutfitService {
    public systemPrompt: string;
    private outfitManager: any;
    private isEnabled: boolean;
    private connectionProfile: any;
    private isProcessing: boolean;
    private consecutiveFailures: number;
    private maxConsecutiveFailures: number;
    private eventHandler: ((data: any) => void) | null;
    private maxRetries: number;
    private retryDelay: number;
    private currentRetryCount: number;
    private appInitialized: boolean;
    private lastSuccessfulProcessing: Date | null;
    private llmOutput: string;
    private generatedCommands: string[];

    constructor(outfitManager: any) {
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
        this.appInitialized = false;
        this.lastSuccessfulProcessing = null;
        this.llmOutput = '';
        this.generatedCommands = [];
    }

    getDefaultPrompt(): string {
        return `You are a sophisticated outfit management AI. Your task is to analyze conversation snippets and identify any changes to a character's clothing or accessories. Based on your analysis, you must output a series of commands to update the character's outfit accordingly.\n\n**CONTEXT**\nCurrent outfit for {{char}}:\n- Headwear: {{char_headwear}}\n- Topwear: {{char_topwear}}\n- Top Underwear: {{char_topunderwear}}\n- Bottomwear: {{char_bottomwear}}\n- Bottom Underwear: {{char_bottomunderwear}}\n- Footwear: {{char_footwear}}\n- Foot Underwear: {{char_footunderwear}}\n- Accessories:\n  - Head: {{char_head-accessory}}\n  - Ears: {{char_ears-accessory}}\n  - Eyes: {{char_eyes-accessory}}\n  - Mouth: {{char_mouth-accessory}}\n  - Neck: {{char_neck-accessory}}\n  - Body: {{char_body-accessory}}\n  - Arms: {{char_arms-accessory}}\n  - Hands: {{char_hands-accessory}}\n  - Waist: {{char_waist-accessory}}\n  - Bottom: {{char_bottom-accessory}}\n  - Legs: {{char_legs-accessory}}\n  - Foot: {{char_foot-accessory}}\n\n**TASK**\nBased on the provided conversation, generate a sequence of commands to reflect any and all changes to the character's outfit.\n\n**COMMANDS**\nYou have the following commands at your disposal:\n- \`outfit-system_wear_<slot>(\"item name\")\
- \`outfit-system_remove_<slot>()\
- \`outfit-system_change_<slot>(\"new item name\")\
- \`outfit-system_replace_<slot>(\"new item name\")\
- \`outfit-system_unequip_<slot>()\
\n**SLOTS**\n- Clothing: \
headwear\
, \
topwear\
, \
topunderwear\
, \
bottomwear\
, \
bottomunderwear\
, \
footwear\
, \
footunderwear\
\n- Accessories: \
head-accessory\
, \
ear-accessory\
, \
eyes-accessory\
, \
mouth-accessory\
, \
neck-accessory\
, \
body-accessory\
, \
arms-accessory\
, \
hands-accessory\
, \
waist-accessory\
, \
bottom-accessory\
, \
legs-accessory\
, \
foot-accessory\
\n**INSTRUCTIONS**\n- Only output commands for explicit clothing changes.\n- If no changes are detected, output only \
[none]\
.\n- Do not include any explanations or conversational text in your output.\n- Ensure that the item names are enclosed in double quotes.\n\n**EXAMPLES**\n- **User:** I'm feeling a bit cold.\n  **{{char}}:** I'll put on my favorite sweater.\n  **Output:**\n  \
outfit-system_wear_topwear(\"Favorite Sweater\")\
\n- **User:** Your shoes are untied.\n  **{{char}}:** Oh, thanks for letting me know. I'll take them off and tie them properly.\n  **Output:**\n  \
outfit-system_remove_footwear()\
\n- **User:** That's a nice hat.\n  **{{char}}:** Thanks! It's new. I'll take it off for a moment to show you.\n  **Output:**\n  \
outfit-system_unequip_headwear()\
\n- **User:** I like your shirt.\n  **{{char}}:** Thanks! I think I'll unbutton it a bit.\n  **Output:**\n  \
outfit-system_change_topwear(\"Shirt (unbuttoned)\")\
\n- **User:** It's getting warm in here.\n  **{{char}}:** I agree. I'll take off my jacket and put on this t-shirt instead.\n  **Output:**\n  \
outfit-system_replace_topwear(\"T-shirt\")\
`;
    }

    enable(): string {
        if (this.isEnabled) {
            return '[Outfit System] Auto outfit updates already enabled.';
        }

        this.isEnabled = true;
        this.consecutiveFailures = 0;
        this.currentRetryCount = 0;
        this.setupEventListeners();
        return '[Outfit System] Auto outfit updates enabled.';
    }

    disable(): string {
        if (!this.isEnabled) {
            return '[Outfit System] Auto outfit updates already disabled.';
        }

        this.isEnabled = false;
        this.removeEventListeners();
        return '[Outfit System] Auto outfit updates disabled.';
    }

    setupEventListeners(): void {
        this.removeEventListeners();

        try {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

            if (!context || !context.eventSource || !context.event_types) {
                console.error('[AutoOutfitSystem] Context not ready for event listeners');
                return;
            }

            const {eventSource, event_types} = context;

            this.eventHandler = (data: any) => {
                if (this.isEnabled && !this.isProcessing && this.appInitialized && data && !data.is_user) {
                    console.log('[AutoOutfitSystem] New AI message received, processing...');

                    setTimeout(() => {
                        this.processOutfitCommands().catch((error: any) => {
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

    removeEventListeners(): void {
        try {
            if (this.eventHandler) {
                const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

                if (context && context.eventSource && context.event_types) {
                    context.eventSource.off(context.event_types.MESSAGE_RECEIVED, this.eventHandler);
                }
                this.eventHandler = null;
                console.log('[AutoOutfitSystem] Event listener removed');
            }
        } catch (error) {
            console.error('[AutoOutfitSystem] Failed to remove event listeners:', error);
        }
    }

    markAppInitialized(): void {
        if (!this.appInitialized) {
            this.appInitialized = true;
            console.log('[AutoOutfitSystem] App marked as initialized - will now process new AI messages');
        }
    }

    async processOutfitCommands(): Promise<void> {
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

    async processWithRetry(): Promise<void> {
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

    async executeGenCommand(): Promise<void> {
        const recentMessages = this.getLastMessages(3);

        if (!recentMessages.trim()) {
            throw new Error('No valid messages to process');
        }

        const processedSystemPrompt = this.replaceMacrosInPrompt(this.systemPrompt);
        const promptText = `${processedSystemPrompt}\n\nRecent Messages:\n${recentMessages}\n\nOutput:`

        console.log('[AutoOutfitSystem] Generating outfit commands with LLMService...');

        try {
            const result = await generateOutfitFromLLM({prompt: promptText});

            this.llmOutput = result; // Store the LLM output
            console.log('[AutoOutfitSystem] Generated result:', result);

            const commands = this.parseGeneratedText(result);

            this.generatedCommands = commands; // Store the generated commands

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

    getLlmOutput(): { llmOutput: string; generatedCommands: string[] } {
        return {
            llmOutput: this.llmOutput,
            generatedCommands: this.generatedCommands,
        };
    }

    replaceMacrosInPrompt(prompt: string): string {
        return customMacroSystem.replaceMacrosInText(prompt);
    }

    parseGeneratedText(text: string): string[] {
        if (!text || text.trim() === '[none]') {
            return [];
        }

        const commands = extractCommands(text);

        console.log(`[AutoOutfitSystem] Found ${commands.length} commands:`, commands);
        return commands;
    }

    async processCommandBatch(commands: string[]): Promise<void> {
        if (!commands || commands.length === 0) {
            console.log('[AutoOutfitSystem] No commands to process');
            return;
        }

        console.log(`[AutoOutfitSystem] Processing batch of ${commands.length} commands`);

        const successfulCommands: any[] = [];
        const failedCommands: any[] = [];
        const lowConfidenceCommands: any[] = [];

        for (const command of commands) {
            try {
                const confidence = this.calculateConfidenceScore(command);

                if (confidence < 0.7) {
                    lowConfidenceCommands.push({command, confidence});
                    continue;
                }

                const result = await this.processSingleCommand(command);

                if (result.success) {
                    successfulCommands.push(result);
                } else {
                    failedCommands.push({command, error: result.error});
                }
            } catch (error: any) {
                failedCommands.push({command, error: error.message});
                console.error(`Error processing command "${command}":`, error);
            }
        }

        if (successfulCommands.length > 0) {
            const storeState = outfitStore.getState();
            const enableSysMessages = storeState.settings?.enableSysMessages ?? true;

            if (enableSysMessages) {
                const activeCharName = this.getActiveCharacterName();
                const message = successfulCommands.length === 1
                    ? `[b]${activeCharName}[/b] made an outfit change.`
                    : `[b]${activeCharName}[/b] made multiple outfit changes.`;

                this.showPopup(message, 'info');
                await this.delay(1000);

                this.updateOutfitPanel();
            }
        }

        if (failedCommands.length > 0) {
            console.warn(`[AutoOutfitSystem] ${failedCommands.length} commands failed:`, failedCommands);
        }

        if (lowConfidenceCommands.length > 0) {
            console.warn(`[AutoOutfitSystem] ${lowConfidenceCommands.length} commands with low confidence were ignored:`, lowConfidenceCommands);
        }

        console.log(`[AutoOutfitSystem] Batch completed: ${successfulCommands.length} successful, ${failedCommands.length} failed, ${lowConfidenceCommands.length} low confidence`);
    }

    calculateConfidenceScore(command: string): number {
        const parsed = this.parseCommand(command);

        if (!parsed) {
            return 0;
        }

        let score = 0;
        const {action, slot, value} = parsed;

        score += 0.5;

        if (['wear', 'remove', 'change', 'replace', 'unequip'].includes(action)) {
            score += 0.2;
        }

        if (this.outfitManager.slots.includes(slot)) {
            score += 0.2;
        }

        if (value && ['wear', 'change', 'replace'].includes(action)) {
            score += 0.1;
        }

        return Math.min(score, 1.0);
    }

    getActiveCharacterName(): string {
        try {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext();
            const charId = context.this_chid;

            if (charId !== undefined) {
                const characterName = getCharacterInfoById(charId, CharacterInfoType.Name);
                return characterName || 'Character';
            }
            return 'Character';
        } catch (error) {
            console.error('Error getting active character name:', error);
            return 'Character';
        }
    }

    parseCommand(command: string): { action: string; slot: string; value: string } | null {
        if (!command || typeof command !== 'string') {
            return null;
        }

        const commandRegex = /^outfit-system_(wear|remove|change|replace|unequip)_([a-zA-Z0-9_-]+)\((?:\"([^\"]*)\"|)\)$/;
        const match = command.match(commandRegex);

        if (!match) {
            return null;
        }

        const [, action, slot, value] = match;

        return {
            action,
            slot,
            value: value || '',
        };
    }

    isValidSlotName(str: string): boolean {
        if (str.length === 0) {
            return false;
        }

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            if (!((char >= 'a' && char <= 'z') ||
                (char >= 'A' && char <= 'Z') ||
                (char >= '0' && char <= '9') ||
                char === '_' ||
                char === '-')) {
                return false;
            }
        }

        return true;
    }

    replaceAll(str: string, searchValue: string, replaceValue: string): string {
        if (!searchValue) {
            return str;
        }

        if (searchValue === replaceValue) {
            return str;
        }

        let result = str;
        let index = result.indexOf(searchValue);

        while (index !== -1) {
            result = result.substring(0, index) + replaceValue + result.substring(index + replaceValue.length);
            index = result.indexOf(searchValue, index + replaceValue.length);
        }

        return result;
    }

    async processSingleCommand(command: string): Promise<{
        success: boolean;
        command: string;
        message?: string;
        action?: string;
        slot?: string;
        value?: string;
        error?: string
    }> {
        try {
            const parsedCommand = this.parseCommand(command);

            if (!parsedCommand) {
                throw new Error(`Invalid command format: ${command}`);
            }

            const {action, slot, value} = parsedCommand;
            const cleanValue = value !== undefined ? this.replaceAll(value, '"', '').trim() : '';

            console.log(`[AutoOutfitSystem] Processing: ${action} ${slot} "${cleanValue}"`);

            const message = await this.executeCommand(action, slot, cleanValue);

            return {
                success: true,
                command,
                message,
                action,
                slot,
                value: cleanValue,
            };
        } catch (error: any) {
            return {
                success: false,
                command,
                error: error.message,
            };
        }
    }

    async executeCommand(action: string, slot: string, value: string): Promise<string> {
        const validSlots = [...this.outfitManager.slots];

        if (!validSlots.includes(slot)) {
            throw new Error(`Invalid slot: ${slot}. Valid slots: ${validSlots.join(', ')}`);
        }

        const validActions = ['wear', 'remove', 'change', 'replace', 'unequip'];

        if (!validActions.includes(action)) {
            throw new Error(`Invalid action: ${action}. Valid actions: ${validActions.join(', ')}`);
        }

        let finalAction = action;

        if (action === 'replace') {
            finalAction = 'change';
        } else if (action === 'unequip') {
            finalAction = 'remove';
        }

        return this.outfitManager.setOutfitItem(slot, finalAction === 'remove' ? 'None' : value);
    }

    updateOutfitPanel(): void {
        if (window.botOutfitPanel && window.botOutfitPanel.isVisible) {
            setTimeout(() => {
                try {
                    const outfitInstanceId = window.botOutfitPanel.outfitManager.getOutfitInstanceId();

                    window.botOutfitPanel.outfitManager.loadOutfit(outfitInstanceId);
                    window.botOutfitPanel.renderContent();
                    console.log('[AutoOutfitSystem] Outfit panel updated');
                } catch (error) {
                    console.error('Failed to update outfit panel:', error);
                }
            }, 500);
        }
    }

    getLastMessages(count: number = 3): string {
        try {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext();
            const chat = context?.chat;

            if (!chat || !Array.isArray(chat) || chat.length === 0) {
                return '';
            }

            return chat.slice(-count).map((msg: any) => {
                if (!msg || typeof msg.mes !== 'string') {
                    return '';
                }
                const prefix = msg.is_user ? 'User' : (msg.name || 'AI');

                return `${prefix}: ${msg.mes}`;
            }).join('\n');
        } catch (error) {
            console.error('Error getting last messages:', error);
            return '';
        }
    }

    showPopup(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
        try {
            if (typeof toastr !== 'undefined') {
                const options = {
                    timeOut: type === 'error' ? 5000 : 3000,
                    extendedTimeOut: type === 'error' ? 10000 : 5000,
                };

                toastr[type](message, 'Outfit System', options);
            }
        } catch (error) {
            console.error('Failed to show popup:', error);
        }
    }

    delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus(): IAutoOutfitSystemStatus {
        return {
            enabled: this.isEnabled,
            hasPrompt: Boolean(this.systemPrompt),
            promptLength: this.systemPrompt?.length || 0,
            isProcessing: this.isProcessing,
            consecutiveFailures: this.consecutiveFailures,
            currentRetryCount: this.currentRetryCount,
            maxRetries: this.maxRetries,
        };
    }

    async manualTrigger(): Promise<void> {
        if (this.isProcessing) {
            this.showPopup('Auto outfit check already in progress.', 'warning');
            return;
        }

        try {
            this.showPopup('Manual outfit check started...', 'info');
            await this.processOutfitCommands();
        } catch (error: any) {
            this.showPopup(`Manual trigger failed: ${error.message}`, 'error');
        }
    }

    setPrompt(prompt: string | null): string {
        this.systemPrompt = prompt || this.getDefaultPrompt();
        return '[Outfit System] System prompt updated.';
    }

    getProcessedSystemPrompt(): string {
        return this.replaceMacrosInPrompt(this.systemPrompt);
    }

    getUserName(): string {
        return customMacroSystem.getCurrentUserName();
    }

    resetToDefaultPrompt(): string {
        this.systemPrompt = this.getDefaultPrompt();
        return '[Outfit System] Reset to default prompt.';
    }

    setConnectionProfile(profile: any): string {
        this.connectionProfile = profile;
        return `[Outfit System] Connection profile set to: ${profile || 'default'}`;
    }

    getConnectionProfile(): any {
        return this.connectionProfile;
    }
}
