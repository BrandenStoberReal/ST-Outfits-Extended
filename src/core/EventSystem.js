import { extensionEventBus, EXTENSION_EVENTS } from './events.js';
import { customMacroSystem } from '../utils/CustomMacroSystem.js';


class EventSystem {
    constructor(context) {
        this.botManager = context.botManager;
        this.userManager = context.userManager;
        this.botPanel = context.botPanel;
        this.userPanel = context.userPanel;
        this.autoOutfitSystem = context.autoOutfitSystem;
        this.updateForCurrentCharacter = context.updateForCurrentCharacter;
        this.converter = context.converter;
        this.processMacrosInFirstMessage = context.processMacrosInFirstMessage;
        this.context = null;

        this.initialize();
    }

    initialize() {
        this.context = window.getContext();
        if (!this.context || !this.context.eventSource || !this.context.event_types) {
            console.warn('[OutfitTracker] Context not fully available for event listeners yet, trying again later');
            setTimeout(() => this.initialize(), 1000);
            return;
        }

        this.setupSillyTavernEventListeners();
        this.setupExtensionEventListeners();
        this.overrideClearChat();
        this.overrideResetChat();

        // Initial update
        this.updateForCurrentCharacter();
    }

    setupSillyTavernEventListeners() {
        const { eventSource, event_types } = this.context;

        eventSource.on(event_types.APP_READY, () => this.handleAppReady());
        eventSource.on(event_types.CHAT_CHANGED, () => this.handleChatChange());
        eventSource.on(event_types.CHAT_CREATED, () => this.handleChatCreated());
        eventSource.on(event_types.MESSAGE_RECEIVED, (data) => this.handleMessageReceived(data));
        eventSource.on(event_types.MESSAGE_SWIPED, (index) => this.handleMessageSwiped(index));
    }

    setupExtensionEventListeners() {
        extensionEventBus.on(EXTENSION_EVENTS.CONTEXT_UPDATED, () => this.handleContextUpdate());
    }

    handleAppReady() {
        console.log('[OutfitTracker] App ready, marking auto outfit system as initialized');
        if (this.autoOutfitSystem) {
            this.autoOutfitSystem.markAppInitialized();
        }
        this.updateForCurrentCharacter();
    }

    handleChatChange() {
        const chat = this.context.chat;

        // Only trigger an update if the chat is populated.
        // This allows the handler to work for character switches, but prevents it from firing
        // with an empty context during a chat reset.
        if (chat && chat.length > 0) {
            console.log('[OutfitTracker] CHAT_CHANGED event fired with populated chat - updating for character switch');
            this.updateForCurrentCharacter();
            
            // Process macros in the first message after character switch
            setTimeout(async () => {
                await this.processMacrosInFirstMessage();
            }, 100); // Small delay to ensure character data is updated
        } else {
            console.log('[OutfitTracker] CHAT_CHANGED event fired with empty chat - likely a reset, skipping update and waiting for message render.');
        }
    }

    handleChatCreated() {
        console.log('[OutfitTracker] CHAT_CREATED event fired - skipping update, will be handled by message render to prevent race conditions.');
        // This handler is intentionally left blank.
        // CHAT_CREATED fires too early on reset, before the chat is populated.
        // The update is now reliably handled by the MESSAGE_RECEIVED event.
    }

    updateMessageElementContent(messageIndex, newContent) {
        try {
            // Get all message elements in the chat using the 'mes' CSS class
            const messageElements = document.querySelectorAll('#chat .mes');
            
            // Access the specific message element by index (should match chat array order)
            if (messageElements[messageIndex]) {
                // Find the text content area within the message element (has class 'mes_text')
                const textElement = messageElements[messageIndex].querySelector('.mes_text');

                if (textElement) {
                    // Use showdown library to render markdown content properly
                    if (window.SillyTavern && window.SillyTavern.libs && window.SillyTavern.libs.showdown) {
                        const converter = new window.SillyTavern.libs.showdown.Converter();
                        // Ensure the output is safe by sanitizing it with DOMPurify if available
                        let htmlContent = converter.makeHtml(newContent);
                        
                        // Sanitize the HTML content if DOMPurify is available
                        if (window.SillyTavern.libs && window.SillyTavern.libs.DOMPurify) {
                            htmlContent = window.SillyTavern.libs.DOMPurify.sanitize(htmlContent);
                        }
                        
                        textElement.innerHTML = htmlContent;
                    } else {
                        // Fallback to direct innerHTML if showdown is not available
                        textElement.innerHTML = newContent;
                    }
                    
                    // Optionally trigger content updated event to ensure 
                    // any other extensions or ST features are aware of the change
                    textElement.dispatchEvent(new CustomEvent('contentUpdated', {
                        detail: { content: newContent }
                    }));
                }
            }
        } catch (error) {
            console.error('Error updating message DOM element:', error);
        }
    }

    async handleMessageReceived(data) {
        const chat = this.context.chat;
        const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);
    
        // Check if this is the first AI message in a new chat
        if (aiMessages.length === 1 && !data.is_user) {
            console.log('[OutfitTracker] First AI message received, processing macros and updating outfit instance.');
            // Ensure outfit data is loaded before processing macros
            await this.updateForCurrentCharacter();
            await this.processMacrosInFirstMessage(); // Call the new function
        }
        
