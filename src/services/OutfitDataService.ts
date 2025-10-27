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
                instancesCount: initialDataManagerState?.instances ? Object.keys(initialDataManagerState.instances).length : 0,
                userInstancesCount: initialDataManagerState?.user_instances ? Object.keys(initialDataManagerState.user_instances).length : 0,
                presetsCount: initialDataManagerState?.presets ? Object.keys(initialDataManagerState.presets).length : 0
            });

            // Clear the store in memory first
            console.log('[OutfitDataService] Clearing store in memory');
            outfitStore.wipeAllOutfitData();

            // Save the wiped data to storage
            console.log('[OutfitDataService] Saving wiped data to storage');
            this.dataManager.saveOutfitData({
                botInstances: {},
                userInstances: {},
                presets: {bot: {}, user: {}}
            });

            // Also save settings to make sure everything is up to date
            this.dataManager.saveSettings(outfitStore.getState().settings);

            // Log state after wiping but before direct save
            const stateAfterWipe = this.dataManager.load();
            console.log('[OutfitDataService] State after wiping but before direct save:', {
                instancesCount: stateAfterWipe?.instances ? Object.keys(stateAfterWipe.instances).length : 0,
                userInstancesCount: stateAfterWipe?.user_instances ? Object.keys(stateAfterWipe.user_instances).length : 0,
                presetsCount: stateAfterWipe?.presets ? Object.keys(stateAfterWipe.presets).length : 0
            });

            // Trigger saveState to ensure all changes are persisted
            // This internally calls the data manager's save methods
            console.log('[OutfitDataService] Calling saveState');
            outfitStore.saveState();

            // The issue is that the save operation is debounced and may not execute before page reload
            // We need to call the save function directly with the raw data (the save function will wrap it)
            if (this.dataManager.storageService && this.dataManager.storageService.saveFn) {
                console.log('[OutfitDataService] Calling save function directly to bypass debounce');
                
                // Load the current data - this is already in the correct format
                const currentData = this.dataManager.load();
                console.log('[OutfitDataService] Current data to save directly:', {
                    instancesCount: currentData?.instances ? Object.keys(currentData.instances).length : 0,
                    user_instancesCount: currentData?.user_instances ? Object.keys(currentData.user_instances).length : 0,
                    presetsCount: currentData?.presets ? Object.keys(currentData.presets).length : 0
                });
                
                // Call the save function directly (it will wrap the data as {outfit_tracker: currentData})
                this.dataManager.storageService.saveFn(currentData);
                console.log('[OutfitDataService] Direct save function called');
            } else {
                console.warn('[OutfitDataService] Storage service save function not available');
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