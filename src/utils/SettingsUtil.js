/**
 * Utility functions for safely accessing extension settings
 */

import SillyTavernApi from '../services/SillyTavernApi.js';

/**
 * Safely get a setting value from various possible sources
 * @param {string} key - The setting key to retrieve
 * @param {*} defaultValue - The default value to return if the setting is not found
 * @returns {*} The value of the setting or the default value
 */
export function getSettingValue(key, defaultValue = undefined) {
    try {
        // First try to get settings from the store
        if (window.outfitStore && typeof window.outfitStore.getSetting === 'function') {
            return window.outfitStore.getSetting(key);
        }

        // Fallback to the extension settings through context
        const context = SillyTavernApi.getContext();

        if (context && context.extensionSettings) {
            return context.extensionSettings.outfit_tracker?.[key];
        }

        // Ultimate fallback to window.extension_settings
        return window.extension_settings?.outfit_tracker?.[key];
    } catch (error) {
        // If all methods fail, return a safe default
        console.warn('Could not access outfit tracker settings, using default behavior:', error);
        return defaultValue;
    }
}

/**
 * Check if system messages are enabled
 * @returns {boolean} True if system messages are enabled, false otherwise
 */
export function areSystemMessagesEnabled() {
    return getSettingValue('enableSysMessages', false);
}