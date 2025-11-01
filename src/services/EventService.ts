import {EXTENSION_EVENTS, extensionEventBus} from '../core/events';
import {customMacroSystem} from './CustomMacroService';
import {outfitStore} from '../common/Store';
import {generateMessageHash} from '../utils/utilities';
import {NewBotOutfitManager} from '../managers/NewBotOutfitManager';
import {NewUserOutfitManager} from '../managers/NewUserOutfitManager';
import {AutoOutfitService} from './AutoOutfitService';


interface EventServiceContext {
    botManager: NewBotOutfitManager;
    userManager: NewUserOutfitManager;
    botPanel: any; // The BotOutfitPanel instance
    userPanel: any; // The UserOutfitPanel instance
    autoOutfitSystem: AutoOutfitService;
    updateForCurrentCharacter: () => void;
    processMacrosInFirstMessage: (context?: any) => Promise<void>;
    context?: any;
}

class EventService {
    botManager: NewBotOutfitManager;
    userManager: NewUserOutfitManager;
    botPanel: any;
    userPanel: any;
    autoOutfitSystem: AutoOutfitService;
    updateForCurrentCharacter: () => void;
    processMacrosInFirstMessage: (context?: SillyTavernContext) => Promise<void>;
    context: SillyTavernContext | null;
    currentFirstMessageHash: string | null;

    constructor(context: EventServiceContext) {
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

    initialize(): void {
        this.context = this.context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext()) || null;

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

    setupSillyTavernEventListeners(): void {
        if (!this.context) {
            console.warn('[EventService] Context is null, cannot setup event listeners');
            return;
        }
        const {eventSource, event_types} = this.context;

        eventSource.on(event_types.APP_READY, () => this.handleAppReady());
        eventSource.on(event_types.CHAT_CHANGED, () => this.handleChatChange());
        eventSource.on(event_types.MESSAGE_RECEIVED, (data: any) => this.handleMessageReceived(data));
        eventSource.on(event_types.MESSAGE_SWIPED, (index: number) => this.handleMessageSwiped(index));
    }

    setupExtensionEventListeners(): void {
        extensionEventBus.on(EXTENSION_EVENTS.CONTEXT_UPDATED, () => this.handleContextUpdate());
    }

    handleAppReady(): void {
        console.log('[OutfitTracker] App ready, marking auto outfit system as initialized');
        if (this.autoOutfitSystem) {
            this.autoOutfitSystem.markAppInitialized();
        }
        this.updateForCurrentCharacter();
        customMacroSystem.deregisterCharacterSpecificMacros(this.context);
        customMacroSystem.registerCharacterSpecificMacros(this.context);
    }

    handleChatChange(): void {
        if (!this.context || !this.context.chat?.length) {
            return;
        }
        if (this.context.chat?.length > 0) {
            const firstBotMessage = this.context.chat.find(msg => !msg.is_user && !msg.is_system);

            if (firstBotMessage) {
                const firstMessageHash = this.generateMessageHash(firstBotMessage.mes);

                if (this.currentFirstMessageHash !== firstMessageHash) {
                    console.log('[OutfitTracker] CHAT_CHANGED event fired and first message has changed - updating for new conversation context');
                    this.currentFirstMessageHash = firstMessageHash;
                    this.updateForCurrentCharacter();
                    customMacroSystem.deregisterCharacterSpecificMacros(this.context);
                    customMacroSystem.registerCharacterSpecificMacros(this.context);
                } else {
                    console.log('[OutfitTracker] CHAT_CHANGED event fired but first message unchanged - skipping update');
                }
            } else {
                this.currentFirstMessageHash = null;
                console.log('[OutfitTracker] CHAT_CHANGED event fired with no first bot message - updating for character switch');
                this.updateForCurrentCharacter();
                customMacroSystem.deregisterCharacterSpecificMacros(this.context);
                customMacroSystem.registerCharacterSpecificMacros(this.context);
            }
        }
    }

    async handleMessageReceived(data: any): Promise<void> {
        if (!this.context) {
            return;
        }
        const chat = this.context.chat;
        const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);

        if (aiMessages.length === 1 && !data.is_user) {
            console.log('[OutfitTracker] First AI message received, updating outfit instance.');
            const firstBotMessage = aiMessages[0];
            this.currentFirstMessageHash = this.generateMessageHash(firstBotMessage.mes);

            const currentBotInstanceId = this.botManager.getOutfitInstanceId();
            const currentUserInstanceId = this.userManager.getOutfitInstanceId();

            if (currentBotInstanceId && this.botManager.characterId) {
                const botOutfitData = {...this.botManager.getCurrentOutfit()};
                outfitStore.setBotOutfit(this.botManager.characterId, currentBotInstanceId, botOutfitData);
            }
            if (currentUserInstanceId) {
                const userOutfitData = {...this.userManager.getCurrentOutfit()};
                outfitStore.setUserOutfit(currentUserInstanceId, userOutfitData);
            }

            await this.processMacrosInFirstMessage(this.context);
            await this.updateForCurrentCharacter();
        }
    }

