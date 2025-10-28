var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { EXTENSION_EVENTS, extensionEventBus } from '../core/events.js';
import { customMacroSystem } from './CustomMacroService.js';
import { outfitStore } from '../stores/Store.js';
import { generateMessageHash } from '../utils/utilities.js';
import { debouncedStore } from '../stores/DebouncedStore.js';
import { debugLog } from '../logging/DebugLogger.js';
class EventService {
    constructor(context) {
        this.botManager = context.botManager;
        this.userManager = context.userManager;
        this.botPanel = context.botPanel;
        this.userPanel = context.userPanel;
        this.autoOutfitSystem = context.autoOutfitSystem;
        this.updateForCurrentCharacter = context.updateForCurrentCharacter;
        this.processMacrosInFirstMessage = context.processMacrosInFirstMessage;
        this.context = context.context || null;
        this.currentFirstMessageHash = null;
        this.initialize();
    }
    initialize() {
        var _a;
        this.context = this.context || (((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext()) || null;
        if (!this.context || !this.context.eventSource || !this.context.event_types) {
            debugLog('Context not fully available for event listeners yet, trying again later', null, 'warn');
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
        if (!this.context) {
            debugLog('Context is null, cannot setup event listeners', null, 'warn');
            return;
        }
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
        debugLog('App ready, marking auto outfit system as initialized', null, 'log');
        if (this.autoOutfitSystem) {
            this.autoOutfitSystem.markAppInitialized();
        }
        this.updateForCurrentCharacter();
        customMacroSystem.deregisterCharacterSpecificMacros(this.context);
        customMacroSystem.registerCharacterSpecificMacros(this.context);
    }
    handleChatChange() {
        var _a, _b;
        if (!this.context || !((_a = this.context.chat) === null || _a === void 0 ? void 0 : _a.length)) {
            return;
        }
        if (((_b = this.context.chat) === null || _b === void 0 ? void 0 : _b.length) > 0) {
            const firstBotMessage = this.context.chat.find(msg => !msg.is_user && !msg.is_system);
            if (firstBotMessage) {
                const firstMessageHash = this.generateMessageHash(firstBotMessage.mes);
                if (this.currentFirstMessageHash !== firstMessageHash) {
                    debugLog('CHAT_CHANGED event fired and first message has changed - updating for new conversation context', null, 'log');
                    this.currentFirstMessageHash = firstMessageHash;
                    this.updateForCurrentCharacter();
                    customMacroSystem.deregisterCharacterSpecificMacros(this.context);
                    customMacroSystem.registerCharacterSpecificMacros(this.context);
                    // Clear macro cache to ensure macros use fresh data for the new conversation
                    customMacroSystem.clearCache();
                }
                else {
                    debugLog('CHAT_CHANGED event fired but first message unchanged - skipping update', null, 'log');
                }
            }
            else {
                this.currentFirstMessageHash = null;
                debugLog('CHAT_CHANGED event fired with no first bot message - updating for character switch', null, 'log');
                this.updateForCurrentCharacter();
                customMacroSystem.deregisterCharacterSpecificMacros(this.context);
                customMacroSystem.registerCharacterSpecificMacros(this.context);
                // Clear macro cache to ensure macros use fresh data for the new conversation/character
                customMacroSystem.clearCache();
            }
        }
    }
    handleMessageReceived(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.context) {
                return;
            }
            const chat = this.context.chat;
            const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);
            if (aiMessages.length === 1 && !data.is_user) {
                debugLog('First AI message received, updating outfit instance.', null, 'log');
                const firstBotMessage = aiMessages[0];
                this.currentFirstMessageHash = this.generateMessageHash(firstBotMessage.mes);
                const currentBotInstanceId = this.botManager.getOutfitInstanceId();
                const currentUserInstanceId = this.userManager.getOutfitInstanceId();
                if (currentBotInstanceId && this.botManager.characterId) {
                    const botOutfitData = Object.assign({}, this.botManager.getCurrentOutfit());
                    outfitStore.setBotOutfit(this.botManager.characterId, currentBotInstanceId, botOutfitData);
                }
                if (currentUserInstanceId) {
                    const userOutfitData = Object.assign({}, this.userManager.getCurrentOutfit());
                    outfitStore.setUserOutfit(currentUserInstanceId, userOutfitData);
                }
                yield this.processMacrosInFirstMessage(this.context);
                yield this.updateForCurrentCharacter();
                // Clear macro cache after processing first message to ensure fresh data
                customMacroSystem.clearCache();
            }
        });
    }
    handleMessageSwiped(index) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.context) {
                return;
            }
            debugLog(`MESSAGE_SWIPED event fired with index: ${index}`, null, 'log');
            const chat = this.context.chat;
            if (!chat || index < 0 || index >= chat.length) {
                return;
            }
            const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);
            if (aiMessages.length > 0 && chat.indexOf(aiMessages[0]) === index) {
                debugLog('First message was swiped, updating outfit instance.', null, 'log');
                const firstBotMessage = aiMessages[0];
                if (firstBotMessage) {
                    this.currentFirstMessageHash = this.generateMessageHash(firstBotMessage.mes);
                }
                const oldBotCharacterId = this.botManager.characterId;
                const oldBotInstanceId = this.botManager.getOutfitInstanceId();
                const oldUserInstanceId = this.userManager.getOutfitInstanceId();
                if (oldBotInstanceId && oldBotCharacterId) {
                    const oldBotOutfitData = Object.assign({}, this.botManager.getCurrentOutfit());
                    outfitStore.setBotOutfit(oldBotCharacterId, oldBotInstanceId, oldBotOutfitData);
                }
                if (oldUserInstanceId) {
                    const oldUserOutfitData = Object.assign({}, this.userManager.getCurrentOutfit());
                    outfitStore.setUserOutfit(oldUserInstanceId, oldUserOutfitData);
                }
                debouncedStore.saveState();
                yield this.processMacrosInFirstMessage(this.context);
                yield this.updateForCurrentCharacter();
                // Clear macro cache after processing first message to ensure fresh data
                customMacroSystem.clearCache();
            }
        });
    }
    handleContextUpdate() {
        this.updateForCurrentCharacter();
        if (this.context) {
            customMacroSystem.deregisterCharacterSpecificMacros(this.context);
            customMacroSystem.registerCharacterSpecificMacros(this.context);
            // Clear macro cache to ensure macros reflect current outfit data
            customMacroSystem.clearCache();
        }
    }
    generateMessageHash(text) {
        return generateMessageHash(text);
    }
    overrideResetChat() {
        if (typeof window.restartLLM !== 'function') {
            debugLog('window.restartLLM not found. Cannot override chat reset.', null, 'warn');
            return;
        }
        const originalRestart = window.restartLLM;
        window.restartLLM = (...args) => __awaiter(this, void 0, void 0, function* () {
            debugLog('Chat reset triggered (restartLLM).', null, 'log');
            const botOutfitInstanceId = this.botManager.getOutfitInstanceId();
            const userOutfitInstanceId = this.userManager.getOutfitInstanceId();
            if (botOutfitInstanceId) {
                yield this.botManager.saveOutfit();
            }
            if (userOutfitInstanceId) {
                yield this.userManager.saveOutfit();
            }
            const result = yield originalRestart.apply(this, args);
            if (botOutfitInstanceId) {
                this.botManager.setOutfitInstanceId(botOutfitInstanceId);
            }
            if (userOutfitInstanceId) {
                this.userManager.setOutfitInstanceId(userOutfitInstanceId);
            }
            if (botOutfitInstanceId) {
                outfitStore.setCurrentInstanceId(botOutfitInstanceId);
            }
            yield this.updateForCurrentCharacter();
            if (botOutfitInstanceId) {
                const appliedDefault = yield this.botManager.applyDefaultOutfitAfterReset();
                if (!appliedDefault) {
                    this.botManager.loadOutfit();
                }
                if (window.botOutfitPanel && typeof window.botOutfitPanel.renderContent === 'function') {
                    window.botOutfitPanel.renderContent();
                }
            }
            if (userOutfitInstanceId) {
                const appliedDefault = yield this.userManager.applyDefaultOutfitAfterReset();
                if (!appliedDefault) {
                    this.userManager.loadOutfit();
                }
                if (window.userOutfitPanel && typeof window.userOutfitPanel.renderContent === 'function') {
                    window.userOutfitPanel.renderContent();
                }
            }
            // Clear macro cache to ensure macros use the new default outfit data
            customMacroSystem.clearCache();
            debugLog('Restored outfits after chat reset.', null, 'log');
            extensionEventBus.emit(EXTENSION_EVENTS.CHAT_CLEARED);
            return result;
        });
    }
    overrideClearChat() {
        if (typeof window.clearChat !== 'function') {
            debugLog('window.clearChat not found. Cannot override chat clear.', null, 'warn');
            return;
        }
        const originalClearChat = window.clearChat;
        window.clearChat = (...args) => __awaiter(this, void 0, void 0, function* () {
            const botOutfitInstanceId = this.botManager.getOutfitInstanceId();
            const userOutfitInstanceId = this.userManager.getOutfitInstanceId();
            if (botOutfitInstanceId) {
                const botOutfitData = Object.assign({}, this.botManager.getCurrentOutfit());
                if (this.botManager.characterId) {
                    outfitStore.setBotOutfit(this.botManager.characterId, botOutfitInstanceId, botOutfitData);
                }
            }
            if (userOutfitInstanceId) {
                const userOutfitData = Object.assign({}, this.userManager.getCurrentOutfit());
                outfitStore.setUserOutfit(userOutfitInstanceId, userOutfitData);
            }
            debouncedStore.saveState();
            yield originalClearChat.apply(this, args);
            if (botOutfitInstanceId) {
                this.botManager.setOutfitInstanceId(botOutfitInstanceId);
            }
            if (userOutfitInstanceId) {
                this.userManager.setOutfitInstanceId(userOutfitInstanceId);
            }
            if (botOutfitInstanceId) {
                outfitStore.setCurrentInstanceId(botOutfitInstanceId);
            }
            yield this.updateForCurrentCharacter();
            if (botOutfitInstanceId) {
                const appliedDefault = yield this.botManager.applyDefaultOutfitAfterReset();
                if (!appliedDefault) {
                    this.botManager.loadOutfit();
                }
                if (window.botOutfitPanel && typeof window.botOutfitPanel.renderContent === 'function') {
                    window.botOutfitPanel.renderContent();
                }
            }
            if (userOutfitInstanceId) {
                const appliedDefault = yield this.userManager.applyDefaultOutfitAfterReset();
                if (!appliedDefault) {
                    this.userManager.loadOutfit();
                }
                if (window.userOutfitPanel && typeof window.userOutfitPanel.renderContent === 'function') {
                    window.userOutfitPanel.renderContent();
                }
            }
            // Clear macro cache to ensure macros use the new default outfit data
            customMacroSystem.clearCache();
            debugLog('Restored outfits after chat clear.', null, 'log');
            extensionEventBus.emit(EXTENSION_EVENTS.CHAT_CLEARED);
        });
    }
}
export function setupEventListeners(context) {
    return new EventService(context);
}
