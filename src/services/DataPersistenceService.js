/**
 * DataPersistenceService - Dedicated module for handling data persistence
 * Separates the persistence logic from state management concerns
 */

class DataPersistenceService {
    /**
     * Creates a new DataPersistenceService instance
     */
    constructor() {
        this.saveSettingsFn = null;
        this.extensionSettings = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the persistence service by connecting to SillyTavern's settings system
     * @returns {void}
     * @throws {Error} If the initialization fails
     */
    initialize() {
        try {
            // Try to get context through SillyTavern first, then fallback to window
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() :
                window.getContext ? window.getContext() :
                    window.extension_settings;

            if (context && typeof context === 'function') {
                this.extensionSettings = context().extensionSettings;
                this.saveSettingsFn = context().saveSettingsDebounced;
            } else if (context && context.extensionSettings) {
                this.extensionSettings = context.extensionSettings;
                this.saveSettingsFn = context.saveSettingsDebounced || window.saveSettingsDebounced;
            } else {
                this.extensionSettings = window.extension_settings;
                this.saveSettingsFn = window.saveSettingsDebounced;
            }

            // Ensure the outfit_tracker module exists in settings
            if (!this.extensionSettings?.outfit_tracker) {
                if (this.extensionSettings) {
                    this.extensionSettings.outfit_tracker = {};
                } else {
                    // If we can't get extension settings through context, try direct window access
                    if (!window.extension_settings?.outfit_tracker) {
                        window.extension_settings = window.extension_settings || {};
                        window.extension_settings.outfit_tracker = {};
                    }
                    this.extensionSettings = window.extension_settings;
                }
            }

            this.isInitialized = true;
            console.log('[DataPersistenceService] Initialized successfully');
        } catch (error) {
            console.error('[DataPersistenceService] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Save data to extension settings
     * @param {Object} data - The data to persist
     * @returns {void}
     */
    save(data) {
        if (!this.isInitialized) {
            console.warn('[DataPersistenceService] Not initialized, attempting to initialize now');
            this.initialize();
        }

        if (!this.extensionSettings?.outfit_tracker || typeof this.saveSettingsFn !== 'function') {
            console.error('[DataPersistenceService] Cannot save - extension settings not available');
            return;
        }

        // Update extension settings with current data
        Object.assign(this.extensionSettings.outfit_tracker, data);

        // Save settings using the debounced function
        this.saveSettingsFn();
    }

    /**
     * Load data from extension settings
     * @returns {Object} The loaded data or empty object if not available
     */
    load() {
        if (!this.isInitialized) {
            console.warn('[DataPersistenceService] Not initialized, attempting to initialize now');
            this.initialize();
        }

        if (this.extensionSettings?.outfit_tracker) {
            return { ...this.extensionSettings.outfit_tracker };
        } else if (window.extension_settings?.outfit_tracker) {
            // Fallback to window.extension_settings if context approach failed
            return { ...window.extension_settings.outfit_tracker };
        }

        return {};
    }

    /**
     * Specific method to save outfit data
     * @param {Object} outfitData - The outfit data to save
     * @property {Object} outfitData.botInstances - Bot outfit instances data
     * @property {Object} outfitData.userInstances - User outfit instances data
     * @property {Object} outfitData.presets - Preset data
     * @returns {void}
     */
    saveOutfitData(outfitData) {
        this.save({ 
            instances: outfitData.botInstances || {},
            user_instances: outfitData.userInstances || {},
            presets: outfitData.presets || {}
        });
    }

    /**
     * Load outfit data
     * @returns {Object} The loaded outfit data
     * @property {Object} botInstances - Loaded bot outfit instances
     * @property {Object} userInstances - Loaded user outfit instances
     * @property {Object} presets - Loaded preset data
     */
    loadOutfitData() {
        const data = this.load();

        return {
            botInstances: data.instances || {},
            userInstances: data.user_instances || {},
            presets: data.presets || {}
        };
    }

    /**
     * Specific method to save settings
     * @param {Object} settings - The settings to save
     * @returns {void}
     */
    saveSettings(settings) {
        this.save({ settings: settings });
    }

    /**
     * Load settings
     * @returns {Object} The loaded settings
     */
    loadSettings() {
        const data = this.load();

        return data.settings || {};
    }

    /**
     * Force flush any pending save operations
     * @returns {void}
     */
    flush() {
        if (this.saveSettingsFn && typeof this.saveSettingsFn.flush === 'function') {
            this.saveSettingsFn.flush();
        }
    }
}

// Create and export a single instance of the service
const dataPersistenceService = new DataPersistenceService();

export { dataPersistenceService, DataPersistenceService };