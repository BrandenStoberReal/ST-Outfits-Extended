import { getContext, extension_settings } from "../../../extensions.js";
import { OutfitManager } from "./src/OutfitManager.js";
import { OutfitPanel } from "./src/OutfitPanel.js";

const MODULE_NAME = 'outfit_tracker';
const SLOTS = [
    'headwear',
    'topwear',
    'topunderwear',
    'bottomwear',
    'bottomunderwear',
    'footwear',
    'footunderwear'
];

let outfitManager = null;
let outfitPanel = null;

function getCharacterName() {
    const context = getContext();
    return context.characters[context.characterId]?.name || 'Unknown';
}

function initialize() {
    outfitManager = new OutfitManager(SLOTS);
    outfitPanel = new OutfitPanel(outfitManager);

    // Register panel toggle command
    registerSlashCommand('outfit', () => outfitPanel.toggle(),
        [], 'Toggle outfit tracker panel', true, true);

    // Initialize for current character
    updateForCurrentCharacter();
}

function updateForCurrentCharacter() {
    const charName = getCharacterName();
    outfitManager.setCharacter(charName);
    outfitPanel.render();
}

jQuery(async () => {
    // Initialize extension settings
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = {
            autoOpen: true,
            position: 'right'
        };
    }

    // Load UI
    initialize();

    // Watch for character changes
    const { eventSource, event_types } = getContext();
    eventSource.on(event_types.CHAT_CHANGED, updateForCurrentCharacter);

    // Auto-open if enabled
    if (extension_settings[MODULE_NAME].autoOpen) {
        setTimeout(() => outfitPanel.show(), 1000);
    }
});
