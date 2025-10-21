export {};

// 1. Import for user-scoped extensions
import '../../../../public/global';
// 2. Import for server-scoped extensions
import '../../../../global';

// Define additional types if needed...
declare global {
    // Add global type declarations here
    interface Window {
        getContext: any;
        extension_settings: any;
        saveSettingsDebounced: any;
        botOutfitPanel: any;
        userOutfitPanel: any;
        outfitTracker: any;
        SillyTavern: any;
    }
    
    var SillyTavern: {
        getContext: any;
        libs: any;
        saveSettingsDebounced: any;
    };
}