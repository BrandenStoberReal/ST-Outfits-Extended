import { debounce } from '../utils/utilities.js';
import { debugLog } from '../logging/DebugLogger.js';
/**
 * Provides debounced saving functionality to avoid excessive disk I/O
 * while ensuring data changes are persisted in a timely manner.
 */
class DebouncedStore {
    constructor() {
        this.persistenceService = null;
        this.debouncedSave = debounce(() => {
            debugLog('DebouncedStore: Executing debounced save operation', null, 'debug');
            if (this.persistenceService) {
                this.persistenceService.saveState();
            }
            else {
                debugLog('DebouncedStore: PersistenceService not set, cannot save', null, 'warn');
            }
        }, 300);
    }
    setPersistenceService(persistenceService) {
        debugLog('DebouncedStore: Setting PersistenceService', null, 'debug');
        this.persistenceService = persistenceService;
    }
    saveState() {
        debugLog('DebouncedStore: Requesting save operation (will be debounced)', null, 'debug');
        this.debouncedSave();
    }
    /**
     * Immediately saves the current state without waiting for the debounce timer.
     * This is especially useful for saving data before page unload.
     */
    flush() {
        debugLog('DebouncedStore: Executing immediate flush operation', null, 'debug');
        if (this.persistenceService) {
            this.persistenceService.saveState();
        }
        else {
            debugLog('DebouncedStore: PersistenceService not set, cannot flush', null, 'warn');
        }
    }
}
export const debouncedStore = new DebouncedStore();