    async handleMessageSwiped(index: number): Promise<void> {
        if (!this.context) {
            return;
        }
        console.log(`[OutfitTracker] MESSAGE_SWIPED event fired with index: ${index}`);
        const chat = this.context.chat;

        if (!chat || index < 0 || index >= chat.length) {
            return;
        }

        const aiMessages = chat.filter(msg => !msg.is_user && !msg.is_system);

        if (aiMessages.length > 0 && chat.indexOf(aiMessages[0]) === index) {
            console.log('[OutfitTracker] First message was swiped, updating outfit instance.');

            const firstBotMessage = aiMessages[0];
            if (firstBotMessage) {
                this.currentFirstMessageHash = this.generateMessageHash(firstBotMessage.mes);
            }

            const oldBotCharacterId = this.botManager.characterId;
            const oldBotInstanceId = this.botManager.getOutfitInstanceId();
            const oldUserInstanceId = this.userManager.getOutfitInstanceId();

            if (oldBotInstanceId && oldBotCharacterId) {
                const oldBotOutfitData = {...this.botManager.getCurrentOutfit()};
                outfitStore.setBotOutfit(oldBotCharacterId, oldBotInstanceId, oldBotOutfitData);
            }
            if (oldUserInstanceId) {
                const oldUserOutfitData = {...this.userManager.getCurrentOutfit()};
                outfitStore.setUserOutfit(oldUserInstanceId, oldUserOutfitData);
            }

            outfitStore.saveState();

            await this.processMacrosInFirstMessage(this.context);
            await this.updateForCurrentCharacter();
        }
    }

    handleContextUpdate(): void {
        this.updateForCurrentCharacter();
        if (this.context) {
            customMacroSystem.deregisterCharacterSpecificMacros(this.context);
            customMacroSystem.registerCharacterSpecificMacros(this.context);
        }
    }

    generateMessageHash(text: string): string {
        return generateMessageHash(text);
    }

