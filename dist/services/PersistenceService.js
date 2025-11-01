import { outfitStore } from '../stores/Store.js';
import { debugLog } from '../logging/DebugLogger.js';
class PersistenceService {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }
    saveState() {
        try {
            const { botInstances, userInstances, presets, settings } = outfitStore.state;
            // Validate the data before saving to prevent corruption
            if (!botInstances || typeof botInstances !== 'object') {
                debugLog('Invalid botInstances data, using empty object', null, 'warn');
            }
            if (!userInstances || typeof userInstances !== 'object') {
                debugLog('Invalid userInstances data, using empty object', null, 'warn');
            }
            if (!presets || typeof presets !== 'object') {
                debugLog('Invalid presets data, using empty object', null, 'warn');
            }
            if (!settings || typeof settings !== 'object') {
                debugLog('Invalid settings data, using empty object', null, 'warn');
            }
            this.dataManager.savePartial({
                botInstances: botInstances || {},
                userInstances: userInstances || {},
                presets: presets || { bot: {}, user: {} },
                settings: settings || {}
            });
        }
        catch (error) {
            debugLog('Error during saveState', error, 'error');
        }
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
