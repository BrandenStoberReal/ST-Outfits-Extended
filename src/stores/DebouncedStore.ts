import {PersistenceService} from "../services/PersistenceService";
import {debugLog} from '../logging/DebugLogger';

class ImmediateStore {
    private persistenceService: PersistenceService | null = null;

    setPersistenceService(persistenceService: PersistenceService): void {
        debugLog('ImmediateStore: Setting PersistenceService', null, 'debug');
        this.persistenceService = persistenceService;
    }

    saveState(): void {
        debugLog('ImmediateStore: Executing immediate save operation', null, 'debug');
        if (this.persistenceService) {
            this.persistenceService.saveState();
        } else {
            debugLog('ImmediateStore: PersistenceService not set, cannot save', null, 'warn');
        }
    }

    flush(): void {
        // Flush is no longer needed, but we keep it for compatibility.
        debugLog('ImmediateStore: Flush called, but save is already immediate.', null, 'debug');
    }
}

export const immediateStore = new ImmediateStore();