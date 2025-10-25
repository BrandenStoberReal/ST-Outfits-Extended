// Main entry point for the ST-Outfits extension
// This file now serves as a thin wrapper that imports and initializes the modular components

// Import main extension core functionality
import {initializeExtension} from './src/core/ExtensionCore.js';
import {debugLog} from './src/logging/DebugLogger.js';

console.log('[OutfitTracker] Starting extension loading...');
debugLog('Starting extension loading...', null, 'info');

// Initialize the extension when the document is ready
$(document).ready(async () => {
    try {
        await initializeExtension();
        console.log('[OutfitTracker] Extension loaded successfully');
        debugLog('Extension loaded successfully', null, 'info');
    } catch (error) {
        console.error('[OutfitTracker] Initialization failed', error);
        debugLog('Extension initialization failed', error, 'error');
    }
});