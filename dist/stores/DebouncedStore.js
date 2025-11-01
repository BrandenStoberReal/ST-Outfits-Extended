import { debugLog } from '../logging/DebugLogger.js';
class ImmediateStore {
    constructor() {
        this.persistenceService = null;
    }
    setPersistenceService(persistenceService) {
        debugLog('ImmediateStore: Setting PersistenceService', null, 'debug');
        this.persistenceService = persistenceService;
    }
    saveState() {
        debugLog('ImmediateStore: Executing immediate save operation', null, 'debug');
        if (this.persistenceService) {
            this.persistenceService.saveState();
        }
        else {
            debugLog('ImmediateStore: PersistenceService not set, cannot save', null, 'warn');
        }
    }
    flush() {
        // Flush is no longer needed, but we keep it for compatibility.
        debugLog('ImmediateStore: Flush called, but save is already immediate.', null, 'debug');
    }
}
export const immediateStore = new ImmediateStore();
