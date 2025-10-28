var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { debugLog } from '../logging/DebugLogger.js';
const DATA_VERSION = '1.0.0';
class DataManager {
    constructor(storageService) {
        this.storageService = storageService;
        this.version = DATA_VERSION;
        this.data = null;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.data = yield this.storageService.load();
            if (!this.data) {
                this.data = {};
            }
            this.migrateData();
        });
    }
    migrateData() {
        if (!this.data.version || this.data.version < this.version) {
            debugLog(`Migrating data from version ${this.data.version} to ${this.version}`, null, 'log');
            this.data.version = this.version;
        }
    }
    save(data) {
        try {
            // Validate the data before saving to prevent corruption
            if (!data || typeof data !== 'object') {
                debugLog('Invalid data provided to save, using empty object', null, 'error');
                data = {};
            }
            this.data = data;
            this.storageService.save(this.data);
        }
        catch (error) {
            debugLog('Error during save', error, 'error');
        }
    }
    savePartial(data) {
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
            this.data = Object.assign(Object.assign({}, this.data), data);
            this.storageService.save(this.data);
        }
        catch (error) {
            debugLog('Error during savePartial', error, 'error');
        }
    }
    load() {
        return this.data;
    }
    loadOutfitData() {
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
        }
        catch (error) {
            debugLog('Error during loadOutfitData', error, 'error');
            return {
                botInstances: {},
                userInstances: {},
                presets: {},
            };
        }
    }
    saveSettings(settings) {
        // Validate settings before saving
        if (!settings || typeof settings !== 'object') {
            debugLog('Invalid settings provided to saveSettings, using empty object', null, 'error');
            settings = {};
        }
        this.savePartial({ settings });
    }
    loadSettings() {
        try {
            const data = this.load();
            // Validate loaded settings
            if (data && typeof data.settings === 'object') {
                return data.settings;
            }
            else {
                debugLog('No valid settings found in loaded data, returning empty object', null, 'warn');
                return {};
            }
        }
        catch (error) {
            debugLog('Error during loadSettings', error, 'error');
            return {};
        }
    }
}
export { DataManager };