        // Process macro replacements in messages
        try {
            if (data && data.mes) {
                // Store original content for comparison
                const originalContent = data.mes;
                
                // Give a small delay to ensure outfit data is properly loaded
                // before replacing macros in the message
                data.mes = this.replaceOutfitMacrosInText(data.mes);
                
                // Update the DOM element if content changed
                if (originalContent !== data.mes) {
                    // Find the message index in the chat to update the DOM
                    const messageIndex = this.context.chat.indexOf(data);

                    if (messageIndex !== -1) {
                        this.updateMessageElementContent(messageIndex, data.mes);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing message for macros:', error);
        }
    }
    
    replaceOutfitMacrosInText(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }
        return customMacroSystem.replaceMacrosInText(text);
    }

    async handleMessageSwiped(index) {
        console.log(`[OutfitTracker] MESSAGE_SWIPED event fired with index: ${index}`);
        const chat = this.context.chat;
    
        if (!chat || index < 0 || index >= chat.length) { return; }
    
        // Check if the swiped message is the first message
        const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);

        if (aiMessages.length > 0 && chat[index] === aiMessages[0]) {
            console.log('[OutfitTracker] First message was swiped, processing macros and updating outfit instance.');
            
            // Use a timeout to ensure the swipe is fully processed before updating
            setTimeout(async () => {
                // Ensure the outfit data is properly loaded before processing macros
                await this.updateForCurrentCharacter();
                
                // Then process the first message again with updated outfit data
                await this.processMacrosInFirstMessage();
                
                // Also process all existing messages to ensure macros are updated after swipe
                await this.processAllMessagesForMacros();
            }, 100); // 100ms delay
        }
    }
    
    // Function to process all messages in the current chat for macro replacement
    async processAllMessagesForMacros() {
        try {
            const context = this.context;
            
            if (context && context.chat) {
                // Process all messages in the chat, not just the first one
                for (let i = 0; i < context.chat.length; i++) {
                    const message = context.chat[i];

                    if (message.mes && typeof message.mes === 'string') {
                        const originalMes = message.mes;

                        message.mes = this.replaceOutfitMacrosInText(message.mes);
                        
                        // Only update DOM if the content actually changed
                        if (originalMes !== message.mes) {
                            this.updateMessageElementContent(i, message.mes);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[OutfitTracker] Error processing all messages for macros:', error);
        }
    }



    handleContextUpdate() {
        this.updateForCurrentCharacter();
    }

    overrideResetChat() {
        // The function to reset chat is called `restartLLM` in the UI
        const originalRestart = window.restartLLM;

        if (!originalRestart) {
            console.warn('[OutfitTracker] window.restartLLM not found. Cannot override chat reset to flush saves.');
            return;
        }

        window.restartLLM = (...args) => {
            console.log('[OutfitTracker] Chat reset triggered (restartLLM). Flushing debounced saves.');
            
            // Flush any pending settings saves to prevent stale data on reset
            if (window.saveSettingsDebounced && typeof window.saveSettingsDebounced.flush === 'function') {
                window.saveSettingsDebounced.flush();
            }

            // Call the original function
            const result = originalRestart.apply(this, args);

            // After the original function completes, update the character and macros
            // Use a timeout to ensure the chat is cleared before we update
            setTimeout(async () => {
                // Ensure outfit data is loaded for the current character
                await this.updateForCurrentCharacter();
                
                // Process first message as needed
                await this.processMacrosInFirstMessage();
                
                // Process all existing messages to ensure macros are updated after reset
                await this.processAllMessagesForMacros();
            }, 100); // 100ms delay

            return result;
        };
    }

    overrideClearChat() {
        const originalClearChat = window.clearChat;

        window._originalClearChat = originalClearChat;

        window.clearChat = async (...args) => {
            const botOutfit = this.botManager.getCurrentOutfit();
            const userOutfit = this.userManager.getCurrentOutfit();

            await originalClearChat.apply(this, args);

            // After chat is cleared, restore the outfits
            await this.waitForChatReset();
            await this.updateForCurrentCharacter();
            await this.waitForUIReady();

            if (botOutfit) {
                this.botManager.setOutfit(botOutfit);
                await this.botManager.saveOutfit();
                this.botPanel.renderContent();
            }
            if (userOutfit) {
                this.userManager.setOutfit(userOutfit);
                await this.userManager.saveOutfit();
                this.userPanel.renderContent();
            }
            console.log('[OutfitTracker] Restored outfits after chat clear.');

            // Process macros in the first message after restoring outfits
            await this.processMacrosInFirstMessage();
            
            // Also process all existing messages to ensure macros are updated after clear
            await this.processAllMessagesForMacros();
        };
    }

    async waitForChatReset(timeout = 2000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (this.context.chat && this.context.chat.length === 0) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        console.warn('[OutfitTracker] Timed out waiting for chat reset.');
    }

    async waitForUIReady(timeout = 2000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (this.botPanel && this.userPanel) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        console.warn('[OutfitTracker] Timed out waiting for UI to be ready.');
    }
}

export function setupEventListeners(context) {
    return new EventSystem(context);
}
