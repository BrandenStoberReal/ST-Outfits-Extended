import {DEFAULT_SETTINGS} from '../config/constants';
import {deepClone} from '../utils/utilities';
import {debouncedStore} from './DebouncedStore';
import {debugLog} from '../logging/DebugLogger';
import {DataManager} from '../managers/DataManager';

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
    private dataManager: DataManager | null = null;

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

    /**
     * Sets the DataManager for synchronization
     * @param dataManager The DataManager instance to sync with
     */
    setDataManager(dataManager: DataManager): void {
        this.dataManager = dataManager;

        // Load initial data from DataManager to sync the store
        this.syncFromDataManager();
    }

    /**
     * Synchronizes the store state from the DataManager
     */
    syncFromDataManager(): void {
        if (!this.dataManager) {
            debugLog('DataManager not available for synchronization', null, 'warn');
            return;
        }

        try {
            const data = this.dataManager.loadOutfitData();

            // Update the store's instance data from DataManager
            this.state.botInstances = data.botInstances || {};
            this.state.userInstances = data.userInstances || {};

            // Also update presets if they exist in the DataManager
            const allData = this.dataManager.load();
            if (allData && allData.presets) {
                this.state.presets = {
                    bot: {...this.state.presets.bot, ...allData.presets.bot},
                    user: {...this.state.presets.user, ...allData.presets.user}
                };
            }

            // Notify listeners that the state has been updated
            this.notifyListeners();

            debugLog('Store synchronized from DataManager', {
                botInstanceCount: Object.keys(this.state.botInstances).length,
                userInstanceCount: Object.keys(this.state.userInstances).length
            }, 'debug');
        } catch (error) {
            debugLog('Error during synchronization from DataManager', error, 'error');
        }
    }

    /**
     * Synchronizes the store state to the DataManager
     */
    syncToDataManager(): void {
        if (!this.dataManager) {
            debugLog('DataManager not available for synchronization', null, 'warn');
            return;
        }

        try {
            // Prepare the outfit data to save to DataManager
            const outfitData = {
                botInstances: this.state.botInstances,
                userInstances: this.state.userInstances,
                presets: this.state.presets
            };

            // Save the instance data to DataManager
            this.dataManager.savePartial(outfitData);

            debugLog('Store synchronized to DataManager', {
                botInstanceCount: Object.keys(this.state.botInstances).length,
                userInstanceCount: Object.keys(this.state.userInstances).length
            }, 'debug');
        } catch (error) {
            debugLog('Error during synchronization to DataManager', error, 'error');
        }
    }

    /**
     * Updates the state and synchronizes with DataManager
     */
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

        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            // Check if any data that should be persisted to DataManager has changed
            const syncData: any = {};

            // Only sync properties that actually changed and are managed by DataManager
            if ('botInstances' in updatesClone) {
                syncData.botInstances = this.state.botInstances;
            }
            if ('userInstances' in updatesClone) {
                syncData.userInstances = this.state.userInstances;
            }
            if ('presets' in updatesClone) {
                syncData.presets = this.state.presets;
            }
            if ('settings' in updatesClone) {
                syncData.settings = this.state.settings;
            }

            if (Object.keys(syncData).length > 0) {
                this.dataManager.savePartial(syncData);
            }
        }
        
        this.notifyListeners();
    }

    /**
     * Updates the state and saves to storage
     */
    updateAndSave(updates: Partial<State>): void {
        this.setState(updates);
        debouncedStore.saveState();
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

        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            this.dataManager.savePartial({
                botInstances: this.state.botInstances
            });
        }
        
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

        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            this.dataManager.savePartial({
                userInstances: this.state.userInstances
            });
        }
        
        this.notifyListeners();
    }

    getSetting(key: keyof Settings): any {
        return this.state.settings[key];
    }

    setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
        this.state.settings[key] = value;

        // Synchronize settings changes to the DataManager
        if (this.dataManager) {
            this.dataManager.savePartial({
                settings: this.state.settings
            });
        }
        
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

        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            this.dataManager.savePartial({
                botInstances: this.state.botInstances
            });
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

        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            this.dataManager.savePartial({
                botInstances: this.state.botInstances,
                presets: this.state.presets
            });
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

        // Synchronize changes to the DataManager if it's available
        if (this.dataManager) {
            this.dataManager.savePartial({
                botInstances: this.state.botInstances,
                userInstances: this.state.userInstances,
                presets: this.state.presets
            });
        }

        this.notifyListeners();
    }

    /**
     * Forces a complete resynchronization of the outfit store from the DataManager.
     * This can be used to fix any potential desynchronization between the store and DataManager.
     */
    forceResyncFromDataManager(): void {
        if (this.dataManager) {
            this.syncFromDataManager();
        } else {
            debugLog('Cannot force resync: DataManager not available', null, 'warn');
        }
    }
}

const outfitStore = new OutfitStore();

export {outfitStore};

export const getStoreState = (): State => {
    return outfitStore.getState();
};