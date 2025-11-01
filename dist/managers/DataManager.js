var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
            this.data.version = this.version;
        }
    }
    save(data) {
        this.data = data;
        this.storageService.save(this.data);
    }
    savePartial(data) {
        this.data = Object.assign(Object.assign({}, this.data), data);
        this.storageService.save(this.data);
    }
    load() {
        return this.data;
    }
    loadOutfitData() {
        const data = this.load();
        return {
            botInstances: data.botInstances || {},
            userInstances: data.userInstances || {},
            presets: data.presets || {},
        };
    }
    saveSettings(settings) {
        this.savePartial({ settings });
    }
    loadSettings() {
        const data = this.load();
        return data.settings || {};
    }
}
export { DataManager };
