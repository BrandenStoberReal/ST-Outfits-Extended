import { debounce } from '../utils/utilities.js';
class DebouncedStore {
    constructor() {
        this.persistenceService = null;
        this.debouncedSave = debounce(() => {
            if (this.persistenceService) {
                this.persistenceService.saveState();
            }
        }, 300);
    }
    setPersistenceService(persistenceService) {
        this.persistenceService = persistenceService;
    }
    saveState() {
        this.debouncedSave();
    }
}
export const debouncedStore = new DebouncedStore();
