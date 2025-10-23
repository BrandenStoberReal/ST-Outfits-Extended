
import { deepMerge } from '../utils/utilities.js';

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
        if (this.storageService.saveFn && typeof this.storageService.saveFn.flush === 'function') {
            this.storageService.saveFn.flush();
        }
    }
}

export { DataManager };
