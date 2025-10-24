import {DEFAULT_SETTINGS} from '../config/constants.js';

export function initSettings(autoOutfitSystem, AutoOutfitSystemClass, context) {
    // Get the extension settings using SillyTavern's context
    const settings = context.extensionSettings;
    const MODULE_NAME = 'outfit_tracker';

    // Load settings from extension settings, using defaults if not available
    if (!settings[MODULE_NAME]) {
        settings[MODULE_NAME] = {...DEFAULT_SETTINGS};
    }

    // Ensure all settings exist
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (settings[MODULE_NAME][key] === undefined) {
            settings[MODULE_NAME][key] = value;
        }
    }

    // Load bot panel colors from settings, using defaults if not available
    if (!settings[MODULE_NAME].botPanelColors) {
        settings[MODULE_NAME].botPanelColors = {
            primary: 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)',
            border: '#8a7fdb',
            shadow: 'rgba(106, 79, 193, 0.4)'
        };
    }

    // Load user panel colors from settings, using defaults if not available
    if (!settings[MODULE_NAME].userPanelColors) {
        settings[MODULE_NAME].userPanelColors = {
            primary: 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)',
            border: '#5da6f0',
            shadow: 'rgba(26, 120, 209, 0.4)'
        };
    }

    // Load auto outfit system settings
    if (settings[MODULE_NAME].autoOutfitSystem && autoOutfitSystem) {
        if (settings[MODULE_NAME].autoOutfitPrompt) {
            autoOutfitSystem.setPrompt(settings[MODULE_NAME].autoOutfitPrompt);
        }
        if (settings[MODULE_NAME].autoOutfitConnectionProfile) {
            autoOutfitSystem.setConnectionProfile(settings[MODULE_NAME].autoOutfitConnectionProfile);
        }
        // Enable the auto outfit system if it was previously enabled
        setTimeout(() => {
            autoOutfitSystem.enable();
        }, 1000); // Delay to allow everything else to initialize first
    } else if (autoOutfitSystem) {
        // If auto outfit system is disabled, ensure it starts disabled
        autoOutfitSystem.disable();
    }

    // Load presets if they exist in settings
    if (settings[MODULE_NAME].presets) {
        console.log('[OutfitTracker] Loading presets from settings');
    }

    // Load instances if they exist in settings
    if (settings[MODULE_NAME].instances) {
        console.log('[OutfitTracker] Loading bot instances from settings');
    }

    if (settings[MODULE_NAME].user_instances) {
        console.log('[OutfitTracker] Loading user instances from settings');
    }
}