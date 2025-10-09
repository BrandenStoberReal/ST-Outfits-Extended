import { extensionEventBus, EXTENSION_EVENTS } from './events.js';


class EventSystem {
    constructor(botManager, userManager, botPanel, userPanel, autoOutfitSystem, updateForCurrentCharacter) {
        this.botManager = botManager;
        this.userManager = userManager;
        this.botPanel = botPanel;
        this.userPanel = userPanel;
        this.autoOutfitSystem = autoOutfitSystem;
        this.updateForCurrentCharacter = updateForCurrentCharacter;
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

        // Initial update
        this.updateForCurrentCharacter();
    }

    setupSillyTavernEventListeners() {
        const { eventSource, event_types } = this.context;

        eventSource.on(event_types.APP_READY, () => this.handleAppReady());
        eventSource.on(event_types.CHAT_CHANGED, () => this.handleChatChange());
        eventSource.on(event_types.CHAT_CREATED, () => this.handleChatCreated());
        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (messageId, type) => this.handleCharacterMessageRendered(messageId, type));
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
        } else {
            console.log('[OutfitTracker] CHAT_CHANGED event fired with empty chat - likely a reset, skipping update and waiting for message render.');
        }
    }

    handleChatCreated() {
        console.log('[OutfitTracker] CHAT_CREATED event fired - skipping update, will be handled by message render to prevent race conditions.');
        // This handler is intentionally left blank. 
        // CHAT_CREATED fires too early on reset, before the chat is populated.
        // The update is now reliably handled by the CHARACTER_MESSAGE_RENDERED event.
    }

    async handleCharacterMessageRendered(messageId, type) {
        if (type === 'first_message') {
            console.log(`[OutfitTracker] CHARACTER_MESSAGE_RENDERED (first_message) event fired. This is the primary trigger for chat resets.`);
            // Add a small delay to ensure the chat context is fully updated before we access it.
            setTimeout(async () => {
                await this.updateForCurrentCharacter();
            }, 150);
        }
    }

    async handleMessageSwiped(index) {
        console.log(`[OutfitTracker] MESSAGE_SWIPED event fired with index: ${index}`);
        const chat = this.context.chat;

        if (!chat || index < 0 || index >= chat.length) {return;}

        const swipedMessage = chat[index];
        const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);
        const firstMessage = aiMessages.length > 0 ? aiMessages[0] : null;

        if (firstMessage && swipedMessage.mes === firstMessage.mes) {
            console.log('[OutfitTracker] First message was swiped, updating outfit instance');
            await this.updateForCurrentCharacter();
        }
    }

    handleContextUpdate() {
        this.updateForCurrentCharacter();
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

export function setupEventListeners(...args) {
    return new EventSystem(...args);
}
