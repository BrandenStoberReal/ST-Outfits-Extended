import { extensionEventBus, EXTENSION_EVENTS } from './events.js';
import { customMacroSystem } from '../utils/CustomMacroSystem.js';
import { outfitStore } from '../common/Store.js';
import { generateMessageHash } from '../utils/utilities.js';
import { dataPersistenceService } from '../services/DataPersistenceService.js';

class EventSystem {
    constructor(context) {
        this.botManager = context.botManager;
        this.userManager = context.userManager;
        this.autoOutfitSystem = context.autoOutfitSystem;
        this.updateForCurrentCharacter = context.updateForCurrentCharacter;
        this.processMacrosInFirstMessage = context.processMacrosInFirstMessage;
        this.context = context.context || null;
        
        // Track the first message hash to avoid unnecessary updates
        this.currentFirstMessageHash = null;

        this.initialize();
    }

    initialize() {
        // Use the provided context if available, otherwise try to get from window
        this.context = this.context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());
        
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
        customMacroSystem.registerCharacterSpecificMacros(this.context);
    }

    handleChatChange() {
        if (this.context.chat?.length > 0) {
            // Check if the first AI message has actually changed before triggering update
            const firstBotMessage = this.context.chat.find(msg => !msg.is_user && !msg.is_system);
            
            if (firstBotMessage) {
                // Generate a hash of the first message to compare with the stored one
                const firstMessageHash = this.generateMessageHash(firstBotMessage.mes);
                
                // Only update if the first message has actually changed
                if (this.currentFirstMessageHash !== firstMessageHash) {
                    console.log('[OutfitTracker] CHAT_CHANGED event fired and first message has changed - updating for new conversation context');
                    this.currentFirstMessageHash = firstMessageHash;
                    this.updateForCurrentCharacter();
                    // Register character-specific macros when chat changes
                    customMacroSystem.registerCharacterSpecificMacros(this.context);
                } else {
                    console.log('[OutfitTracker] CHAT_CHANGED event fired but first message unchanged - skipping update');
                }
            } else {
                // If there's no first message, clear the hash to allow update when a new first message appears
                this.currentFirstMessageHash = null;
                console.log('[OutfitTracker] CHAT_CHANGED event fired with no first bot message - updating for character switch');
                this.updateForCurrentCharacter();
                // Register character-specific macros when chat changes
                customMacroSystem.registerCharacterSpecificMacros(this.context);
            }
        }
    }

    async handleMessageReceived(data) {
        const chat = this.context.chat;
        const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);
    
        if (aiMessages.length === 1 && !data.is_user) {
            console.log('[OutfitTracker] First AI message received, updating outfit instance.');
            // Update the first message hash tracker
            const firstBotMessage = aiMessages[0];

            this.currentFirstMessageHash = this.generateMessageHash(firstBotMessage.mes);
            
            // Explicitly save current outfits before updating for new instance
            await this.botManager.saveOutfit();
            await this.userManager.saveOutfit();
            
            await this.updateForCurrentCharacter();
            await this.processMacrosInFirstMessage(this.context);
        }
    }

    async handleMessageSwiped(index) {
        console.log(`[OutfitTracker] MESSAGE_SWIPED event fired with index: ${index}`);
        const chat = this.context.chat;
    
        if (!chat || index < 0 || index >= chat.length) {return;}
    
        const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);

        if (aiMessages.length > 0 && chat.indexOf(aiMessages[0]) === index) {
            console.log('[OutfitTracker] First message was swiped, updating outfit instance.');
            
            // Before updating for the new character, ensure current outfits are properly saved immediately
            // This ensures that the outfit for the swiped-away message is preserved
            await this.botManager.saveOutfit();
            await this.userManager.saveOutfit();
            
            // Update the first message hash tracker with the new first message
            const newFirstBotMessage = chat.find(msg => !msg.is_user && !msg.is_system);

            if (newFirstBotMessage) {
                this.currentFirstMessageHash = this.generateMessageHash(newFirstBotMessage.mes);
            } else {
                // If no first message exists, clear the hash
                this.currentFirstMessageHash = null;
            }
            
            await this.updateForCurrentCharacter();
            await this.processMacrosInFirstMessage(this.context);
        }
    }

    handleContextUpdate() {
        this.updateForCurrentCharacter();
        // Register character-specific macros when context updates
        customMacroSystem.registerCharacterSpecificMacros(this.context);
    }
    
    generateMessageHash(text) {
        // Use the imported utility function
        return generateMessageHash(text);
    }

    overrideResetChat() {
        if (typeof window.restartLLM !== 'function') {
            console.warn('[OutfitTracker] window.restartLLM not found. Cannot override chat reset.');
            return;
        }

        const originalRestart = window.restartLLM;

        window.restartLLM = async (...args) => {
            console.log('[OutfitTracker] Chat reset triggered (restartLLM).');
            
            // Use the new data persistence service for flushing
            outfitStore.flush();

            // Save current outfit data and instance IDs before reset
            const botOutfit = this.botManager.getCurrentOutfit();
            const userOutfit = this.userManager.getCurrentOutfit();
            const botOutfitInstanceId = this.botManager.getOutfitInstanceId();
            const userOutfitInstanceId = this.userManager.getOutfitInstanceId();

            const result = originalRestart.apply(this, args);

            // Restore outfit instance IDs BEFORE updating for current character
            // This ensures the managers use the correct instance ID when reloading
            if (botOutfitInstanceId) {
                this.botManager.setOutfitInstanceId(botOutfitInstanceId);
            }
            if (userOutfitInstanceId) {
                this.userManager.setOutfitInstanceId(userOutfitInstanceId);
            }
            
            // Also update the store with the current instance ID before updating for character
            if (botOutfitInstanceId) {
                outfitStore.setCurrentInstanceId(botOutfitInstanceId);
            }
            
            // After restoring instance IDs, update for current character
            await this.updateForCurrentCharacter();

            // Restore outfit data after reset and character update
            if (botOutfit) {
                this.botManager.setOutfit(botOutfit);
                await this.botManager.saveOutfit();
                // Use global references to panels since they're not directly available here
                if (window.botOutfitPanel && typeof window.botOutfitPanel.renderContent === 'function') {
                    window.botOutfitPanel.renderContent();
                }
            }
            if (userOutfit) {
                this.userManager.setOutfit(userOutfit);
                await this.userManager.saveOutfit();
                // Use global references to panels since they're not directly available here
                if (window.userOutfitPanel && typeof window.userOutfitPanel.renderContent === 'function') {
                    window.userOutfitPanel.renderContent();
                }
            }
            console.log('[OutfitTracker] Restored outfits after chat reset.');

            // Do not process first message after reset to preserve the restored instance ID
            // The instance ID should remain the same after a reset to maintain outfit continuity
            // processMacrosInFirstMessage will only be called when a new conversation naturally begins

            // Emit the chat cleared event for any other listeners
            extensionEventBus.emit(EXTENSION_EVENTS.CHAT_CLEARED);

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
            // Save current outfit data and instance IDs before clear
            const botOutfit = this.botManager.getCurrentOutfit();
            const userOutfit = this.userManager.getCurrentOutfit();
            const botOutfitInstanceId = this.botManager.getOutfitInstanceId();
            const userOutfitInstanceId = this.userManager.getOutfitInstanceId();

            await originalClearChat.apply(this, args);

            // Restore outfit instance IDs BEFORE updating for current character
            // This ensures the managers use the correct instance ID when reloading
            if (botOutfitInstanceId) {
                this.botManager.setOutfitInstanceId(botOutfitInstanceId);
            }
            if (userOutfitInstanceId) {
                this.userManager.setOutfitInstanceId(userOutfitInstanceId);
            }
            
            // Also update the store with the current instance ID before updating for character
            if (botOutfitInstanceId) {
                outfitStore.setCurrentInstanceId(botOutfitInstanceId);
            }
            
            await this.updateForCurrentCharacter();

            // Restore outfit data after clear and character update
            if (botOutfit) {
                this.botManager.setOutfit(botOutfit);
                await this.botManager.saveOutfit();
                // Use global references to panels since they're not directly available here
                if (window.botOutfitPanel && typeof window.botOutfitPanel.renderContent === 'function') {
                    window.botOutfitPanel.renderContent();
                }
            }
            if (userOutfit) {
                this.userManager.setOutfit(userOutfit);
                await this.userManager.saveOutfit();
                // Use global references to panels since they're not directly available here
                if (window.userOutfitPanel && typeof window.userOutfitPanel.renderContent === 'function') {
                    window.userOutfitPanel.renderContent();
                }
            }
            console.log('[OutfitTracker] Restored outfits after chat clear.');

            // Do not process first message after clear to preserve the restored instance ID
            // The instance ID should remain the same after a clear to maintain outfit continuity
            // processMacrosInFirstMessage will only be called when a new conversation naturally begins

            extensionEventBus.emit(EXTENSION_EVENTS.CHAT_CLEARED);
        };
    }
}

export function setupEventListeners(context) {
    return new EventSystem(context);
}
