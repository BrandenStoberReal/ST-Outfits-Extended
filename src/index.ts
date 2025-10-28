import {initializeExtension} from './core/ExtensionCore';
import {debugLog} from './logging/DebugLogger';

declare const $: any;

debugLog('Starting extension loading...', null, 'info');

$(document).ready(async () => {
    try {
        await initializeExtension();
        debugLog('Extension loaded successfully', null, 'info');
    } catch (error) {
        debugLog('Extension initialization failed', error, 'error');
    }
});