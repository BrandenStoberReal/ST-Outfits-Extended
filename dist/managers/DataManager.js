var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { deepMerge } from '../utils/utilities.js';
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
            console.log(`[DataManager] Migrating data from version ${this.data.version} to ${this.version}`);
            // Migration: Convert 'default' presets to settings-based default preset names
            if (this.data.presets) {
                const settings = this.data.settings || {};
                // Migrate bot presets
                if (this.data.presets.bot) {
                    for (const [key, presetGroup] of Object.entries(this.data.presets.bot)) {
                        if (presetGroup && presetGroup['default']) {
                            // Extract character and instance from key
                            const parts = key.split('_');
                            if (parts.length >= 2) {
                                const characterId = parts.slice(0, -1).join('_');
                                const instanceId = parts[parts.length - 1];
                                if (!settings.defaultBotPresets) {
                                    settings.defaultBotPresets = {};
                                }
                                if (!settings.defaultBotPresets[characterId]) {
                                    settings.defaultBotPresets[characterId] = {};
                                }
                                settings.defaultBotPresets[characterId][instanceId] = 'default';
                            }
                        }
                    }
                }
                // Migrate user presets
                if (this.data.presets.user) {
                    for (const [instanceId, presetGroup] of Object.entries(this.data.presets.user)) {
                        if (presetGroup && presetGroup['default']) {
                            if (!settings.defaultUserPresets) {
                                settings.defaultUserPresets = {};
                            }
                            settings.defaultUserPresets[instanceId] = 'default';
                        }
                    }
                }
                this.data.settings = settings;
            }
            this.data.version = this.version;
        }
    }
    save(data) {
        this.data = deepMerge(this.data, data);
        this.storageService.save(this.data);
    }
    load() {
        return this.data;
    }
    saveOutfitData(outfitData) {
        this.save({
            instances: outfitData.botInstances || {},
            user_instances: outfitData.userInstances || {},
            presets: outfitData.presets || {},
        });
    }
    // Direct method to save wiped outfit data that bypasses deepMerge for complete wipe operations
    saveWipedOutfitData() {
        // Directly set the properties without using deepMerge
        this.data.instances = {};
        this.data.user_instances = {};
        this.data.presets = {};
        // Save the updated data to storage
        this.storageService.save(this.data);
    }
    loadOutfitData() {
        const data = this.load();
        return {
            botInstances: data.instances || {},
            userInstances: data.user_instances || {},
            presets: data.presets || {},
        };
    }
    saveSettings(settings) {
        this.save({ settings });
    }
    loadSettings() {
        const data = this.load();
        return data.settings || {};
    }
    flush() {
        // No flush operation needed as the save function doesn't support it
        // If needed, this could trigger a save operation
        if (this.data) {
            this.storageService.save(this.data);
        }
    }
}
export { DataManager };
