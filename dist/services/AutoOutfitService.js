var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { extractCommands } from '../processors/StringProcessor.js';
import { generateOutfitFromLLM } from './LLMService.js';
import { customMacroSystem } from './CustomMacroService.js';
import { outfitStore } from '../stores/Store.js';
import { CharacterInfoType, getCharacterInfoById } from '../utils/CharacterUtils.js';
import { debugLog } from '../logging/DebugLogger.js';
export class AutoOutfitService {
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
        this.appInitialized = false;
        this.lastSuccessfulProcessing = null;
        this.llmOutput = '';
        this.generatedCommands = [];
    }
    getDefaultPrompt() {
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
    enable() {
        if (this.isEnabled) {
            return '[Outfit System] Auto outfit updates already enabled.';
        }
        this.isEnabled = true;
        this.consecutiveFailures = 0;
        this.currentRetryCount = 0;
        this.setupEventListeners();
        return '[Outfit System] Auto outfit updates enabled.';
    }
    disable() {
        if (!this.isEnabled) {
            return '[Outfit System] Auto outfit updates already disabled.';
        }
        this.isEnabled = false;
        this.removeEventListeners();
        return '[Outfit System] Auto outfit updates disabled.';
    }
    setupEventListeners() {
        var _a;
        this.removeEventListeners();
        try {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            if (!context || !context.eventSource || !context.event_types) {
                debugLog('Context not ready for event listeners', null, 'error');
                return;
            }
            const { eventSource, event_types } = context;
            this.eventHandler = (data) => {
                if (this.isEnabled && !this.isProcessing && this.appInitialized && data && !data.is_user) {
                    debugLog('New AI message received, processing...', null, 'log');
                    setTimeout(() => {
                        this.processOutfitCommands().catch((error) => {
                            debugLog('Auto outfit processing failed', error, 'error');
                            this.consecutiveFailures++;
                        });
                    }, 1000);
                }
            };
            eventSource.on(event_types.MESSAGE_RECEIVED, this.eventHandler);
            debugLog('Event listener registered for MESSAGE_RECEIVED', null, 'log');
        }
        catch (error) {
            debugLog('Failed to set up event listeners', error, 'error');
        }
    }
    removeEventListeners() {
        var _a;
        try {
            if (this.eventHandler) {
                const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
                if (context && context.eventSource && context.event_types) {
                    context.eventSource.off(context.event_types.MESSAGE_RECEIVED, this.eventHandler);
                }
                this.eventHandler = null;
                debugLog('Event listener removed', null, 'log');
            }
        }
        catch (error) {
            debugLog('Failed to remove event listeners', error, 'error');
        }
    }
    markAppInitialized() {
        if (!this.appInitialized) {
            this.appInitialized = true;
            debugLog('App marked as initialized - will now process new AI messages', null, 'log');
        }
    }
    processOutfitCommands() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
                this.disable();
                this.showPopup('Auto outfit updates disabled due to repeated failures.', 'error');
                return;
            }
            if (this.isProcessing) {
                debugLog('Already processing, skipping', null, 'log');
                return;
            }
            if (!this.outfitManager || !this.outfitManager.setCharacter) {
                debugLog('Outfit manager not properly initialized', null, 'error');
                return;
            }
            this.isProcessing = true;
            this.currentRetryCount = 0;
            try {
                yield this.processWithRetry();
                this.lastSuccessfulProcessing = new Date();
            }
            catch (error) {
                debugLog('Outfit command processing failed after retries', error, 'error');
                this.consecutiveFailures++;
                this.showPopup(`Outfit check failed ${this.consecutiveFailures} time(s).`, 'error');
            }
            finally {
                this.isProcessing = false;
            }
        });
    }
    processWithRetry() {
        return __awaiter(this, void 0, void 0, function* () {
            while (this.currentRetryCount < this.maxRetries) {
                try {
                    this.showPopup(`Checking for outfit changes... (Attempt ${this.currentRetryCount + 1}/${this.maxRetries})`, 'info');
                    yield this.executeGenCommand();
                    this.consecutiveFailures = 0;
                    this.showPopup('Outfit check completed.', 'success');
                    return;
                }
                catch (error) {
                    this.currentRetryCount++;
                    if (this.currentRetryCount < this.maxRetries) {
                        debugLog(`Attempt ${this.currentRetryCount} failed, retrying in ${this.retryDelay}ms...`, error, 'log');
                        yield this.delay(this.retryDelay);
                    }
                    else {
                        throw error;
                    }
                }
            }
        });
    }
    executeGenCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            const recentMessages = this.getLastMessages(3);
            if (!recentMessages.trim()) {
                throw new Error('No valid messages to process');
            }
            const processedSystemPrompt = yield this.replaceMacrosInPrompt(this.systemPrompt);
            const promptText = `${processedSystemPrompt}\n\nRecent Messages:\n${recentMessages}\n\nOutput:`;
            debugLog('Generating outfit commands with LLMService...', null, 'log');
            try {
                // Get the connection profile to use for this generation
                const connectionProfile = this.getConnectionProfile();
                if (connectionProfile) {
                    debugLog(`Using connection profile: ${connectionProfile}`, null, 'log');
                }
                else {
                    debugLog('Using default connection', null, 'log');
                }
                const result = yield generateOutfitFromLLM({ prompt: promptText });
                this.llmOutput = result; // Store the LLM output
                debugLog('Generated result', { result }, 'log');
                const commands = this.parseGeneratedText(result);
                this.generatedCommands = commands; // Store the generated commands
                if (commands.length > 0) {
                    debugLog(`Found ${commands.length} commands, processing...`, null, 'log');
                    yield this.processCommandBatch(commands);
                }
                else {
                    debugLog('No outfit commands found in response', null, 'log');
                    if (result.trim() !== '[none]') {
                        this.showPopup('LLM could not parse any clothing data from the character.', 'warning');
                    }
                }
            }
            catch (error) {
                debugLog('Generation failed', error, 'error');
                throw error;
            }
        });
    }
    getLlmOutput() {
        return {
            llmOutput: this.llmOutput,
            generatedCommands: this.generatedCommands,
        };
    }
    replaceMacrosInPrompt(prompt) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield customMacroSystem.replaceMacrosInText(prompt);
        });
    }
    parseGeneratedText(text) {
        if (!text || text.trim() === '[none]') {
            return [];
        }
        const commands = extractCommands(text);
        debugLog(`Found ${commands.length} commands`, { commands }, 'log');
        return commands;
    }
    processCommandBatch(commands) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!commands || commands.length === 0) {
                debugLog('No commands to process', null, 'log');
                return;
            }
            debugLog(`Processing batch of ${commands.length} commands`, null, 'log');
            const successfulCommands = [];
            const failedCommands = [];
            const lowConfidenceCommands = [];
            for (const command of commands) {
                try {
                    const confidence = this.calculateConfidenceScore(command);
                    if (confidence < 0.7) {
                        lowConfidenceCommands.push({ command, confidence });
                        continue;
                    }
                    const result = yield this.processSingleCommand(command);
                    if (result.success) {
                        successfulCommands.push(result);
                    }
                    else {
                        failedCommands.push({ command, error: result.error });
                    }
                }
                catch (error) {
                    failedCommands.push({ command, error: error.message });
                    debugLog(`Error processing command "${command}":`, error, 'error');
                }
            }
            if (successfulCommands.length > 0) {
                const storeState = outfitStore.getState();
                const enableSysMessages = (_b = (_a = storeState.settings) === null || _a === void 0 ? void 0 : _a.enableSysMessages) !== null && _b !== void 0 ? _b : true;
                if (enableSysMessages) {
                    const activeCharName = this.getActiveCharacterName();
                    const message = successfulCommands.length === 1
                        ? `[b]${activeCharName}[/b] made an outfit change.`
                        : `[b]${activeCharName}[/b] made multiple outfit changes.`;
                    this.showPopup(message, 'info');
                    yield this.delay(1000);
                    this.updateOutfitPanel();
                }
            }
            if (failedCommands.length > 0) {
                debugLog(`${failedCommands.length} commands failed`, { failedCommands }, 'warn');
            }
            if (lowConfidenceCommands.length > 0) {
                debugLog(`${lowConfidenceCommands.length} commands with low confidence were ignored`, { lowConfidenceCommands }, 'warn');
            }
            debugLog(`Batch completed: ${successfulCommands.length} successful, ${failedCommands.length} failed, ${lowConfidenceCommands.length} low confidence`, null, 'log');
        });
    }
    calculateConfidenceScore(command) {
        const parsed = this.parseCommand(command);
        if (!parsed) {
            return 0;
        }
        let score = 0;
        const { action, slot, value } = parsed;
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
    getActiveCharacterName() {
        var _a;
        try {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext();
            const charId = context.this_chid;
            if (charId !== undefined) {
                const characterName = getCharacterInfoById(charId, CharacterInfoType.Name);
                return characterName || 'Character';
            }
            return 'Character';
        }
        catch (error) {
            debugLog('Error getting active character name', error, 'error');
            return 'Character';
        }
    }
    parseCommand(command) {
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
    isValidSlotName(str) {
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
    replaceAll(str, searchValue, replaceValue) {
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
    processSingleCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const parsedCommand = this.parseCommand(command);
                if (!parsedCommand) {
                    throw new Error(`Invalid command format: ${command}`);
                }
                const { action, slot, value } = parsedCommand;
                const cleanValue = value !== undefined ? this.replaceAll(value, '"', '').trim() : '';
                debugLog(`Processing: ${action} ${slot} "${cleanValue}"`, null, 'log');
                const message = yield this.executeCommand(action, slot, cleanValue);
                return {
                    success: true,
                    command,
                    message,
                    action,
                    slot,
                    value: cleanValue,
                };
            }
            catch (error) {
                return {
                    success: false,
                    command,
                    error: error.message,
                };
            }
        });
    }
    executeCommand(action, slot, value) {
        return __awaiter(this, void 0, void 0, function* () {
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
            }
            else if (action === 'unequip') {
                finalAction = 'remove';
            }
            return this.outfitManager.setOutfitItem(slot, finalAction === 'remove' ? 'None' : value);
        });
    }
    updateOutfitPanel() {
        if (window.botOutfitPanel && window.botOutfitPanel.isVisible) {
            setTimeout(() => {
                try {
                    const outfitInstanceId = window.botOutfitPanel.outfitManager.getOutfitInstanceId();
                    window.botOutfitPanel.outfitManager.loadOutfit(outfitInstanceId);
                    window.botOutfitPanel.renderContent();
                    debugLog('Outfit panel updated', null, 'log');
                }
                catch (error) {
                    debugLog('Failed to update outfit panel', error, 'error');
                }
            }, 500);
        }
    }
    getLastMessages(count = 3) {
        var _a;
        try {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext();
            const chat = context === null || context === void 0 ? void 0 : context.chat;
            if (!chat || !Array.isArray(chat) || chat.length === 0) {
                return '';
            }
            return chat.slice(-count).map((msg) => {
                if (!msg || typeof msg.mes !== 'string') {
                    return '';
                }
                const prefix = msg.is_user ? 'User' : (msg.name || 'AI');
                return `${prefix}: ${msg.mes}`;
            }).join('\n');
        }
        catch (error) {
            debugLog('Error getting last messages', error, 'error');
            return '';
        }
    }
    showPopup(message, type = 'info') {
        try {
            if (typeof toastr !== 'undefined') {
                const options = {
                    timeOut: type === 'error' ? 5000 : 3000,
                    extendedTimeOut: type === 'error' ? 10000 : 5000,
                };
                toastr[type](message, 'Outfit System', options);
            }
        }
        catch (error) {
            debugLog('Failed to show popup', error, 'error');
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getStatus() {
        var _a;
        return {
            enabled: this.isEnabled,
            hasPrompt: Boolean(this.systemPrompt),
            promptLength: ((_a = this.systemPrompt) === null || _a === void 0 ? void 0 : _a.length) || 0,
            isProcessing: this.isProcessing,
            consecutiveFailures: this.consecutiveFailures,
            currentRetryCount: this.currentRetryCount,
            maxRetries: this.maxRetries,
        };
    }
    manualTrigger() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isProcessing) {
                this.showPopup('Auto outfit check already in progress.', 'warning');
                return;
            }
            try {
                this.showPopup('Manual outfit check started...', 'info');
                yield this.processOutfitCommands();
            }
            catch (error) {
                this.showPopup(`Manual trigger failed: ${error.message}`, 'error');
            }
        });
    }
    setPrompt(prompt) {
        this.systemPrompt = prompt ? prompt : this.getDefaultPrompt();
        // Update the outfit store to reflect the new prompt
        outfitStore.setSetting('autoOutfitPrompt', this.systemPrompt);
        return '[Outfit System] System prompt updated.';
    }
    getProcessedSystemPrompt() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.replaceMacrosInPrompt(this.systemPrompt);
        });
    }
    getUserName() {
        return customMacroSystem.getCurrentUserName();
    }
    resetToDefaultPrompt() {
        this.systemPrompt = this.getDefaultPrompt();
        // Update the outfit store to reflect the new default prompt
        outfitStore.setSetting('autoOutfitPrompt', this.systemPrompt);
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
