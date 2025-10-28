import {ALL_SLOTS} from '../config/constants';
import {DataManager} from '../managers/DataManager';
import {outfitStore} from '../stores/Store';
import {debugLog} from '../logging/DebugLogger';

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
                debugLog(`Removed ${outfitVars.length} outfit-related global variables`, null, 'log');
            }
        } catch (error) {
            debugLog('Error clearing global outfit variables', error, 'error');
        }
    }

    async wipeAllOutfits(): Promise<string> {
        try {
            outfitStore.wipeAllOutfitData();
            this.dataManager.save(outfitStore.state);

            if (window.botOutfitPanel) {
                window.botOutfitPanel.renderContent();
            }

            if (window.userOutfitPanel) {
                window.userOutfitPanel.renderContent();
            }

            debugLog('All outfit data wiped successfully', null, 'log');
            return '[Outfit System] All outfit data has been wiped.';
        } catch (error) {
            debugLog('Error wiping outfit data', error, 'error');
            throw error;
        }
    }
}

export {OutfitDataService};