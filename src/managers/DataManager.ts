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
            // Validate the data before saving to prevent corruption
            if (!data || typeof data !== 'object') {
                debugLog('Invalid data provided to save, using empty object', null, 'error');
                data = {};
            }

            this.data = data;
            this.storageService.save(this.data);
        } catch (error) {
            debugLog('Error during save', error, 'error');
        }
    }

    savePartial(data: any): void {
        try {
            // Validate the data before saving to prevent corruption
            if (!data || typeof data !== 'object') {
                debugLog('Invalid partial data provided to savePartial', null, 'error');
                return;
            }

            // Ensure this.data is not null/undefined before merging
            if (!this.data || typeof this.data !== 'object') {
                this.data = {};
            }

            this.data = {...this.data, ...data};
            this.storageService.save(this.data);
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
        // Validate settings before saving
        if (!settings || typeof settings !== 'object') {
            debugLog('Invalid settings provided to saveSettings, using empty object', null, 'error');
            settings = {};
        }
        
        this.savePartial({settings});
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