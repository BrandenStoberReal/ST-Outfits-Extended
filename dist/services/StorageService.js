import { debugLog } from '../logging/DebugLogger.js';
class StorageService {
    constructor(saveFn, loadFn) {
        this.saveFn = saveFn;
        this.loadFn = loadFn;
    }
    save(data) {
        if (typeof this.saveFn !== 'function') {
            debugLog('[StorageService] Save function is not configured.', null, 'error');
            return;
        }
        this.saveFn(data);
    }
    load() {
        if (typeof this.loadFn !== 'function') {
            debugLog('[StorageService] Load function is not configured.', null, 'error');
            return null;
        }
        return this.loadFn();
    }
}
export { StorageService };
