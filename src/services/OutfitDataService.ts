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

            // Update the data manager with wiped data
            console.log('[OutfitDataService] Saving wiped data to data manager');
            this.dataManager.saveOutfitData({
                botInstances: {},
                userInstances: {},
                presets: {bot: {}, user: {}}
            });

            // Update settings too
            this.dataManager.saveSettings(outfitStore.getState().settings);

            // Now ensure the wiped state is saved through the main saveState flow
            console.log('[OutfitDataService] Syncing wiped state to data manager');
            outfitStore.saveState();

            // IMPORTANT: Access the SillyTavern context directly to ensure immediate save
            const STContext = window.SillyTavern?.getContext?.() || window.getContext?.();

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
                STContext.saveSettingsDebounced({outfit_tracker: outfitTrackerData});

                // If there's a non-debounced save function available, use that too
                if (typeof STContext.saveSettings === 'function') {
                    console.log('[OutfitDataService] Found immediate save function, using that as well');
                    STContext.saveSettings({outfit_tracker: outfitTrackerData});
                }
            } else {
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