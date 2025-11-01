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
import { formatSlotName as utilsFormatSlotName } from '../utils/utilities.js';
import { areSystemMessagesEnabled } from '../utils/SettingsUtil.js';
import { outfitStore } from '../common/Store.js';
/**
 * UserOutfitPanel - Manages the UI for the user character's outfit tracking
 * This class creates and manages a draggable panel for viewing and modifying
 * the user character's outfit, including clothing, accessories, and saved presets
 */
export class UserOutfitPanel {
    /**
     * Creates a new UserOutfitPanel instance
     * @param {object} outfitManager - The outfit manager for the user character
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
        this.saveSettingsDebounced = saveSettingsDebounced;
        this.eventListeners = [];
        this.outfitSubscription = null;
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
        panel.id = 'user-outfit-panel';
        panel.className = 'outfit-panel';
        // Get the first message hash for display in the header (instance ID)
        const messageHash = this.generateMessageHash(this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || '');
        const hashDisplay = messageHash ? ` (${messageHash})` : '';
        panel.innerHTML = `
            <div class="outfit-header">
                <h3>Your Outfit${hashDisplay}</h3>
                <div class="outfit-actions">
                    <span class="outfit-action" id="user-outfit-refresh">↻</span>
                    <span class="outfit-action" id="user-outfit-close">×</span>
                </div>
            </div>
            <div class="outfit-tabs">
                <button class="outfit-tab${this.currentTab === 'clothing' ? ' active' : ''}" data-tab="clothing">Clothing</button>
                <button class="outfit-tab${this.currentTab === 'accessories' ? ' active' : ''}" data-tab="accessories">Accessories</button>
                <button class="outfit-tab${this.currentTab === 'outfits' ? ' active' : ''}" data-tab="outfits">Outfits</button>
            </div>
            <div class="outfit-content" id="user-outfit-tab-content"></div>
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
            if (context && context.chat && Array.isArray(context.chat)) {
                // Get the first AI message from the character (instance identifier)
                const aiMessages = context.chat.filter((msg) => !msg.is_user && !msg.is_system);
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
                this.renderPromptInjectionToggle(contentArea);
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
    renderPromptInjectionToggle(container) {
        const isPromptInjectionEnabled = this.outfitManager.getPromptInjectionEnabled();
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'prompt-injection-container';
        toggleContainer.innerHTML = `
            <label class="switch-label" for="user-outfit-prompt-injection">Prompt Injection</label>
            <label class="switch">
                <input type="checkbox" id="user-outfit-prompt-injection" ${isPromptInjectionEnabled ? 'checked' : ''}>
                <span class="slider round"></span>
            </label>
            <div class="tooltip">?<span class="tooltiptext">When enabled, your current outfit is injected into the prompt, allowing the LLM to be aware of what you are wearing.</span></div>
        `;
        container.appendChild(toggleContainer);
        const promptInjectionToggle = toggleContainer.querySelector('#user-outfit-prompt-injection');
        if (promptInjectionToggle) {
            promptInjectionToggle.addEventListener('change', (event) => {
                const isChecked = event.target.checked;
                this.outfitManager.setPromptInjectionEnabled(isChecked);
                this.saveSettingsDebounced();
            });
        }
    }
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
    renderPresets(container) {
        const presets = this.outfitManager.getPresets();
        // Filter out the 'default' preset from the list of regular presets
        const regularPresets = presets.filter((preset) => preset !== 'default');
        // Get the name of the preset that is currently set as default
        const defaultPresetName = this.outfitManager.getDefaultPresetName();
        if (regularPresets.length === 0 && !this.outfitManager.hasDefaultOutfit()) {
            container.innerHTML = '<div>No saved outfits for this instance.</div>';
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
                    if (areSystemMessagesEnabled()) {
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
                    presetElement.querySelector('.delete-preset').addEventListener('click', () => {
                        if (confirm(`Delete "${preset}" outfit?`)) {
                            const message = this.outfitManager.deletePreset(preset);
                            if (areSystemMessagesEnabled()) {
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
        // Add clear regular outfit button
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
        fillOutfitButton.addEventListener('click', () => {
            alert('Fill Outfit with LLM is only available for character outfits, not user outfits.');
        });
        container.appendChild(fillOutfitButton);
    }
    formatSlotName(name) {
        return utilsFormatSlotName(name);
    }
    toggle() {
        if (this.isVisible) {
            this.hide();
        }
        else {
            this.show();
        }
    }
    show() {
        var _a, _b;
        if (!this.domElement) {
            this.domElement = this.createPanel();
        }
        // Update the header to ensure it has the latest instance ID
        this.updateHeader();
        this.renderContent();
        this.domElement.style.display = 'flex';
        this.applyPanelColors(); // Apply colors after showing
        this.isVisible = true;
        // Set up dynamic refresh when panel becomes visible
        this.setupDynamicRefresh();
        if (this.domElement) {
            dragElementWithSave(this.domElement, 'user-outfit-panel');
            // Initialize resizing with appropriate min/max dimensions
            setTimeout(() => {
                resizeElement($(this.domElement), 'user-outfit-panel', {
                    minWidth: 250,
                    minHeight: 200,
                    maxWidth: 600,
                    maxHeight: 800
                });
            }, 10); // Small delay to ensure panel is rendered first
            (_a = this.domElement.querySelector('#user-outfit-refresh')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                const outfitInstanceId = this.outfitManager.getOutfitInstanceId();
                this.outfitManager.loadOutfit(outfitInstanceId);
                this.renderContent();
            });
            (_b = this.domElement.querySelector('#user-outfit-close')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => this.hide());
        }
    }
    /**
     * Applies panel colors based on saved preferences
     * @returns {void}
     */
    applyPanelColors() {
        var _a;
        if (this.domElement) {
            const storeState = outfitStore.getState();
            const colors = (_a = storeState.panelSettings) === null || _a === void 0 ? void 0 : _a.userPanelColors;
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
    /**
     * Updates the header to reflect changes (like new instance ID)
     * @returns {void}
     */
    updateHeader() {
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
                header.textContent = `Your Outfit${hashDisplay}`;
            }
        }
    }
    /**
     * Sets up dynamic refresh listeners when the panel is shown
     * @returns {void}
     */
    setupDynamicRefresh() {
        var _a;
        // Clean up any existing listeners first
        this.cleanupDynamicRefresh();
        // Subscribe to store changes if we have access to the store
        if (window.outfitStore) {
            // Listen for changes in user outfit data
            this.outfitSubscription = window.outfitStore.subscribe((state) => {
                // Check if this panel's outfit instance has changed
                if (this.outfitManager.outfitInstanceId) {
                    const currentUserOutfit = state.userInstances[this.outfitManager.outfitInstanceId];
                    if (currentUserOutfit) {
                        // Only refresh if the outfit data has actually changed
                        let hasChanged = false;
                        for (const [slot, value] of Object.entries(currentUserOutfit)) {
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
                    const outfitInstanceId = this.outfitManager.getOutfitInstanceId();
                    this.outfitManager.loadOutfit(outfitInstanceId);
                    this.updateHeader();
                    this.renderContent();
                }
            }));
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_ID_CHANGED, () => {
                if (this.isVisible) {
                    const outfitInstanceId = this.outfitManager.getOutfitInstanceId();
                    this.outfitManager.loadOutfit(outfitInstanceId);
                    this.updateHeader();
                    this.renderContent();
                }
            }));
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_CREATED, () => {
                if (this.isVisible) {
                    const outfitInstanceId = this.outfitManager.getOutfitInstanceId();
                    this.outfitManager.loadOutfit(outfitInstanceId);
                    this.updateHeader();
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
    /**
     * Cleans up dynamic refresh listeners when the panel is hidden
     * @returns {void}
     */
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
    /**
     * Generates a short identifier from the instance ID
     * @param {string} instanceId - The instance ID to generate a short ID from
     * @returns {string} A short identifier based on the instance ID
     */
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
    /**
     * Generates an 8-character hash from a text string
     * @param {string} text - The text to generate a hash from
     * @returns {string} An 8-character hash string representation of the text
     */
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
