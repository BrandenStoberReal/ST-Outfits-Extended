var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { dragElementWithSave, resizeElement } from '../common/shared.js';
import { extractCommands } from '../processors/StringProcessor.js';
import { LLMUtility } from '../utils/LLMUtility.js';
import { formatSlotName as utilsFormatSlotName } from '../utils/utilities.js';
import { areSystemMessagesEnabled } from '../utils/SettingsUtil.js';
import { outfitStore } from '../common/Store.js';
import { CharacterInfoType, getCharacterInfoById } from '../utils/CharacterUtils.js';
/**
 * BotOutfitPanel - Manages the UI for the bot character's outfit tracking
 * This class creates and manages a draggable panel for viewing and modifying
 * the bot character's outfit, including clothing, accessories, and saved presets
 */
export class BotOutfitPanel {
    /**
     * Creates a new BotOutfitPanel instance
     * @param {object} outfitManager - The outfit manager for the bot character
     * @param {Array<string>} clothingSlots - Array of clothing slot names
     * @param {Array<string>} accessorySlots - Array of accessory slot names
     * @param {Function} saveSettingsDebounced - Debounced function to save settings
     */
    constructor(outfitManager, clothingSlots, accessorySlots, saveSettingsDebounced) {
        this.outfitManager = outfitManager;
        this.clothingSlots = clothingSlots;
        this.accessorySlots = accessorySlots;
        this.isVisible = false;
        this.domElement = null;
        this.currentTab = 'clothing';
        this.eventListeners = [];
        this.outfitSubscription = null;
        this.saveSettingsDebounced = saveSettingsDebounced;
    }
    /**
     * Creates the panel DOM element and sets up its basic functionality
     * @returns {HTMLElement} The created panel element
     */
    createPanel() {
        if (this.domElement) {
            return this.domElement;
        }
        const panel = document.createElement('div');
        panel.id = 'bot-outfit-panel';
        panel.className = 'outfit-panel';
        // Get the first message hash for display in the header (instance ID)
        const messageHash = this.generateMessageHash(this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || '');
        const hashDisplay = messageHash ? ` (${messageHash})` : '';
        // Replace placeholder "{{char}}" with the actual character name
        const characterName = this.outfitManager.character || 'Unknown';
        panel.innerHTML = `
            <div class="outfit-header">
                <h3>${characterName}'s Outfit${hashDisplay}</h3>
                <div class="outfit-actions">
                    <span class="outfit-action" id="bot-outfit-refresh">↻</span>
                    <span class="outfit-action" id="bot-outfit-close">×</span>
                </div>
            </div>
            <div class="outfit-tabs">
                <button class="outfit-tab${this.currentTab === 'clothing' ? ' active' : ''}" data-tab="clothing">Clothing</button>
                <button class="outfit-tab${this.currentTab === 'accessories' ? ' active' : ''}" data-tab="accessories">Accessories</button>
                <button class="outfit-tab${this.currentTab === 'outfits' ? ' active' : ''}" data-tab="outfits">Outfits</button>
            </div>
            <div class="outfit-content" id="bot-outfit-tab-content"></div>
        `;
        document.body.appendChild(panel);
        const tabs = panel.querySelectorAll('.outfit-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                const tabName = event.target.dataset.tab;
                this.currentTab = tabName;
                this.renderContent();
                tabs.forEach(t => t.classList.remove('active'));
                event.target.classList.add('active');
            });
        });
        return panel;
    }
    /**
     * Gets the first character message text to generate hash from (instance ID)
     * @returns {string} The text of the first AI message from the character
     */
    getFirstMessageText() {
        var _a;
        try {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            const characterName = getCharacterInfoById(context.characterId, CharacterInfoType.Name);
            if (context && context.chat && Array.isArray(context.chat)) {
                // Get the first AI message from the character (instance identifier)
                const aiMessages = context.chat.filter((msg) => !msg.is_user && !msg.is_system &&
                    (msg.name === this.outfitManager.character || (characterName && msg.name === characterName)));
                if (aiMessages.length > 0) {
                    const firstMessage = aiMessages[0];
                    return firstMessage.mes || '';
                }
            }
            return '';
        }
        catch (error) {
            console.warn('Could not get first message text for hash generation:', error);
            return '';
        }
    }
    /**
     * Renders the content of the currently selected tab
     * @returns {void}
     */
    renderContent() {
        if (!this.domElement) {
            return;
        }
        const contentArea = this.domElement.querySelector('.outfit-content');
        if (!contentArea) {
            return;
        }
        contentArea.innerHTML = '';
        switch (this.currentTab) {
            case 'clothing':
                this.renderPromptInjectionToggle(contentArea); // Add this line
                this.renderSlots(this.clothingSlots, contentArea);
                this.renderFillOutfitButton(contentArea);
                break;
            case 'accessories':
                this.renderSlots(this.accessorySlots, contentArea);
                break;
            case 'outfits':
                this.renderPresets(contentArea);
                break;
        }
    }
    /**
     * Renders the prompt injection toggle switch in the clothing tab
     * @param {HTMLElement} container - The container to render the toggle in
     */
    renderPromptInjectionToggle(container) {
        const isPromptInjectionEnabled = this.outfitManager.getPromptInjectionEnabled();
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'prompt-injection-container';
        toggleContainer.innerHTML = `
            <label class="switch-label" for="bot-outfit-prompt-injection">Prompt Injection</label>
            <label class="switch">
                <input type="checkbox" id="bot-outfit-prompt-injection" ${isPromptInjectionEnabled ? 'checked' : ''}>
                <span class="slider round"></span>
            </label>
            <div class="tooltip">?<span class="tooltiptext">When enabled, the bot's current outfit is injected into the prompt, allowing the LLM to be aware of what the bot is wearing.</span></div>
        `;
        container.appendChild(toggleContainer);
        const promptInjectionToggle = toggleContainer.querySelector('#bot-outfit-prompt-injection');
        if (promptInjectionToggle) {
            promptInjectionToggle.addEventListener('change', (event) => {
                const isChecked = event.target.checked;
                this.outfitManager.setPromptInjectionEnabled(isChecked);
                this.saveSettingsDebounced();
            });
        }
    }
    /**
     * Renders the outfit slots UI elements for the specified slots
     * @param {Array<string>} slots - Array of slot names to render
     * @param {HTMLElement} container - The container element to render slots in
     * @returns {void}
     */
    renderSlots(slots, container) {
        const outfitData = this.outfitManager.getOutfitData(slots);
        outfitData.forEach((slot) => {
            const slotElement = document.createElement('div');
            slotElement.className = 'outfit-slot';
            slotElement.dataset.slot = slot.name;
            slotElement.innerHTML = `
                <div class="slot-label">${this.formatSlotName(slot.name)}</div>
                <div class="slot-value" title="${slot.value}">${slot.value}</div>
                <div class="slot-actions">
                    <button class="slot-change">Change</button>
                </div>
            `;
            slotElement.querySelector('.slot-change').addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                const message = yield this.outfitManager.changeOutfitItem(slot.name);
                if (message && areSystemMessagesEnabled()) {
                    this.sendSystemMessage(message);
                }
                this.saveSettingsDebounced();
                this.renderContent();
            }));
            container.appendChild(slotElement);
        });
    }
    /**
     * Renders the presets UI elements for saved outfits
     * @param {HTMLElement} container - The container element to render presets in
     * @returns {void}
     */
    renderPresets(container) {
        const presets = this.outfitManager.getPresets();
        // Filter out the 'default' preset from the list of regular presets
        const regularPresets = presets.filter((preset) => preset !== 'default');
        // Get the name of the preset that is currently set as default
        const defaultPresetName = this.outfitManager.getDefaultPresetName();
        if (regularPresets.length === 0 && !this.outfitManager.hasDefaultOutfit()) {
            container.innerHTML = '<div>No saved outfits for this character instance.</div>';
        }
        else {
            // Check if we have a default that doesn't match any saved preset (like 'default' preset)
            if (defaultPresetName === 'default') {
                // Create a special entry for the unmatched default
                const defaultPresetElement = document.createElement('div');
                defaultPresetElement.className = 'outfit-preset default-preset';
                defaultPresetElement.innerHTML = `
                    <div class="preset-name">Default: Current Setup</div>
                    <div class="preset-actions">
                        <button class="load-preset" data-preset="default">Wear</button>
                    </div>
                `;
                defaultPresetElement.querySelector('.load-preset').addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                    const message = yield this.outfitManager.loadDefaultOutfit();
                    if (message && areSystemMessagesEnabled()) {
                        this.sendSystemMessage(message);
                    }
                    this.saveSettingsDebounced();
                    this.renderContent();
                }));
                container.appendChild(defaultPresetElement);
            }
            // Render all presets if the default is not 'default' (meaning we have named presets)
            if (defaultPresetName !== 'default' && regularPresets.length > 0) {
                regularPresets.forEach((preset) => {
                    const isDefault = (defaultPresetName === preset);
                    const presetElement = document.createElement('div');
                    presetElement.className = `outfit-preset ${isDefault ? 'default-preset-highlight' : ''}`;
                    presetElement.innerHTML = `
                        <div class="preset-name">${isDefault ? '👑 ' : ''}${preset}${isDefault ? '' : ''}</div>
                        <div class="preset-actions">
                            <button class="load-preset" data-preset="${preset}">Wear</button>
                            <button class="set-default-preset" data-preset="${preset}" ${isDefault ? 'style="display:none;"' : ''}>👑</button>
                            <button class="overwrite-preset" data-preset="${preset}">Overwrite</button>
                            <button class="delete-preset" data-preset="${preset}">×</button>
                        </div>
                    `;
                    presetElement.querySelector('.load-preset').addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                        const message = yield this.outfitManager.loadPreset(preset);
                        if (message && areSystemMessagesEnabled()) {
                            this.sendSystemMessage(message);
                        }
                        this.saveSettingsDebounced();
                        this.renderContent();
                    }));
                    presetElement.querySelector('.set-default-preset').addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                        const message = yield this.outfitManager.setPresetAsDefault(preset);
                        if (message && areSystemMessagesEnabled()) {
                            this.sendSystemMessage(message);
                        }
                        this.saveSettingsDebounced();
                        this.renderContent();
                    }));
                    const clearDefaultButton = document.createElement('button');
                    clearDefaultButton.className = 'clear-default-preset';
                    clearDefaultButton.textContent = '👑';
                    clearDefaultButton.title = 'Clear Default';
                    clearDefaultButton.style.display = isDefault ? 'inline-block' : 'none';
                    clearDefaultButton.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                        const message = yield this.outfitManager.clearDefaultPreset();
                        if (message && areSystemMessagesEnabled()) {
                            this.sendSystemMessage(message);
                        }
                        this.saveSettingsDebounced();
                        this.renderContent();
                    }));
                    presetElement.querySelector('.preset-actions').appendChild(clearDefaultButton);
                    presetElement.querySelector('.delete-preset').addEventListener('click', () => {
                        if (confirm(`Delete "${preset}" outfit?`)) {
                            const message = this.outfitManager.deletePreset(preset);
                            if (message && areSystemMessagesEnabled()) {
                                this.sendSystemMessage(message);
                            }
                            this.saveSettingsDebounced();
                            this.renderContent();
                        }
                    });
                    presetElement.querySelector('.overwrite-preset').addEventListener('click', () => {
                        // Confirmation dialog to confirm overwriting the preset
                        if (confirm(`Overwrite "${preset}" with current outfit?`)) {
                            const message = this.outfitManager.overwritePreset(preset);
                            if (message && areSystemMessagesEnabled()) {
                                this.sendSystemMessage(message);
                            }
                            this.saveSettingsDebounced();
                            this.renderContent();
                        }
                    });
                    container.appendChild(presetElement);
                });
            }
        }
        // Add save regular outfit button
        const saveButton = document.createElement('button');
        saveButton.className = 'save-outfit-btn';
        saveButton.textContent = 'Save Current Outfit';
        saveButton.style.marginTop = '5px';
        saveButton.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            const presetName = prompt('Name this outfit:');
            if (presetName && presetName.toLowerCase() !== 'default') {
                const message = yield this.outfitManager.savePreset(presetName.trim());
                if (message && areSystemMessagesEnabled()) {
                    this.sendSystemMessage(message);
                }
                this.saveSettingsDebounced();
                this.renderContent();
            }
            else if (presetName && presetName.toLowerCase() === 'default') {
                alert('Please save this outfit with a different name, then use the "Set Default" button on that outfit.');
            }
        }));
        container.appendChild(saveButton);
        // Add clear default outfit button
        const clearDefaultButton = document.createElement('button');
        clearDefaultButton.className = 'clear-default-preset-btn';
        clearDefaultButton.textContent = '👑 Clear Default Outfit';
        clearDefaultButton.title = 'Clear the current default outfit';
        clearDefaultButton.style.marginTop = '5px';
        clearDefaultButton.style.display = this.outfitManager.hasDefaultOutfit() ? 'block' : 'none';
        clearDefaultButton.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            const message = yield this.outfitManager.clearDefaultPreset();
            if (message && areSystemMessagesEnabled()) {
                this.sendSystemMessage(message);
            }
            this.saveSettingsDebounced();
            this.renderContent();
        }));
        container.appendChild(clearDefaultButton);
    }
    /**
     * Renders the button to fill the outfit with LLM-generated items
     * @param {HTMLElement} container - The container element to render the button in
     * @returns {void}
     */
    renderFillOutfitButton(container) {
        const fillOutfitButton = document.createElement('button');
        fillOutfitButton.className = 'fill-outfit-btn';
        fillOutfitButton.textContent = 'Fill Outfit with LLM';
        fillOutfitButton.style.marginTop = '5px';
        fillOutfitButton.style.marginBottom = '10px';
        fillOutfitButton.style.width = '100%';
        fillOutfitButton.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            yield this.generateOutfitFromCharacterInfo();
        }));
        container.appendChild(fillOutfitButton);
    }
    /**
     * Generates an outfit for the character based on character information using an LLM
     * @returns {Promise<void>} A promise that resolves when the outfit generation is complete
     */
    generateOutfitFromCharacterInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Show a notification that the process has started
                if (areSystemMessagesEnabled()) {
                    this.sendSystemMessage('Generating outfit based on character info...');
                }
                // Get character data
                const characterInfo = yield this.getCharacterData();
                if (characterInfo.error) {
                    console.error('Error getting character data:', characterInfo.error);
                    if (areSystemMessagesEnabled()) {
                        this.sendSystemMessage(`Error: ${characterInfo.error}`);
                    }
                    return;
                }
                // Generate outfit from LLM
                const response = yield this.generateOutfitFromLLM(characterInfo);
                // Parse and apply the outfit commands
                yield this.parseAndApplyOutfitCommands(response);
                // Success message
                if (areSystemMessagesEnabled()) {
                    this.sendSystemMessage('Outfit generated and applied successfully!');
                }
            }
            catch (error) {
                console.error('Error in generateOutfitFromCharacterInfo:', error);
                if (areSystemMessagesEnabled()) {
                    this.sendSystemMessage(`Error generating outfit: ${error.message}`);
                }
            }
        });
    }
    /**
     * Sends a system message to the UI
     * @param {string} message - The message to display
     * @returns {void}
     */
    sendSystemMessage(message) {
        // Use toastr popup instead of /sys command
        if (areSystemMessagesEnabled()) {
            toastr.info(message, 'Outfit System', {
                timeOut: 4000,
                extendedTimeOut: 8000
            });
        }
    }
    /**
     * Formats a slot name for display
     * @param {string} name - The slot name to format
     * @returns {string} The formatted slot name
     */
    formatSlotName(name) {
        return utilsFormatSlotName(name);
    }
    /**
     * Gets character data from the current context
     * @returns {Promise<any>} An object containing character information or an error
     */
    getCharacterData() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            if (!context || context.characterId === undefined || context.characterId === null) {
                return {
                    error: 'No character selected or context not ready'
                };
            }
            // Get character information
            const characterInfo = {
                name: getCharacterInfoById(context.characterId, CharacterInfoType.Name) || 'Unknown',
                description: getCharacterInfoById(context.characterId, CharacterInfoType.Description) || '',
                personality: getCharacterInfoById(context.characterId, CharacterInfoType.Personality) || '',
                scenario: getCharacterInfoById(context.characterId, CharacterInfoType.Scenario) || '',
                firstMessage: getCharacterInfoById(context.characterId, CharacterInfoType.DefaultMessage) || '',
                characterNotes: getCharacterInfoById(context.characterId, CharacterInfoType.CharacterNotes) || '',
            };
            // Get the first message from the current chat if it's different from the character's first_message
            if (context.chat && context.chat.length > 0) {
                const firstChatMessage = context.chat.find((msg) => !msg.is_user && !msg.is_system);
                if (firstChatMessage && firstChatMessage.mes) {
                    characterInfo.firstMessage = firstChatMessage.mes;
                }
            }
            return characterInfo;
        });
    }
    getDefaultOutfitPrompt() {
        return `Based on the character's description, personality, scenario, notes, and first message, generate appropriate outfit commands.\n\nCHARACTER INFO:\nName: <CHARACTER_NAME>\nDescription: <CHARACTER_DESCRIPTION>\nPersonality: <CHARACTER_PERSONALITY>\nScenario: <CHARACTER_SCENARIO>\nNotes: <CHARACTER_NOTES>\nFirst Message: <CHARACTER_FIRST_MESSAGE>\n\nOUTPUT FORMAT (one command per line):\noutfit-system_wear_headwear(\"item name\")\noutfit-system_wear_topwear(\"item name\")\noutfit-system_remove_headwear()  // for items not applicable\n\nSLOTS:\nClothing: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear\nAccessories: head-accessory, ears-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory\n\nINSTRUCTIONS:\n- Only output outfit commands based on character details\n- Use \"remove\" for items that don't fit the character\n- If uncertain about an item, omit the command\n- Output only commands, no explanations`;
    }
    generateOutfitFromLLM(characterInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Get the current system prompt or use the default
                let prompt = this.getDefaultOutfitPrompt();
                // Replace placeholders with actual character info
                prompt = prompt
                    .replace('<CHARACTER_NAME>', characterInfo.name)
                    .replace('<CHARACTER_DESCRIPTION>', characterInfo.description)
                    .replace('<CHARACTER_PERSONALITY>', characterInfo.personality)
                    .replace('<CHARACTER_SCENARIO>', characterInfo.scenario)
                    .replace('<CHARACTER_NOTES>', characterInfo.characterNotes)
                    .replace('<CHARACTER_FIRST_MESSAGE>', characterInfo.firstMessage);
                // Check if there is a connection profile set for the auto outfit system
                let connectionProfile = null;
                if (window.autoOutfitSystem && typeof window.autoOutfitSystem.getConnectionProfile === 'function') {
                    connectionProfile = window.autoOutfitSystem.getConnectionProfile();
                }
                // Use the unified LLM utility with profile if available
                return yield LLMUtility.generateWithProfile(prompt, 'You are an outfit generation system. Based on the character information provided, output outfit commands to set the character\'s clothing and accessories.', ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null), connectionProfile);
            }
            catch (error) {
                console.error('Error generating outfit from LLM:', error);
                throw error;
            }
        });
    }
    parseAndApplyOutfitCommands(response) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use the imported extractCommands function to extract outfit commands
            const commands = extractCommands(response);
            if (!commands || commands.length === 0) {
                console.log('[BotOutfitPanel] No outfit commands found in response');
                return;
            }
            console.log(`[BotOutfitPanel] Found ${commands.length} commands to process:`, commands);
            // Process each command
            for (const command of commands) {
                try {
                    yield this.processSingleCommand(command);
                }
                catch (error) {
                    console.error(`Error processing command "${command}":`, error);
                }
            }
            // Update the outfit panel UI
            this.renderContent();
            // Save the settings
            this.saveSettingsDebounced();
        });
    }
    processSingleCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Non-regex approach to parse command - similar to AutoOutfitSystem
                if (!command.startsWith('outfit-system_')) {
                    throw new Error(`Invalid command format: ${command}`);
                }
                // Extract the action part
                const actionStart = 'outfit-system_'.length;
                const actionEnd = command.indexOf('_', actionStart);
                if (actionEnd === -1) {
                    throw new Error(`Invalid command format: ${command}`);
                }
                const action = command.substring(actionStart, actionEnd);
                if (!['wear', 'remove', 'change'].includes(action)) {
                    throw new Error(`Invalid action: ${action}. Valid actions: wear, remove, change`);
                }
                // Extract the slot part
                const slotStart = actionEnd + 1;
                const slotEnd = command.indexOf('(', slotStart);
                if (slotEnd === -1) {
                    throw new Error(`Invalid command format: ${command}`);
                }
                const slot = command.substring(slotStart, slotEnd);
                // Extract the value part
                const valueStart = slotEnd + 1;
                let value = '';
                if (command.charAt(valueStart) === '"') { // If value is quoted
                    const quoteStart = valueStart + 1;
                    let i = quoteStart;
                    let escaped = false;
                    while (i < command.length - 1) {
                        const char = command.charAt(i);
                        if (escaped) {
                            value += char;
                            escaped = false;
                        }
                        else if (char === '\\') {
                            escaped = true;
                        }
                        else if (char === '"') {
                            break; // Found closing quote
                        }
                        else {
                            value += char;
                        }
                        i++;
                    }
                }
                else {
                    // Value is not quoted, extract until closing parenthesis
                    const closingParen = command.indexOf(')', valueStart);
                    if (closingParen !== -1) {
                        value = command.substring(valueStart, closingParen);
                    }
                }
                const cleanValue = value.split('"').join('').trim();
                console.log(`[BotOutfitPanel] Processing: ${action} ${slot} "${cleanValue}"`);
                // Apply the outfit change to the bot manager
                const message = yield this.outfitManager.setOutfitItem(slot, action === 'remove' ? 'None' : cleanValue);
                // Show system message if enabled
                if (message && areSystemMessagesEnabled()) {
                    this.sendSystemMessage(message);
                }
            }
            catch (error) {
                console.error('Error processing single command:', error);
                throw error;
            }
        });
    }
    /**
     * Toggles the visibility of the panel
     * @returns {void}
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        }
        else {
            this.show();
        }
    }
    /**
     * Shows the panel UI
     * @returns {void}
     */
    show() {
        var _a, _b;
        if (!this.domElement) {
            this.domElement = this.createPanel();
        }
        this.renderContent();
        this.domElement.style.display = 'flex';
        this.applyPanelColors(); // Apply colors after showing
        this.isVisible = true;
        // Set up dynamic refresh when panel becomes visible
        this.setupDynamicRefresh();
        if (this.domElement) {
            dragElementWithSave(this.domElement, 'bot-outfit-panel');
            // Initialize resizing with appropriate min/max dimensions
            setTimeout(() => {
                resizeElement($(this.domElement), 'bot-outfit-panel', {
                    minWidth: 250,
                    minHeight: 200,
                    maxWidth: 600,
                    maxHeight: 800
                });
            }, 10); // Small delay to ensure panel is rendered first
            (_a = this.domElement.querySelector('#bot-outfit-refresh')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                const outfitInstanceId = this.outfitManager.getOutfitInstanceId();
                this.outfitManager.loadOutfit(outfitInstanceId);
                this.renderContent();
            });
            (_b = this.domElement.querySelector('#bot-outfit-close')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => this.hide());
            // Add event listener for the prompt injection toggle
            const promptInjectionToggle = this.domElement.querySelector('#bot-outfit-prompt-injection');
            if (promptInjectionToggle) {
                promptInjectionToggle.addEventListener('change', (event) => {
                    const isChecked = event.target.checked;
                    this.outfitManager.setPromptInjectionEnabled(isChecked);
                    // Save the settings after changing
                    this.saveSettingsDebounced();
                });
            }
        }
    }
    // Apply panel colors based on saved preferences
    applyPanelColors() {
        var _a;
        if (this.domElement) {
            const storeState = outfitStore.getState();
            const colors = (_a = storeState.panelSettings) === null || _a === void 0 ? void 0 : _a.botPanelColors;
            if (colors) {
                this.domElement.style.background = colors.primary;
                this.domElement.style.border = `1px solid ${colors.border}`;
                this.domElement.style.boxShadow = `0 8px 32px ${colors.shadow}`;
            }
        }
    }
    /**
     * Hides the panel UI
     * @returns {void}
     */
    hide() {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
        // Clean up dynamic refresh when panel is hidden
        this.cleanupDynamicRefresh();
    }
    updateCharacter(name) {
        this.outfitManager.setCharacter(name);
        // Create the panel if it doesn't exist yet, so we can update the header
        if (!this.domElement) {
            this.createPanel();
        }
        if (this.domElement) {
            const header = this.domElement.querySelector('.outfit-header h3');
            if (header) {
                // Get the first message hash for display in the header (instance ID)
                const messageHash = this.generateMessageHash(this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || '');
                const hashDisplay = messageHash ? ` (${messageHash})` : '';
                // Use the name parameter or the manager's character property
                const formattedName = name || this.outfitManager.character || 'Unknown';
                header.textContent = `${formattedName}'s Outfit${hashDisplay}`;
            }
        }
        this.renderContent();
    }
    // Set up dynamic refresh listeners when the panel is shown
    setupDynamicRefresh() {
        var _a;
        // Clean up any existing listeners first
        this.cleanupDynamicRefresh();
        // Subscribe to store changes if we have access to the store
        if (window.outfitStore) {
            // Listen for changes in bot outfit data
            this.outfitSubscription = window.outfitStore.subscribe((state) => {
                var _a, _b;
                // Check if this panel's character/outfit instance has changed
                if (this.outfitManager.characterId && this.outfitManager.outfitInstanceId) {
                    const currentOutfit = (_b = (_a = state.botInstances[this.outfitManager.characterId]) === null || _a === void 0 ? void 0 : _a[this.outfitManager.outfitInstanceId]) === null || _b === void 0 ? void 0 : _b.bot;
                    if (currentOutfit) {
                        // Only refresh if the outfit data has actually changed
                        let hasChanged = false;
                        for (const [slot, value] of Object.entries(currentOutfit)) {
                            if (this.outfitManager.currentValues[slot] !== value) {
                                hasChanged = true;
                                break;
                            }
                        }
                        if (hasChanged && this.isVisible) {
                            this.renderContent();
                        }
                    }
                }
            });
        }
        // Get context to set up event listeners
        const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        if (context && context.eventSource && context.event_types) {
            const { eventSource, event_types } = context;
            // Listen for chat-related events that might affect outfit data
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_CHANGED, () => {
                if (this.isVisible) {
                    this.updateCharacter(this.outfitManager.character);
                    const outfitInstanceId = this.outfitManager.getOutfitInstanceId();
                    this.outfitManager.loadOutfit(outfitInstanceId);
                    this.renderContent();
                }
            }));
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_ID_CHANGED, () => {
                if (this.isVisible) {
                    this.updateCharacter(this.outfitManager.character);
                    const outfitInstanceId = this.outfitManager.getOutfitInstanceId();
                    this.outfitManager.loadOutfit(outfitInstanceId);
                    this.renderContent();
                }
            }));
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_CREATED, () => {
                if (this.isVisible) {
                    this.updateCharacter(this.outfitManager.character);
                    const outfitInstanceId = this.outfitManager.getOutfitInstanceId();
                    this.outfitManager.loadOutfit(outfitInstanceId);
                    this.renderContent();
                }
            }));
            this.eventListeners.push(() => eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                if (this.isVisible) {
                    this.renderContent();
                }
            }));
        }
    }
    // Clean up dynamic refresh listeners when the panel is hidden
    cleanupDynamicRefresh() {
        // Unsubscribe from store changes
        if (this.outfitSubscription) {
            this.outfitSubscription();
            this.outfitSubscription = null;
        }
        // Remove event listeners
        this.eventListeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.eventListeners = [];
    }
    // Generate a short identifier from the instance ID
    generateShortId(instanceId) {
        if (!instanceId) {
            return '';
        }
        // If the instance ID is already a short identifier, return it
        if (instanceId.startsWith('temp_')) {
            return 'temp';
        }
        // Create a simple short identifier by taking up to 6 characters of the instance ID
        // but only alphanumeric characters for better readability
        let cleanId = '';
        for (let i = 0; i < instanceId.length; i++) {
            const char = instanceId[i];
            const code = char.charCodeAt(0);
            // Check if character is digit (0-9)
            if (code >= 48 && code <= 57) {
                cleanId += char;
                continue;
            }
            // Check if character is uppercase letter A-Z
            if (code >= 65 && code <= 90) {
                cleanId += char;
                continue;
            }
            // Check if character is lowercase letter a-z
            if (code >= 97 && code <= 122) {
                cleanId += char;
            }
            // Otherwise, skip non-alphanumeric characters
        }
        return cleanId.substring(0, 6);
    }
    // Generate an 8-character hash from a text string
    generateMessageHash(text) {
        if (!text) {
            return '';
        }
        let hash = 0;
        const str = text.substring(0, 100); // Only use first 100 chars to keep ID manageable
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash &= hash; // Convert to 32-bit integer
        }
        // Convert to positive and return 8-character string representation
        return Math.abs(hash).toString(36).substring(0, 8).padEnd(8, '0');
    }
}
