var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ALL_SLOTS } from '../config/constants.js';
import { outfitStore } from '../common/Store.js';
class OutfitDataService {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }
    clearGlobalOutfitVariables() {
        var _a;
        try {
            const extensionSettings = this.dataManager.load();
            if ((_a = extensionSettings === null || extensionSettings === void 0 ? void 0 : extensionSettings.variables) === null || _a === void 0 ? void 0 : _a.global) {
                const globalVars = extensionSettings.variables.global;
                const outfitVars = Object.keys(globalVars).filter(key => ALL_SLOTS.some(slot => key.endsWith(`_${slot}`)));
                outfitVars.forEach(key => {
                    delete globalVars[key];
                });
                this.dataManager.save({ variables: { global: globalVars } });
                console.log(`[OutfitTracker] Removed ${outfitVars.length} outfit-related global variables`);
            }
        }
        catch (error) {
            console.error('[OutfitTracker] Error clearing global outfit variables:', error);
        }
    }
    wipeAllOutfits() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            console.log('[OutfitDataService] Starting wipeAllOutfits process');
            try {
                // Log initial state before wiping
                const initialStoreState = outfitStore.getState();
                console.log('[OutfitDataService] Initial store state:', {
                    botInstancesCount: Object.keys(initialStoreState.botInstances).length,
                    userInstancesCount: Object.keys(initialStoreState.userInstances).length,
                    botPresetsCount: Object.keys(initialStoreState.presets.bot).length,
                    userPresetsCount: Object.keys(initialStoreState.presets.user).length
                });
                const initialDataManagerState = this.dataManager.load();
                console.log('[OutfitDataService] Initial data manager state:', {
                    instancesCount: (initialDataManagerState === null || initialDataManagerState === void 0 ? void 0 : initialDataManagerState.instances) ? Object.keys(initialDataManagerState.instances).length : 0,
                    userInstancesCount: (initialDataManagerState === null || initialDataManagerState === void 0 ? void 0 : initialDataManagerState.user_instances) ? Object.keys(initialDataManagerState.user_instances).length : 0,
                    presetsCount: (initialDataManagerState === null || initialDataManagerState === void 0 ? void 0 : initialDataManagerState.presets) ? Object.keys(initialDataManagerState.presets).length : 0
                });
                // Clear the store in memory first
                console.log('[OutfitDataService] Clearing store in memory');
                outfitStore.wipeAllOutfitData();
                // Verify the store has been cleared
                const storeAfterWipe = outfitStore.getState();
                console.log('[OutfitDataService] Store state after wiping in memory:', {
                    botInstancesCount: Object.keys(storeAfterWipe.botInstances).length,
                    userInstancesCount: Object.keys(storeAfterWipe.userInstances).length,
                    botPresetsCount: Object.keys(storeAfterWipe.presets.bot).length,
                    userPresetsCount: Object.keys(storeAfterWipe.presets.user).length
                });
                // Update the data manager with wiped data using the direct wipe method
                console.log('[OutfitDataService] Saving wiped data to data manager using direct wipe method');
                this.dataManager.saveWipedOutfitData();
                // Update settings too
                this.dataManager.saveSettings(outfitStore.getState().settings);
                // Check data manager state after the direct save operation
                const dataManagerAfterDirectSave = this.dataManager.load();
                console.log('[OutfitDataService] Data manager state after direct saveOutfitData:', {
                    instancesCount: (dataManagerAfterDirectSave === null || dataManagerAfterDirectSave === void 0 ? void 0 : dataManagerAfterDirectSave.instances) ? Object.keys(dataManagerAfterDirectSave.instances).length : 0,
                    userInstancesCount: (dataManagerAfterDirectSave === null || dataManagerAfterDirectSave === void 0 ? void 0 : dataManagerAfterDirectSave.user_instances) ? Object.keys(dataManagerAfterDirectSave.user_instances).length : 0,
                    presetsCount: (dataManagerAfterDirectSave === null || dataManagerAfterDirectSave === void 0 ? void 0 : dataManagerAfterDirectSave.presets) ? Object.keys(dataManagerAfterDirectSave.presets).length : 0
                });
                // Now sync the store with the wiped data in the data manager
                console.log('[OutfitDataService] Loading wiped data from data manager to store');
                outfitStore.loadState(); // This should load the wiped data from the data manager to the store
                // Verify the store now has the wiped data
                const storeAfterLoadState = outfitStore.getState();
                console.log('[OutfitDataService] Store state after loading from data manager:', {
                    botInstancesCount: Object.keys(storeAfterLoadState.botInstances).length,
                    userInstancesCount: Object.keys(storeAfterLoadState.userInstances).length,
                    botPresetsCount: Object.keys(storeAfterLoadState.presets.bot).length,
                    userPresetsCount: Object.keys(storeAfterLoadState.presets.user).length
                });
                // IMPORTANT: Access the SillyTavern context directly to ensure immediate save
                const STContext = ((_b = (_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_c = window.getContext) === null || _c === void 0 ? void 0 : _c.call(window));
                if (STContext && typeof STContext.saveSettingsDebounced === 'function') {
                    console.log('[OutfitDataService] Using direct SillyTavern save to ensure immediate persistence');
                    // Get the current state of our data after wiping
                    const currentState = this.dataManager.load();
                    // Create the complete outfit tracker object in the format expected by SillyTavern
                    const outfitTrackerData = {
                        instances: currentState.instances || {},
                        user_instances: currentState.user_instances || {},
                        presets: currentState.presets || {},
                        settings: currentState.settings || {},
                        version: currentState.version || '1.0.0',
                        variables: currentState.variables || {}
                    };
                    console.log('[OutfitDataService] Attempting immediate save with wiped data:', {
                        instancesCount: Object.keys(outfitTrackerData.instances || {}).length,
                        userInstancesCount: Object.keys(outfitTrackerData.user_instances || {}).length,
                        presetsCount: Object.keys(outfitTrackerData.presets || {}).length
                    });
                    // Try to call the save function directly
                    STContext.saveSettingsDebounced({ outfit_tracker: outfitTrackerData });
                    // If there's a non-debounced save function available, use that too
                    if (typeof STContext.saveSettings === 'function') {
                        console.log('[OutfitDataService] Found immediate save function, using that as well');
                        STContext.saveSettings({ outfit_tracker: outfitTrackerData });
                    }
                }
                else {
                    console.error('[OutfitDataService] Could not access SillyTavern context for immediate save');
                    // Fallback: try to use the direct storage service save (original approach)
                    if (this.dataManager.storageService && this.dataManager.storageService.saveFn) {
                        console.log('[OutfitDataService] Using fallback direct save');
                        // Load the current data - this should be the wiped data now
                        const currentData = this.dataManager.load();
                        // Call the save function directly
                        this.dataManager.storageService.saveFn(currentData);
                    }
                }
                this.clearGlobalOutfitVariables();
                // Update the UI to reflect the cleared state
                if (window.botOutfitPanel) {
                    window.botOutfitPanel.renderContent(); // Refresh bot panel to show cleared state
                }
                if (window.userOutfitPanel) {
                    window.userOutfitPanel.renderContent(); // Refresh user panel to show cleared state
                }
                console.log('[OutfitTracker] All outfit data wiped successfully');
                return '[Outfit System] All outfit data has been wiped.';
            }
            catch (error) {
                console.error('[OutfitTracker] Error wiping outfit data:', error);
                throw error;
            }
        });
    }
}
export { OutfitDataService };
