// Main entry point for the ST-Outfits extension
// This file now serves as a thin wrapper that imports and initializes the modular components

// Import modules from SillyTavern core - these are expected to be available when installed correctly
import { getContext, extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

console.log('[OutfitTracker] Starting extension loading...');

// Import main extension core functionality
import { initializeExtension } from './src/core/ExtensionCore.js';

// Initialize the extension when the document is ready
$(async () => {
    try {
        await initializeExtension();
        console.log('[OutfitTracker] Extension loaded successfully');
    } catch (error) {
        console.error('[OutfitTracker] Initialization failed', error);
    }
});