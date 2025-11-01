import {debounce} from '../utils/utilities';
import {PersistenceService} from "../services/PersistenceService";

class DebouncedStore {
    private debouncedSave: () => void;
    private persistenceService: PersistenceService | null = null;

    constructor() {
        this.debouncedSave = debounce(() => {
            if (this.persistenceService) {
                this.persistenceService.saveState();
            }
        }, 300);
    }

    setPersistenceService(persistenceService: PersistenceService): void {
        this.persistenceService = persistenceService;
    }

    saveState(): void {
        this.debouncedSave();
    }
}

export const debouncedStore = new DebouncedStore();
