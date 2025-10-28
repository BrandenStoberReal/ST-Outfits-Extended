import {outfitStore} from '../stores/Store';
import {DataManager} from '../managers/DataManager';

class PersistenceService {
    dataManager: DataManager;

    constructor(dataManager: DataManager) {
        this.dataManager = dataManager;
    }

    saveState(): void {
        const {botInstances, userInstances, presets, settings} = outfitStore.state;

        this.dataManager.savePartial({botInstances, userInstances, presets, settings});
    }

    loadState(): void {
        const {botInstances, userInstances, presets} = this.dataManager.loadOutfitData();
        const settings = this.dataManager.loadSettings();

        const safePresets = presets || {
            bot: {},
            user: {}
        };

        outfitStore.setState({botInstances, userInstances, presets: safePresets, settings});
        outfitStore.notifyListeners();
    }
}

export {PersistenceService};
