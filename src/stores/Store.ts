import {DEFAULT_SETTINGS} from '../config/constants';
import {deepClone} from '../utils/utilities';
import {debouncedStore} from './DebouncedStore';
import {debugLog} from '../logging/DebugLogger';

export interface OutfitData {
    [key: string]: string;
}

interface InstanceData {
    bot: OutfitData;
    user: OutfitData;
    promptInjectionEnabled?: boolean;

    [key: string]: any;
}

interface BotInstances {
    [characterId: string]: {
        [instanceId: string]: InstanceData;
    };
}

interface UserInstances {
    [instanceId: string]: any;
}

export interface Presets {
    bot: {
        [key: string]: {
            [presetName: string]: OutfitData;
        };
    };
    user: {
        [key: string]: {
            [presetName: string]: OutfitData;
        };
    };
}

interface PanelSettings {
    botPanelColors: {
        primary: string;
        border: string;
        shadow: string;
    };
    userPanelColors: {
        primary: string;
        border: string;
        shadow: string;
    };
}

interface Settings {
    autoOpenBot: boolean;
    autoOpenUser: boolean;
    position: string;
    enableSysMessages: boolean;
    autoOutfitSystem: boolean;
    debugMode: boolean;
    autoOutfitPrompt: string;
    autoOutfitConnectionProfile: string | null;
    botPanelColors: {
        primary: string;
        border: string;
        shadow: string;
    };
    userPanelColors: {
        primary: string;
        border: string;
        shadow: string;
    };
}

interface PanelVisibility {
    bot: boolean;
    user: boolean;
}

interface References {
    botPanel: any;
    userPanel: any;
    autoOutfitSystem: any;
}

export interface State {
    botOutfits: any;
    userOutfits: any;
    botInstances: BotInstances;
    userInstances: UserInstances;
    presets: Presets;
    panelSettings: PanelSettings;
    settings: Settings;
    currentCharacterId: string | null;
    currentChatId: string | null;
    currentOutfitInstanceId: string | null;
    panelVisibility: PanelVisibility;
    references: References;
    listeners: ((state: State) => void)[];
}

class OutfitStore {
    state: State;

    constructor() {
        this.state = {
            botOutfits: {},
            userOutfits: {},
            botInstances: {},
            userInstances: {},
            presets: {
                bot: {},
                user: {},
            },
            panelSettings: {
                botPanelColors: {...DEFAULT_SETTINGS.botPanelColors},
                userPanelColors: {...DEFAULT_SETTINGS.userPanelColors},
            },
            settings: {...DEFAULT_SETTINGS},
            currentCharacterId: null,
            currentChatId: null,
            currentOutfitInstanceId: null,
            panelVisibility: {
                bot: false,
                user: false,
            },
            references: {
                botPanel: null,
                userPanel: null,
                autoOutfitSystem: null,
            },
            listeners: [],
        };
    }

