class StorageService {
    saveFn: (data: any) => void;
    loadFn: () => any;

    constructor(saveFn: (data: any) => void, loadFn: () => any) {
        this.saveFn = saveFn;
        this.loadFn = loadFn;
    }

    save(data: any): void {
        if (typeof this.saveFn !== 'function') {
            console.error('[StorageService] Save function is not configured.');
            return;
        }
        this.saveFn(data);
    }

    load(): any {
        if (typeof this.loadFn !== 'function') {
            console.error('[StorageService] Load function is not configured.');
            return null;
        }
        return this.loadFn();
    }


}

export {StorageService};