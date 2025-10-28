import { outfitStore } from '../common/Store.js';
class PersistenceService {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }
    saveState() {
        const { botInstances, userInstances, presets, settings } = outfitStore.state;
        this.dataManager.savePartial({ botInstances, userInstances, presets, settings });
    }
    loadState() {
        const { botInstances, userInstances, presets } = this.dataManager.loadOutfitData();
        const settings = this.dataManager.loadSettings();
        const safePresets = presets || {
            bot: {},
            user: {}
        };
        outfitStore.setState({ botInstances, userInstances, presets: safePresets, settings });
        outfitStore.notifyListeners();
    }
}
export { PersistenceService };
