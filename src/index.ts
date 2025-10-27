import {initializeExtension} from './core/ExtensionCore';
import {debugLog} from './logging/DebugLogger';

declare const $: any;

console.log('[OutfitTracker] Starting extension loading...');
debugLog('Starting extension loading...', null, 'info');

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