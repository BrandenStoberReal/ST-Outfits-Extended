import { extensionEventBus, EXTENSION_EVENTS } from './events.js';
import { customMacroSystem } from '../utils/CustomMacroSystem.js';

class EventSystem {
    constructor(context) {
        this.botManager = context.botManager;
        this.userManager = context.userManager;
        this.autoOutfitSystem = context.autoOutfitSystem;
        this.updateForCurrentCharacter = context.updateForCurrentCharacter;
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

        this.updateForCurrentCharacter();
    }

    setupSillyTavernEventListeners() {
        const { eventSource, event_types } = this.context;

        eventSource.on(event_types.APP_READY, () => this.handleAppReady());
        eventSource.on(event_types.CHAT_CHANGED, () => this.handleChatChange());
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
        // Register character-specific macros when app is ready
        customMacroSystem.registerCharacterSpecificMacros();
    }

    handleChatChange() {
        if (this.context.chat?.length > 0) {
            console.log('[OutfitTracker] CHAT_CHANGED event fired with populated chat - updating for character switch');
            this.updateForCurrentCharacter();
            // Register character-specific macros when chat changes
            customMacroSystem.registerCharacterSpecificMacros();
        }
    }

    async handleMessageReceived(data) {
        const chat = this.context.chat;
        const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);
    
        if (aiMessages.length === 1 && !data.is_user) {
            console.log('[OutfitTracker] First AI message received, updating outfit instance.');
            await this.updateForCurrentCharacter();
            await this.processMacrosInFirstMessage();
        }
    }

    async handleMessageSwiped(index) {
        console.log(`[OutfitTracker] MESSAGE_SWIPED event fired with index: ${index}`);
        const chat = this.context.chat;
    
        if (!chat || index < 0 || index >= chat.length) {return;}
    
        const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);

        if (aiMessages.length > 0 && chat.indexOf(aiMessages[0]) === index) {
            console.log('[OutfitTracker] First message was swiped, updating outfit instance.');
            
            setTimeout(async () => {
                await this.updateForCurrentCharacter();
                await this.processMacrosInFirstMessage();
            }, 100);
        }
    }

    handleContextUpdate() {
        this.updateForCurrentCharacter();
        // Register character-specific macros when context updates
        customMacroSystem.registerCharacterSpecificMacros();
    }

    overrideResetChat() {
        if (typeof window.restartLLM !== 'function') {
            console.warn('[OutfitTracker] window.restartLLM not found. Cannot override chat reset.');
            return;
        }

        const originalRestart = window.restartLLM;

        window.restartLLM = (...args) => {
            console.log('[OutfitTracker] Chat reset triggered (restartLLM).');
            
            if (typeof window.saveSettingsDebounced?.flush === 'function') {
                window.saveSettingsDebounced.flush();
            }

            const result = originalRestart.apply(this, args);

            extensionEventBus.on(EXTENSION_EVENTS.CHAT_CLEARED, async () => {
                try {
                    await this.updateForCurrentCharacter();
                    await this.processMacrosInFirstMessage();
                } catch (error) {
                    console.error('[OutfitTracker] Error handling chat reset:', error);
                }
            });

            return result;
        };
    }

    overrideClearChat() {
        if (typeof window.clearChat !== 'function') {
            console.warn('[OutfitTracker] window.clearChat not found. Cannot override chat clear.');
            return;
        }

        const originalClearChat = window.clearChat;

        window.clearChat = async (...args) => {
            const botOutfit = this.botManager.getCurrentOutfit();
            const userOutfit = this.userManager.getCurrentOutfit();

            await originalClearChat.apply(this, args);

            await this.updateForCurrentCharacter();

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

            await this.processMacrosInFirstMessage();

            extensionEventBus.emit(EXTENSION_EVENTS.CHAT_CLEARED);
        };
    }
}

export function setupEventListeners(context) {
    return new EventSystem(context);
}
