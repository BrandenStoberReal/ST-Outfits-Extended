import { DEFAULT_SETTINGS } from '../config/constants';
import { debugLog } from '../logging/DebugLogger';
export function initSettings(autoOutfitSystem, AutoOutfitSystemClass, context) {
    const settings = context.extensionSettings;
    const MODULE_NAME = 'outfit_tracker';
    if (!settings[MODULE_NAME]) {
        settings[MODULE_NAME] = Object.assign({}, DEFAULT_SETTINGS);
    }
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (settings[MODULE_NAME][key] === undefined) {
            settings[MODULE_NAME][key] = value;
        }
    }
    if (!settings[MODULE_NAME].botPanelColors) {
        settings[MODULE_NAME].botPanelColors = {
            primary: 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)',
            border: '#8a7fdb',
            shadow: 'rgba(106, 79, 193, 0.4)'
        };
    }
    if (!settings[MODULE_NAME].userPanelColors) {
        settings[MODULE_NAME].userPanelColors = {
            primary: 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)',
            border: '#5da6f0',
            shadow: 'rgba(26, 120, 209, 0.4)'
        };
    }
    if (settings[MODULE_NAME].autoOutfitSystem && autoOutfitSystem) {
        if (settings[MODULE_NAME].autoOutfitPrompt) {
            autoOutfitSystem.setPrompt(settings[MODULE_NAME].autoOutfitPrompt);
        }
        if (settings[MODULE_NAME].autoOutfitConnectionProfile) {
            autoOutfitSystem.setConnectionProfile(settings[MODULE_NAME].autoOutfitConnectionProfile);
        }
        setTimeout(() => {
            autoOutfitSystem.enable();
        }, 1000);
    }
    else if (autoOutfitSystem) {
        autoOutfitSystem.disable();
    }
    if (settings[MODULE_NAME].presets) {
        debugLog('[OutfitTracker] Loading presets from settings', null, 'info');
    }
    if (settings[MODULE_NAME].instances) {
        debugLog('[OutfitTracker] Loading bot instances from settings', null, 'info');
    }
    if (settings[MODULE_NAME].user_instances) {
        debugLog('[OutfitTracker] Loading user instances from settings', null, 'info');
    }
}
