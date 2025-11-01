/**
 * Utility functions for safely accessing extension settings
 */

/**
 * Safely get a setting value from various possible sources
 * @param {string} key - The setting key to retrieve
 * @param {*} defaultValue - The default value to return if the setting is not found
 * @returns {*} The value of the setting or the default value
 */
export function getSettingValue(key: string, defaultValue: any = undefined): any {
    try {
        // First try to get settings from the store
        if ((window as any).outfitStore && typeof (window as any).outfitStore.getSetting === 'function') {
            return (window as any).outfitStore.getSetting(key);
        }

        // Fallback to the extension settings through context
        const context = (window as any).SillyTavern?.getContext ? (window as any).SillyTavern.getContext() :
            (window as any).getContext ? (window as any).getContext() :
                null;

        if (context && typeof context === 'function') {
            const settings = context().extensionSettings;

            return settings?.outfit_tracker?.[key];
        } else if (context && context.extensionSettings) {
            return context.extensionSettings.outfit_tracker?.[key];
        }

        // Ultimate fallback to window.extension_settings
        return (window as any).extension_settings?.outfit_tracker?.[key];
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
export function areSystemMessagesEnabled(): boolean {
    return getSettingValue('enableSysMessages', false);
}
