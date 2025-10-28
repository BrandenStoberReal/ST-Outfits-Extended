import {StorageService} from '../services/StorageService';
import {debugLog} from '../logging/DebugLogger';

const DATA_VERSION = '1.0.0';

interface OutfitData {
    botInstances: any;
    userInstances: any;
    presets: any;
}

class DataManager {
    storageService: StorageService;
    version: string;
    data: any;

    constructor(storageService: StorageService) {
        this.storageService = storageService;
        this.version = DATA_VERSION;
        this.data = null;
    }

    async initialize(): Promise<void> {
        this.data = await this.storageService.load();
        if (!this.data) {
            this.data = {};
        }
        this.migrateData();
    }

    migrateData(): void {
        if (!this.data.version || this.data.version < this.version) {
            debugLog(`Migrating data from version ${this.data.version} to ${this.version}`, null, 'log');
            this.data.version = this.version;
        }
    }

    save(data: any): void {
        try {
            debugLog('DataManager: Starting full save operation', {
                incomingDataKeys: data ? Object.keys(data) : 'null',
                currentDataExists: !!this.data
            }, 'debug');

            // Validate the data before saving to prevent corruption
            if (!data || typeof data !== 'object') {
                debugLog('Invalid data provided to save, using empty object', null, 'error');
                data = {};
            }

            this.data = data;
            debugLog('DataManager: Saving data to StorageService', {
                dataKeys: Object.keys(this.data),
                dataSize: JSON.stringify(this.data).length
            }, 'debug');
            
            this.storageService.save(this.data);

            debugLog('DataManager: Full save operation completed', null, 'debug');
        } catch (error) {
            debugLog('Error during save', error, 'error');
        }
    }

    savePartial(data: any): void {
        try {
            debugLog('DataManager: Starting partial save operation', {
                incomingDataKeys: data ? Object.keys(data) : 'null',
                currentDataExists: !!this.data
            }, 'debug');

            // Validate the data before saving to prevent corruption
            if (!data || typeof data !== 'object') {
                debugLog('Invalid partial data provided to savePartial', null, 'error');
                return;
            }

            // Ensure this.data is not null/undefined before merging
            if (!this.data || typeof this.data !== 'object') {
                debugLog('DataManager: Initializing empty data object for partial save', null, 'debug');
                this.data = {};
            }

            const newData = {...this.data, ...data};
            debugLog('DataManager: Merged data for partial save', {
                originalKeys: Object.keys(this.data),
                newKeys: Object.keys(data),
                mergedKeys: Object.keys(newData),
                dataSize: JSON.stringify(newData).length
            }, 'debug');

            this.data = newData;
            this.storageService.save(this.data);

            debugLog('DataManager: Partial save operation completed', null, 'debug');
        } catch (error) {
            debugLog('Error during savePartial', error, 'error');
        }
    }

    load(): any {
        return this.data;
    }

    loadOutfitData(): OutfitData {
        try {
            const data = this.load();

            // Validate and sanitize loaded data to prevent corruption
            if (!data || typeof data !== 'object') {
                debugLog('Invalid data loaded, returning defaults', null, 'warn');
                return {
                    botInstances: {},
                    userInstances: {},
                    presets: {},
                };
            }

            // Validate specific properties
            const botInstances = (data.botInstances && typeof data.botInstances === 'object')
                ? data.botInstances
                : {};

            const userInstances = (data.userInstances && typeof data.userInstances === 'object')
                ? data.userInstances
                : {};

            const presets = (data.presets && typeof data.presets === 'object')
                ? data.presets
                : {};

            return {
                botInstances,
                userInstances,
                presets,
            };
        } catch (error) {
            debugLog('Error during loadOutfitData', error, 'error');
            return {
                botInstances: {},
                userInstances: {},
                presets: {},
            };
        }
    }

    saveSettings(settings: any): void {
        debugLog('DataManager: Starting saveSettings operation', {
            settingsProvided: !!settings,
            settingsType: typeof settings
        }, 'debug');

        // Validate settings before saving
        if (!settings || typeof settings !== 'object') {
            debugLog('Invalid settings provided to saveSettings, using empty object', null, 'error');
            settings = {};
        }

        debugLog('DataManager: Saving settings', {settingKeys: Object.keys(settings)}, 'debug');
        this.savePartial({settings});

        debugLog('DataManager: Settings save operation completed', null, 'debug');
    }

    loadSettings(): any {
        try {
            const data = this.load();

            // Validate loaded settings
            if (data && typeof data.settings === 'object') {
                return data.settings;
            } else {
                debugLog('No valid settings found in loaded data, returning empty object', null, 'warn');
                return {};
            }
        } catch (error) {
            debugLog('Error during loadSettings', error, 'error');
            return {};
        }
    }
}

export {DataManager};