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
        this.data = data;
        this.storageService.save(this.data);
    }

    savePartial(data: any): void {
        this.data = {...this.data, ...data};
        this.storageService.save(this.data);
    }

    load(): any {
        return this.data;
    }

    loadOutfitData(): OutfitData {
        const data = this.load();

        return {
            botInstances: data.botInstances || {},
            userInstances: data.userInstances || {},
            presets: data.presets || {},
        };
    }

    saveSettings(settings: any): void {
        this.savePartial({settings});
    }

    loadSettings(): any {
        const data = this.load();

        return data.settings || {};
    }
}

export {DataManager};