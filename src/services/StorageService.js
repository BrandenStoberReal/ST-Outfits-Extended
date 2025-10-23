
class StorageService {
    constructor(saveFn, loadFn) {
        this.saveFn = saveFn;
        this.loadFn = loadFn;
    }

    save(data) {
        if (typeof this.saveFn !== 'function') {
            console.error('[StorageService] Save function is not configured.');
            return;
        }
        this.saveFn(data);
    }

    load() {
        if (typeof this.loadFn !== 'function') {
            console.error('[StorageService] Load function is not configured.');
            return null;
        }
        return this.loadFn();
    }
}

export { StorageService };
