import {debounce} from '../utils/utilities';
import {PersistenceService} from "../services/PersistenceService";
import {debugLog} from '../logging/DebugLogger';

/**
 * Provides debounced saving functionality to avoid excessive disk I/O
 * while ensuring data changes are persisted in a timely manner.
 */
class DebouncedStore {
    private debouncedSave: () => void;
    private persistenceService: PersistenceService | null = null;

    constructor() {
        this.debouncedSave = debounce(() => {
            debugLog('DebouncedStore: Executing debounced save operation', null, 'debug');
            if (this.persistenceService) {
                this.persistenceService.saveState();
            } else {
                debugLog('DebouncedStore: PersistenceService not set, cannot save', null, 'warn');
            }
        }, 300);
    }

    setPersistenceService(persistenceService: PersistenceService): void {
        debugLog('DebouncedStore: Setting PersistenceService', null, 'debug');
        this.persistenceService = persistenceService;
    }

    saveState(): void {
        debugLog('DebouncedStore: Requesting save operation (will be debounced)', null, 'debug');
        this.debouncedSave();
    }

    /**
     * Immediately saves the current state without waiting for the debounce timer.
     * This is especially useful for saving data before page unload.
     */
    flush(): void {
        debugLog('DebouncedStore: Executing immediate flush operation', null, 'debug');
        if (this.persistenceService) {
            this.persistenceService.saveState();
        } else {
            debugLog('DebouncedStore: PersistenceService not set, cannot flush', null, 'warn');
        }
    }
}

export const debouncedStore = new DebouncedStore();
