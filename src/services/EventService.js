import {EXTENSION_EVENTS, extensionEventBus} from '../core/events.js';
import {customMacroSystem} from './CustomMacroService.js';
import {outfitStore} from '../common/Store.js';
import {generateMessageHash} from '../utils/SillyTavernUtility.js';
import SillyTavernApi from './SillyTavernApi.js';

/**
 * EventSystem - Handles all event processing for the outfit tracker extension
 * This class manages SillyTavern events, extension-specific events, and
 * ensures proper outfit management during chat changes, message swipes, and chat resets
 */
class EventService {
    /**
     * Creates a new EventSystem instance
     * @param {object} context - The context containing necessary manager instances and update functions
     * @param {object} context.botManager - The bot outfit manager instance
     * @param {object} context.userManager - The user outfit manager instance
     * @param {object} context.autoOutfitSystem - The auto outfit system instance
     * @param {Function} context.updateForCurrentCharacter - Function to update outfits for current character
     * @param {Function} context.processMacrosInFirstMessage - Function to process macros in first message
     */
    constructor(context) {
        this.botManager = context.botManager;
        this.userManager = context.userManager;
        this.autoOutfitSystem = context.autoOutfitSystem;
        this.updateForCurrentCharacter = context.updateForCurrentCharacter;
        this.processMacrosInFirstMessage = context.processMacrosInFirstMessage;
        this.context = SillyTavernApi.getContext();

        // Track the first message hash to avoid unnecessary updates
        this.currentFirstMessageHash = null;

        this.initialize();
    }

    /**
     * Initializes the event system by setting up the context and event listeners
     * @returns {void}
     */
    initialize() {
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

    /**
     * Sets up SillyTavern-specific event listeners
     * @returns {void}
     */
    setupSillyTavernEventListeners() {
        const {eventSource, event_types} = this.context;

        eventSource.on(event_types.APP_READY, () => this.handleAppReady());
        eventSource.on(event_types.CHAT_CHANGED, () => this.handleChatChange());
        eventSource.on(event_types.MESSAGE_RECEIVED, (data) => this.handleMessageReceived(data));
        eventSource.on(event_types.MESSAGE_SWIPED, (index) => this.handleMessageSwiped(index));
    }

    /**
     * Sets up extension-specific event listeners
     * @returns {void}
     */
    setupExtensionEventListeners() {
        extensionEventBus.on(EXTENSION_EVENTS.CONTEXT_UPDATED, () => this.handleContextUpdate());
    }

    /**
     * Handles the APP_READY event
     * @returns {void}
     */
    handleAppReady() {
        console.log('[OutfitTracker] App ready, marking auto outfit system as initialized');
        if (this.autoOutfitSystem) {
            this.autoOutfitSystem.markAppInitialized();
        }
        this.updateForCurrentCharacter();
        // Deregister and re-register character-specific macros when app is ready
        customMacroSystem.deregisterCharacterSpecificMacros(this.context);
        customMacroSystem.registerCharacterSpecificMacros(this.context);
    }

    /**
     * Handles the CHAT_CHANGED event
     * @returns {void}
     */
    handleChatChange() {
        const chat = SillyTavernApi.getChat();

        if (chat.length > 0) {
            // Check if the first AI message has actually changed before triggering update
            const firstBotMessage = chat.find(msg => !msg.is_user && !msg.is_system);

            if (firstBotMessage) {
                // Generate a hash of the first message to compare with the stored one
                const firstMessageHash = this.generateMessageHash(firstBotMessage.mes);

                // Only update if the first message has actually changed
                if (this.currentFirstMessageHash !== firstMessageHash) {
                    console.log('[OutfitTracker] CHAT_CHANGED event fired and first message has changed - updating for new conversation context');
                    this.currentFirstMessageHash = firstMessageHash;
                    this.updateForCurrentCharacter();
                    // Deregister and re-register character-specific macros when chat changes
                    customMacroSystem.deregisterCharacterSpecificMacros(this.context);
                    customMacroSystem.registerCharacterSpecificMacros(this.context);
                } else {
                    console.log('[OutfitTracker] CHAT_CHANGED event fired but first message unchanged - skipping update');
                }
            } else {
                // If there's no first message, clear the hash to allow update when a new first message appears
                this.currentFirstMessageHash = null;
                console.log('[OutfitTracker] CHAT_CHANGED event fired with no first bot message - updating for character switch');
                this.updateForCurrentCharacter();
                // Deregister and re-register character-specific macros when chat changes
                customMacroSystem.deregisterCharacterSpecificMacros(this.context);
                customMacroSystem.registerCharacterSpecificMacros(this.context);
            }
        }
    }

    /**
     * Handles the MESSAGE_RECEIVED event
     * @param {object} data - The message data received
     * @returns {Promise<void>} A promise that resolves when the message has been processed
     */
    async handleMessageReceived(data) {
        const chat = SillyTavernApi.getChat();
        const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);

        if (aiMessages.length === 1 && !data.is_user) {
            console.log('[OutfitTracker] First AI message received, updating outfit instance.');
            // Update the first message hash tracker
            const firstBotMessage = aiMessages[0];

            this.currentFirstMessageHash = this.generateMessageHash(firstBotMessage.mes);

            // Explicitly save current outfits before updating for new instance
            const currentBotInstanceId = this.botManager.getOutfitInstanceId();
            const currentUserInstanceId = this.userManager.getOutfitInstanceId();

            // Save the current outfits to their current instances before changing
            if (currentBotInstanceId && this.botManager.characterId) {
                const botOutfitData = {...this.botManager.getCurrentOutfit()};

                outfitStore.setBotOutfit(this.botManager.characterId, currentBotInstanceId, botOutfitData);
            }
            if (currentUserInstanceId) {
                const userOutfitData = {...this.userManager.getCurrentOutfit()};

                outfitStore.setUserOutfit(currentUserInstanceId, userOutfitData);
            }

            // Process the first message to generate the new instance ID BEFORE updating managers
            await this.processMacrosInFirstMessage(this.context);

            // Now update managers for the current character, which will use the new instance ID
            await this.updateForCurrentCharacter();
        }
    }