    overrideResetChat(): void {
        if (typeof (window as any).restartLLM !== 'function') {
            console.warn('[OutfitTracker] window.restartLLM not found. Cannot override chat reset.');
            return;
        }

        const originalRestart = (window as any).restartLLM;

        (window as any).restartLLM = async (...args: any[]) => {
            console.log('[OutfitTracker] Chat reset triggered (restartLLM).');

            outfitStore.flush();

            const botOutfitInstanceId = this.botManager.getOutfitInstanceId();
            const userOutfitInstanceId = this.userManager.getOutfitInstanceId();

            if (botOutfitInstanceId) {
                await this.botManager.saveOutfit();
            }
            if (userOutfitInstanceId) {
                await this.userManager.saveOutfit();
            }

            const result = await originalRestart.apply(this, args);

            if (botOutfitInstanceId) {
                this.botManager.setOutfitInstanceId(botOutfitInstanceId);
            }
            if (userOutfitInstanceId) {
                this.userManager.setOutfitInstanceId(userOutfitInstanceId);
            }

            if (botOutfitInstanceId) {
                outfitStore.setCurrentInstanceId(botOutfitInstanceId);
            }

            await this.updateForCurrentCharacter();

            if (botOutfitInstanceId) {
                const appliedDefault = await this.botManager.applyDefaultOutfitAfterReset();
                if (!appliedDefault) {
                    this.botManager.loadOutfit();
                }
                if ((window as any).botOutfitPanel && typeof (window as any).botOutfitPanel.renderContent === 'function') {
                    (window as any).botOutfitPanel.renderContent();
                }
            }
            if (userOutfitInstanceId) {
                const appliedDefault = await this.userManager.applyDefaultOutfitAfterReset();
                if (!appliedDefault) {
                    this.userManager.loadOutfit();
                }
                if ((window as any).userOutfitPanel && typeof (window as any).userOutfitPanel.renderContent === 'function') {
                    (window as any).userOutfitPanel.renderContent();
                }
            }

            console.log('[OutfitTracker] Restored outfits after chat reset.');

            extensionEventBus.emit(EXTENSION_EVENTS.CHAT_CLEARED);

            return result;
        };
    }

    overrideClearChat(): void {
        if (typeof (window as any).clearChat !== 'function') {
            console.warn('[OutfitTracker] window.clearChat not found. Cannot override chat clear.');
            return;
        }

        const originalClearChat = (window as any).clearChat;

        (window as any).clearChat = async (...args: any[]) => {
            const botOutfitInstanceId = this.botManager.getOutfitInstanceId();
            const userOutfitInstanceId = this.userManager.getOutfitInstanceId();

            if (botOutfitInstanceId) {
                const botOutfitData = {...this.botManager.getCurrentOutfit()};
                if (this.botManager.characterId) {
                    outfitStore.setBotOutfit(this.botManager.characterId, botOutfitInstanceId, botOutfitData);
                }
            }
            if (userOutfitInstanceId) {
                const userOutfitData = {...this.userManager.getCurrentOutfit()};
                outfitStore.setUserOutfit(userOutfitInstanceId, userOutfitData);
            }

            outfitStore.saveState();

            await originalClearChat.apply(this, args);

            if (botOutfitInstanceId) {
                this.botManager.setOutfitInstanceId(botOutfitInstanceId);
            }
            if (userOutfitInstanceId) {
                this.userManager.setOutfitInstanceId(userOutfitInstanceId);
            }

            if (botOutfitInstanceId) {
                outfitStore.setCurrentInstanceId(botOutfitInstanceId);
            }

            await this.updateForCurrentCharacter();

            if (botOutfitInstanceId) {
                const appliedDefault = await this.botManager.applyDefaultOutfitAfterReset();
                if (!appliedDefault) {
                    this.botManager.loadOutfit();
                }
                if ((window as any).botOutfitPanel && typeof (window as any).botOutfitPanel.renderContent === 'function') {
                    (window as any).botOutfitPanel.renderContent();
                }
            }
            if (userOutfitInstanceId) {
                const appliedDefault = await this.userManager.applyDefaultOutfitAfterReset();
                if (!appliedDefault) {
                    this.userManager.loadOutfit();
                }
                if ((window as any).userOutfitPanel && typeof (window as any).userOutfitPanel.renderContent === 'function') {
                    (window as any).userOutfitPanel.renderContent();
                }
            }

            console.log('[OutfitTracker] Restored outfits after chat clear.');

            extensionEventBus.emit(EXTENSION_EVENTS.CHAT_CLEARED);
        };
    }
}

export function setupEventListeners(context: EventServiceContext): EventService {
    return new EventService(context);
}