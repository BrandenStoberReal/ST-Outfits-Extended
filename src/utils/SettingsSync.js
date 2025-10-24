import {outfitStore} from '../common/Store.js';

/**
 * SettingsSync - Handles synchronization between extension settings and outfit store
 * This utility helps maintain consistency between the extension settings and the
 * outfit store to prevent desyncs.
 */
class SettingsSync {
    constructor() {
        this.syncInProgress = false;
    }

    /**
     * Synchronize settings from extension settings to outfit store
     * @param {Object} extSettings - The extension settings object
     * @param {string} moduleName - The module name for the settings (e.g., 'outfit_tracker')
     */
    syncSettingsToStore(extSettings, moduleName) {
        // Prevent recursive sync calls
        if (this.syncInProgress) {
            return;
        }

        try {
            this.syncInProgress = true;

            const settings = extSettings[moduleName];

            if (settings) {
                // Update each setting in the outfit store
                for (const [key, value] of Object.entries(settings)) {
                    outfitStore.setSetting(key, value);
                }
            }
        } catch (error) {
            console.error('[SettingsSync] Error during settings synchronization:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Checks if there are any desyncs between extension settings and outfit store
     * @param {Object} extSettings - The extension settings object
     * @param {string} moduleName - The module name for the settings (e.g., 'outfit_tracker')
     * @returns {Array} An array of desynced setting keys
     */
    checkDesync(extSettings, moduleName) {
        const desyncedSettings = [];
        const settings = extSettings[moduleName];

        if (!settings) {
            return desyncedSettings;
        }

        const storeState = outfitStore.getState();
        const storeSettings = storeState.settings;

        for (const [key, value] of Object.entries(settings)) {
            if (JSON.stringify(storeSettings[key]) !== JSON.stringify(value)) {
                desyncedSettings.push(key);
            }
        }

        return desyncedSettings;
    }

    /**
     * Fixes any desynced settings by syncing from extension settings to outfit store
     * @param {Object} extSettings - The extension settings object
     * @param {string} moduleName - The module name for the settings (e.g., 'outfit_tracker')
     * @returns {number} The number of settings that were out of sync and fixed
     */
    fixDesync(extSettings, moduleName) {
        const desyncedSettings = this.checkDesync(extSettings, moduleName);

        if (desyncedSettings.length > 0) {
            console.log(`[SettingsSync] Found ${desyncedSettings.length} desynced settings:`, desyncedSettings);
            this.syncSettingsToStore(extSettings, moduleName);
            console.log('[SettingsSync] Settings synchronization completed');
        }

        return desyncedSettings.length;
    }

    /**
     * Register a callback to be called when extension settings are saved
     * @param {Object} context - The SillyTavern context
     * @param {string} moduleName - The module name for the settings
     */
    registerSettingsSaveListener(context, moduleName) {
        // If the context has its own save function, wrap it to include sync
        if (context && typeof context.saveSettingsDebounced === 'function') {
            const originalSave = context.saveSettingsDebounced;
            const self = this;

            // Create a wrapper that also syncs settings
            context.saveSettingsDebounced = function (data) {
                // Apply the original save function
                const result = originalSave.apply(this, arguments);

                // Sync settings to outfit store after saving
                setTimeout(() => {
                    self.syncSettingsToStore(context.extensionSettings, moduleName);
                }, 50); // Small delay to ensure settings are saved

                return result;
            };
        }
    }
}

// Create a single instance of the sync utility
const settingsSync = new SettingsSync();

export {settingsSync};