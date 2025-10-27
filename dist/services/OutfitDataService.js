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
            try {
                // Clear the store in memory first
                outfitStore.wipeAllOutfitData();
                // Save the wiped data to storage
                this.dataManager.saveOutfitData({
                    botInstances: {},
                    userInstances: {},
                    presets: { bot: {}, user: {} }
                });
                // Also save settings to make sure everything is up to date
                this.dataManager.saveSettings(outfitStore.getState().settings);
                // Trigger saveState to ensure all changes are persisted
                // This internally calls the data manager's save methods
                outfitStore.saveState();
                // The issue is that the save operation is debounced and may not execute before page reload
                // We need to call the save function directly with the raw data (the save function will wrap it)
                if (this.dataManager.storageService && this.dataManager.storageService.saveFn) {
                    // Load the current data - this is already in the correct format
                    const currentData = this.dataManager.load();
                    // Call the save function directly (it will wrap the data as {outfit_tracker: currentData})
                    this.dataManager.storageService.saveFn(currentData);
                }
                this.clearGlobalOutfitVariables();
                if (window.botOutfitPanel) {
                    window.botOutfitPanel.renderContent();
                }
                if (window.userOutfitPanel) {
                    window.userOutfitPanel.renderContent();
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
