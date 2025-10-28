import { outfitStore } from '../stores/Store.js';
import { debugLog } from '../logging/DebugLogger.js';
class PersistenceService {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }
    saveState() {
        try {
            const { botInstances, userInstances, presets, settings } = outfitStore.state;
            debugLog('PersistenceService: Starting saveState operation', {
                botInstancesCount: Object.keys(botInstances || {}).length,
                userInstancesCount: Object.keys(userInstances || {}).length,
                presetsCount: Object.keys(presets || {}).length,
                settings: !!settings
            }, 'debug');
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
            const saveData = {
                botInstances: botInstances || {},
                userInstances: userInstances || {},
                presets: presets || { bot: {}, user: {} },
                settings: settings || {}
            };
            debugLog('PersistenceService: Saving data to DataManager', {
                botInstancesCount: Object.keys(saveData.botInstances).length,
                userInstancesCount: Object.keys(saveData.userInstances).length,
                presetsBotCount: Object.keys(saveData.presets.bot).length,
                presetsUserCount: Object.keys(saveData.presets.user).length
            }, 'debug');
            this.dataManager.savePartial(saveData);
            debugLog('PersistenceService: Save operation completed successfully', null, 'debug');
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