    /**
     * Handles the MESSAGE_SWIPED event
     * @param {number} index - The index of the swiped message
     * @returns {Promise<void>} A promise that resolves when the swipe has been processed
     */
    async handleMessageSwiped(index) {
        console.log(`[OutfitTracker] MESSAGE_SWIPED event fired with index: ${index}`);
        const chat = SillyTavernApi.getChat();

        if (!chat || index < 0 || index >= chat.length) {
            return;
        }

        const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);

        if (aiMessages.length > 0 && chat.indexOf(aiMessages[0]) === index) {
            console.log('[OutfitTracker] First message was swiped, updating outfit instance.');

            // Before changing anything, update the first message hash to trigger proper outfit instance handling
            const firstBotMessage = aiMessages[0];

            if (firstBotMessage) {
                this.currentFirstMessageHash = this.generateMessageHash(firstBotMessage.mes);
            }

            // Save current outfit data with the current instance ID before any changes
            const oldBotCharacterId = this.botManager.characterId;
            const oldBotInstanceId = this.botManager.getOutfitInstanceId();
            const oldUserInstanceId = this.userManager.getOutfitInstanceId();

            if (oldBotInstanceId && oldBotCharacterId) {
                const oldBotOutfitData = {...this.botManager.getCurrentOutfit()};

                // Save the current outfit data to the current instance ID
                outfitStore.setBotOutfit(oldBotCharacterId, oldBotInstanceId, oldBotOutfitData);
            }
            if (oldUserInstanceId) {
                const oldUserOutfitData = {...this.userManager.getCurrentOutfit()};

                // Save the current outfit data to the current instance ID
                outfitStore.setUserOutfit(oldUserInstanceId, oldUserOutfitData);
            }

            // Save to storage immediately to preserve the current state
            outfitStore.saveState();

            // Process the first message to generate the new instance ID BEFORE updating managers
            await this.processMacrosInFirstMessage(this.context);

            // Now update managers for the current character, which will use the new instance ID
            await this.updateForCurrentCharacter();
        }
    }

    /**
     * Handles the CONTEXT_UPDATED event
     * @returns {void}
     */
    handleContextUpdate() {
        this.updateForCurrentCharacter();
        // Deregister and re-register character-specific macros when context updates
        customMacroSystem.deregisterCharacterSpecificMacros(this.context);
        customMacroSystem.registerCharacterSpecificMacros(this.context);
    }

    /**
     * Generates a hash for the given message text
     * @param {string} text - The text to generate a hash for
     * @returns {string} The generated hash value
     */
    generateMessageHash(text) {
        // Use the imported utility function
        return generateMessageHash(text);
    }

    /**
     * Overrides the chat reset functionality to preserve outfit data
     * @returns {void}
     */
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
            const botOutfitInstanceId = this.botManager.getOutfitInstanceId();
            const userOutfitInstanceId = this.userManager.getOutfitInstanceId();

            // Save the current outfits before the chat is reset
            if (botOutfitInstanceId) {
                await this.botManager.saveOutfit(botOutfitInstanceId);
            }
            if (userOutfitInstanceId) {
                await this.userManager.saveOutfit(userOutfitInstanceId);
            }

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

            // Load outfit data after reset and character update
            if (botOutfitInstanceId) {
                // Try to apply default outfit first, otherwise load the saved outfit for this instance
                const appliedDefault = await this.botManager.applyDefaultOutfitAfterReset(botOutfitInstanceId);

                if (!appliedDefault) {
                    this.botManager.loadOutfit(botOutfitInstanceId);
                }
                // Use global references to panels since they're not directly available here
                if (window.botOutfitPanel && typeof window.botOutfitPanel.renderContent === 'function') {
                    window.botOutfitPanel.renderContent();
                }
            }
            if (userOutfitInstanceId) {
                // Try to apply default outfit first, otherwise load the saved outfit for this instance
                const appliedDefault = await this.userManager.applyDefaultOutfitAfterReset(userOutfitInstanceId);

                if (!appliedDefault) {
                    this.userManager.loadOutfit(userOutfitInstanceId);
                }
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

    /**
     * Overrides the chat clear functionality to preserve outfit data
     * @returns {void}
     */
    overrideClearChat() {
        if (typeof window.clearChat !== 'function') {
            console.warn('[OutfitTracker] window.clearChat not found. Cannot override chat clear.');
            return;
        }

        const originalClearChat = window.clearChat;

        window.clearChat = async (...args) => {
            const botOutfitInstanceId = this.botManager.getOutfitInstanceId();
            const userOutfitInstanceId = this.userManager.getOutfitInstanceId();

            if (botOutfitInstanceId) {
                const botOutfitData = {...this.botManager.getCurrentOutfit()};

                outfitStore.setBotOutfit(this.botManager.characterId, botOutfitInstanceId, botOutfitData);
            }
            if (userOutfitInstanceId) {
                const userOutfitData = {...this.userManager.getCurrentOutfit()};

                outfitStore.setUserOutfit(userOutfitInstanceId, userOutfitData);
            }

            outfitStore.saveState();

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

            // Load outfit data after clear and character update
            if (botOutfitInstanceId) {
                // Try to apply default outfit first, otherwise load the saved outfit for this instance
                const appliedDefault = await this.botManager.applyDefaultOutfitAfterReset(botOutfitInstanceId);

                if (!appliedDefault) {
                    this.botManager.loadOutfit(botOutfitInstanceId);
                }
                // Use global references to panels since they're not directly available here
                if (window.botOutfitPanel && typeof window.botOutfitPanel.renderContent === 'function') {
                    window.botOutfitPanel.renderContent();
                }
            }
            if (userOutfitInstanceId) {
                // Try to apply default outfit first, otherwise load the saved outfit for this instance
                const appliedDefault = await this.userManager.applyDefaultOutfitAfterReset(userOutfitInstanceId);

                if (!appliedDefault) {
                    this.userManager.loadOutfit(userOutfitInstanceId);
                }
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

/**
 * Sets up event listeners for the outfit tracker extension
 * @param {object} context - The context containing necessary manager instances and update functions
 * @returns {EventService} A new instance of the EventSystem class
 */
export function setupEventListeners(context) {
    return new EventService(context);
}
