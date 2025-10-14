import { DEFAULT_SETTINGS } from '../config/constants.js';

export function initSettings(autoOutfitSystem) {
    // Load settings from extension settings, using defaults if not available
    if (!extension_settings.outfit_tracker) {
        extension_settings.outfit_tracker = { ...DEFAULT_SETTINGS };
    }

    // Ensure all settings exist
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (extension_settings.outfit_tracker[key] === undefined) {
            extension_settings.outfit_tracker[key] = value;
        }
    }

    // Load bot panel colors from settings, using defaults if not available
    if (!extension_settings.outfit_tracker.botPanelColors) {
        extension_settings.outfit_tracker.botPanelColors = {
            primary: 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)',
            border: '#8a7fdb',
            shadow: 'rgba(106, 79, 193, 0.4)'
        };
    }

    // Load user panel colors from settings, using defaults if not available
    if (!extension_settings.outfit_tracker.userPanelColors) {
        extension_settings.outfit_tracker.userPanelColors = {
            primary: 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)',
            border: '#5da6f0',
            shadow: 'rgba(26, 120, 209, 0.4)'
        };
    }

    // Load auto outfit system settings
    if (extension_settings.outfit_tracker.autoOutfitSystem && autoOutfitSystem) {
        if (extension_settings.outfit_tracker.autoOutfitPrompt) {
            autoOutfitSystem.setPrompt(extension_settings.outfit_tracker.autoOutfitPrompt);
        }
        if (extension_settings.outfit_tracker.autoOutfitConnectionProfile) {
            autoOutfitSystem.setConnectionProfile(extension_settings.outfit_tracker.autoOutfitConnectionProfile);
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
    if (extension_settings.outfit_tracker.presets) {
        console.log('[OutfitTracker] Loading presets from settings');
    }

    // Load instances if they exist in settings
    if (extension_settings.outfit_tracker.instances) {
        console.log('[OutfitTracker] Loading bot instances from settings');
    }

    if (extension_settings.outfit_tracker.user_instances) {
        console.log('[OutfitTracker] Loading user instances from settings');
    }
}