    subscribe(listener: (state: State) => void): () => void {
        this.state.listeners.push(listener);
        return () => {
            this.state.listeners = this.state.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners(): void {
        this.state.listeners.forEach(listener => {
            try {
                listener(this.state);
            } catch (error) {
                debugLog('Error in store listener', error, 'error');
            }
        });
    }

    setState(updates: Partial<State>): void {
        // Deep clone the current state to avoid reference issues
        const currentStateClone = deepClone(this.state);

        // Create a deep clone of the updates to avoid reference issues
        const updatesClone = deepClone(updates);

        // Ensure that critical nested objects maintain their structure with proper deep merging
        this.state = {
            ...currentStateClone,
            ...updatesClone,
            presets: {
                bot: {
                    ...(currentStateClone.presets?.bot || {}),
                    ...((updatesClone as any)?.presets?.bot || {})
                },
                user: {
                    ...(currentStateClone.presets?.user || {}),
                    ...((updatesClone as any)?.presets?.user || {})
                }
            },
            botInstances: {
                ...(currentStateClone.botInstances || {}),
                ...((updatesClone as any)?.botInstances || {})
            },
            userInstances: {
                ...(currentStateClone.userInstances || {}),
                ...((updatesClone as any)?.userInstances || {})
            },
            // Keep other nested objects safe from undefined values
            panelSettings: {
                ...currentStateClone.panelSettings,
                ...((updatesClone as any)?.panelSettings || {})
            },
            settings: {
                ...currentStateClone.settings,
                ...((updatesClone as any)?.settings || {})
            },
            panelVisibility: {
                ...currentStateClone.panelVisibility,
                ...((updatesClone as any)?.panelVisibility || {})
            },
            references: {
                ...currentStateClone.references,
                ...((updatesClone as any)?.references || {})
            }
        };
        this.notifyListeners();
    }

    getState(): State {
        return deepClone(this.state);
    }

    getBotOutfit(characterId: string, instanceId: string): OutfitData {
        const characterData = this.state.botInstances[characterId];

        if (!characterData) {
            return {};
        }
        const instanceData = characterData[instanceId];

        if (!instanceData) {
            return {};
        }
        return deepClone(instanceData.bot || {});
    }

    setBotOutfit(characterId: string, instanceId: string, outfitData: OutfitData): void {
        if (!this.state.botInstances[characterId]) {
            this.state.botInstances[characterId] = {};
        }
        if (!this.state.botInstances[characterId][instanceId]) {
            this.state.botInstances[characterId][instanceId] = {bot: {}, user: {}};
        }

        // Preserve any existing promptInjectionEnabled value
        const existingInstanceData = this.state.botInstances[characterId][instanceId];
        const promptInjectionEnabled = existingInstanceData?.promptInjectionEnabled;

        this.state.botInstances[characterId][instanceId] = {
            bot: {...outfitData},
            user: this.state.botInstances[characterId][instanceId].user || {},
            promptInjectionEnabled
        };
        this.notifyListeners();
    }

    getUserOutfit(instanceId: string): OutfitData {
        const instanceData = this.state.userInstances[instanceId];

        return deepClone(instanceData || {});
    }

    setUserOutfit(instanceId: string, outfitData: OutfitData): void {
        // Preserve any existing promptInjectionEnabled value
        const existingInstanceData = this.state.userInstances[instanceId];
        let promptInjectionEnabled: boolean | undefined;

        if (existingInstanceData && typeof existingInstanceData === 'object' && 'promptInjectionEnabled' in existingInstanceData) {
            promptInjectionEnabled = existingInstanceData.promptInjectionEnabled as boolean | undefined;
        }

        // Create the new instance data with both outfit data and settings
        const updatedInstanceData = {...outfitData};
        if (promptInjectionEnabled !== undefined) {
            (updatedInstanceData as any).promptInjectionEnabled = promptInjectionEnabled;
        }

        this.state.userInstances[instanceId] = updatedInstanceData as { [key: string]: string | boolean } & {
            promptInjectionEnabled?: boolean
        };
        this.notifyListeners();
    }

    getSetting(key: keyof Settings): any {
        return this.state.settings[key];
    }

    setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
        this.state.settings[key] = value;
        this.notifyListeners();
    }

    getCurrentInstanceId(): string | null {
        return this.state.currentOutfitInstanceId;
    }

    setCurrentInstanceId(instanceId: string): void {
        this.state.currentOutfitInstanceId = instanceId;
        this.notifyListeners();
    }

    setPanelVisibility(panelType: 'bot' | 'user', isVisible: boolean): void {
        this.state.panelVisibility[panelType] = isVisible;
        this.notifyListeners();
    }

    getPanelVisibility(panelType: 'bot' | 'user'): boolean {
        return this.state.panelVisibility[panelType];
    }

    setPanelRef(panelType: 'bot' | 'user', panel: any): void {
        this.state.references[`${panelType}Panel`] = panel;
        this.notifyListeners();
    }

    getPanelRef(panelType: 'bot' | 'user'): any {
        return this.state.references[`${panelType}Panel`];
    }

    setAutoOutfitSystem(autoOutfitSystem: any): void {
        this.state.references.autoOutfitSystem = autoOutfitSystem;
        this.notifyListeners();
    }

    getAutoOutfitSystem(): any {
        return this.state.references.autoOutfitSystem;
    }

    setCurrentCharacter(characterId: string): void {
        this.state.currentCharacterId = characterId;
        this.notifyListeners();
    }

    getCurrentCharacter(): string | null {
        return this.state.currentCharacterId;
    }

    setCurrentChat(chatId: string): void {
        this.state.currentChatId = chatId;
        this.notifyListeners();
    }

    getCurrentChat(): string | null {
        return this.state.currentChatId;
    }

    updateAndSave(updates: Partial<State>): void {
        this.setState(updates);
        debouncedStore.saveState();
    }

    cleanupUnusedInstances(characterId: string, validInstanceIds: string[]): void {
        if (!characterId || !this.state.botInstances[characterId]) {
            return;
        }

        const characterData = this.state.botInstances[characterId];

        for (const instanceId in characterData) {
            if (!validInstanceIds.includes(instanceId)) {
                delete characterData[instanceId];
            }
        }

        if (Object.keys(characterData).length === 0) {
            delete this.state.botInstances[characterId];
        }
        this.notifyListeners();
    }

    getCharacterInstances(characterId: string): string[] {
        const characterData = this.state.botInstances[characterId];

        if (!characterData) {
            return [];
        }
        return Object.keys(characterData);
    }

    clearCharacterOutfits(characterId: string): void {
        if (this.state.botInstances[characterId]) {
            delete this.state.botInstances[characterId];
        }

        for (const key in this.state.presets.bot) {
            if (key.startsWith(`${characterId}_`)) {
                delete this.state.presets.bot[key];
            }
        }
        this.notifyListeners();
    }

    /**
     * Wipes all outfit data including bot instances, user instances, and presets
     */
    wipeAllOutfitData(): void {
        // Clear all bot instances
        this.state.botInstances = {};

        // Clear all user instances
        this.state.userInstances = {};

        // Clear all presets
        this.state.presets = {
            bot: {},
            user: {}
        };

        this.notifyListeners();
    }
}

const outfitStore = new OutfitStore();

export {outfitStore};

export const getStoreState = (): State => {
    return outfitStore.getState();
};