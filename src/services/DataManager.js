import {deepClone, deepMerge} from '../utils/utilities.js';

const DATA_VERSION = '1.0.0';

class DataManager {
    constructor(storageService) {
        this.storageService = storageService;
        this.version = DATA_VERSION;
        this.data = null;
    }

    async initialize() {
        this.data = await this.storageService.load();
        if (!this.data) {
            this.data = {};
        }
        this.migrateData();
    }

    migrateData() {
        if (!this.data.version || this.data.version < this.version) {
            console.log(`[DataManager] Migrating data from version ${this.data.version} to ${this.version}`);
            this.data.version = this.version;
        }
    }

    save(data) {
        try {
            // Use deepClone to avoid circular reference issues when serializing
            const mergedData = deepMerge(this.data, data);
            // Deep clone the merged data to break any circular references
            const clonedData = deepClone(mergedData);

            this.storageService.save(clonedData);
        } catch (error) {
            console.error('[DataManager] Error saving data:', error);
            // Fallback: try to save with only safe properties
            try {
                this.storageService.save(this.data);
            } catch (fallbackError) {
                console.error('[DataManager] Fallback save also failed:', fallbackError);
            }
        }
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

    loadOutfitData() {
        const data = this.load();

        return {
            botInstances: data.instances || {},
            userInstances: data.user_instances || {},
            presets: data.presets || {},
        };
    }

    saveSettings(settings) {
        this.save({settings});
    }

    loadSettings() {
        const data = this.load();

        return data.settings || {};
    }

    flush() {
        if (this.storageService.saveFn && typeof this.storageService.saveFn.flush === 'function') {
            this.storageService.saveFn.flush();
        }
    }
}

export {DataManager};
