/**
 * Debug logging utility for the outfit tracker extension
 * Provides conditional logging based on debug mode setting
 */

import {outfitStore} from '../common/Store.js';

/**
 * Logs a debug message if debug mode is enabled
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to log alongside the message
 * @param {string} [level='log'] - The log level ('log', 'warn', 'error', 'info', 'debug')
 * @returns {void}
 */
export function debugLog(message, data, level = 'log') {
    // Get the current settings from the store
    const storeState = outfitStore.getState();
    const debugMode = storeState?.settings?.debugMode;

    // Only log if debug mode is enabled
    if (debugMode) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[OutfitTracker Debug - ${timestamp}] ${message}`;

        switch (level) {
        case 'warn':
            console.warn(formattedMessage, data !== undefined ? data : '');
            break;
        case 'error':
            console.error(formattedMessage, data !== undefined ? data : '');
            break;
        case 'info':
            console.info(formattedMessage, data !== undefined ? data : '');
            break;
        case 'debug':
            console.debug(formattedMessage, data !== undefined ? data : '');
            break;
        case 'log':
        default:
            console.log(formattedMessage, data !== undefined ? data : '');
            break;
        }
    }
}

/**
 * Logs a debug message regardless of debug mode setting
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to log alongside the message
 * @returns {void}
 */
export function forceDebugLog(message, data) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[OutfitTracker Debug - ${timestamp}] ${message}`;

    console.log(formattedMessage, data !== undefined ? data : '');
}