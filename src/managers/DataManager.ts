import {deepMerge} from '../utils/utilities';
import {StorageService} from '../services/StorageService';

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
            console.log(`[DataManager] Migrating data from version ${this.data.version} to ${this.version}`);
            this.data.version = this.version;
        }
    }

    save(data: any): void {
        this.data = deepMerge(this.data, data);
        this.storageService.save(this.data);
    }

    load(): any {
        return this.data;
    }

    saveOutfitData(outfitData: OutfitData): void {
        this.save({
            instances: outfitData.botInstances || {},
            user_instances: outfitData.userInstances || {},
            presets: outfitData.presets || {},
        });
    }

    // Direct method to save wiped outfit data that bypasses deepMerge for complete wipe operations
    saveWipedOutfitData(): void {
        // Directly set the properties without using deepMerge
        this.data.instances = {};
        this.data.user_instances = {};
        this.data.presets = {};

        // Save the updated data to storage
        this.storageService.save(this.data);
    }

    loadOutfitData(): OutfitData {
        const data = this.load();

        return {
            botInstances: data.instances || {},
            userInstances: data.user_instances || {},
            presets: data.presets || {},
        };
    }

    saveSettings(settings: any): void {
        this.save({settings});
    }

    loadSettings(): any {
        const data = this.load();

        return data.settings || {};
    }

    flush(): void {
        // No flush operation needed as the save function doesn't support it
        // If needed, this could trigger a save operation
        if (this.data) {
            this.storageService.save(this.data);
        }
    }
}

export {DataManager};