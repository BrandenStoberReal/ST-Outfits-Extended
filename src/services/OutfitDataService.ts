import {ALL_SLOTS} from '../config/constants';
import {DataManager} from '../managers/DataManager';
import {outfitStore} from '../common/Store';

class OutfitDataService {
    dataManager: DataManager;

    constructor(dataManager: DataManager) {
        this.dataManager = dataManager;
    }

    clearGlobalOutfitVariables(): void {
        try {
            const extensionSettings = this.dataManager.load();

            if (extensionSettings?.variables?.global) {
                const globalVars = extensionSettings.variables.global;
                const outfitVars = Object.keys(globalVars).filter(key => ALL_SLOTS.some(slot => key.endsWith(`_${slot}`)));

                outfitVars.forEach(key => {
                    delete globalVars[key];
                });

                this.dataManager.save({variables: {global: globalVars}});
                console.log(`[OutfitTracker] Removed ${outfitVars.length} outfit-related global variables`);
            }
        } catch (error) {
            console.error('[OutfitTracker] Error clearing global outfit variables:', error);
        }
    }

    async wipeAllOutfits(): Promise<string> {
        try {
            // Clear the store in memory first
            outfitStore.wipeAllOutfitData();

            // Save the wiped data to storage
            this.dataManager.saveOutfitData({
                botInstances: {},
                userInstances: {},
                presets: {bot: {}, user: {}}
            });

            // Trigger saveState to ensure all changes are persisted
            // This internally calls the data manager's save methods
            outfitStore.saveState();

            // Now directly access the save function to ensure immediate saving
            // We need to bypass the debounced nature of the save
            if (this.dataManager.storageService && this.dataManager.storageService.saveFn) {
                // Call the save function directly with the current state
                const currentData = this.dataManager.load();
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
        } catch (error) {
            console.error('[OutfitTracker] Error wiping outfit data:', error);
            throw error;
        }
    }
}

export {OutfitDataService};