/**
 * DataService - Handles data operations for the Outfit Tracker extension
 */

// Import the store for data access
import { outfitStore } from '../common/Store.js';
import { ALL_SLOTS } from '../config/constants.js';

/**
 * Clear all global variables related to outfits
 */
function clearGlobalOutfitVariables() {
    try {
        // Access the global variables store if available
        if (window.extension_settings && window.extension_settings.variables) {
            // Remove all bot-related outfit variables
            if (window.extension_settings.variables.global) {
                const globalVars = window.extension_settings.variables.global;
                
                // Get all variable names that start with outfit-related patterns
                const outfitVars = Object.keys(globalVars).filter(key => 
                    ALL_SLOTS.some(slot => key.includes(`_${slot}`))
                );
                
                // Remove each outfit variable
                outfitVars.forEach(key => {
                    delete globalVars[key];
                });
                
                console.log(`[OutfitTracker] Removed ${outfitVars.length} outfit-related global variables`);
            }
        }
    } catch (error) {
        console.error('[OutfitTracker] Error clearing global outfit variables:', error);
    }
}

/**
 * Wipes all saved outfit data for both bot and user characters
 * @returns {string} - Success message
 */
export async function wipeAllOutfits() {
    try {
        // Clear all bot outfit instances
        outfitStore.state.botInstances = {};
        
        // Clear all user outfit instances
        outfitStore.state.userInstances = {};
        
        // Clear all presets
        outfitStore.state.presets = {
            bot: {},
            user: {}
        };
        
        // Clear global variables related to outfits
        clearGlobalOutfitVariables();
        
        // Save the cleared state
        outfitStore.saveSettings();
        
        // Refresh the UI panels to reflect the changes
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