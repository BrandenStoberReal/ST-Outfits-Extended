import {debugLog} from "../logging/DebugLogger";

class StorageService {
    saveFn: (data: any) => void;
    loadFn: () => any;

    constructor(saveFn: (data: any) => void, loadFn: () => any) {
        this.saveFn = saveFn;
        this.loadFn = loadFn;
    }

    save(data: any): void {
        debugLog('StorageService: Executing save operation', {
            dataExists: !!data,
            dataKeys: data ? Object.keys(data) : 'null',
            saveFunctionExists: typeof this.saveFn === 'function'
        }, 'debug');

        if (typeof this.saveFn !== 'function') {
            debugLog('Save function is not configured.', null, 'error');
            return;
        }

        debugLog('StorageService: Calling external save function', {
            dataSize: JSON.stringify(data).length
        }, 'debug');
        
        this.saveFn(data);

        debugLog('StorageService: External save function called successfully', null, 'debug');
    }

    load(): any {
        if (typeof this.loadFn !== 'function') {
            debugLog('Load function is not configured.', null, 'error');
            return null;
        }
        return this.loadFn();
    }


}

export {StorageService};