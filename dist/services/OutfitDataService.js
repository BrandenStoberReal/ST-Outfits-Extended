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
import { outfitStore } from '../stores/Store.js';
import { debugLog } from '../logging/DebugLogger.js';
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
                debugLog(`Removed ${outfitVars.length} outfit-related global variables`, null, 'log');
            }
        }
        catch (error) {
            debugLog('Error clearing global outfit variables', error, 'error');
        }
    }
    wipeAllOutfits() {
        return __awaiter(this, void 0, void 0, function* () {
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
            }
            catch (error) {
                debugLog('Error wiping outfit data', error, 'error');
                throw error;
            }
        });
    }
}
export { OutfitDataService };
