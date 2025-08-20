// index.js
import { getContext, extension_settings } from "../../../extensions.js";

// Debugging setup
console.log("[OutfitTracker] Starting extension loading...");

try {
    async function initializeExtension() {
        console.log("[OutfitTracker] Importing modules...");
        const { OutfitManager } = await import("./src/OutfitManager.js");
        const { OutfitPanel } = await import("./src/OutfitPanel.js");

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

        const outfitManager = new OutfitManager(SLOTS);
        const outfitPanel = new OutfitPanel(outfitManager);

        function getCharacterName() {
            const context = getContext();
            return context.characters[context.characterId]?.name || 'Unknown';
        }

        function registerOutfitCommand() {
            try {
                const { registerSlashCommand } = getContext();
                registerSlashCommand('outfit', () => outfitPanel.toggle(),
                    [], 'Toggle outfit tracker panel', true, true);
                console.log("[OutfitTracker] Slash command registered");
            } catch (error) {
                console.error("[OutfitTracker] Command registration failed", error);
            }
        }

        function updateForCurrentCharacter() {
            try {
                const charName = getCharacterName();
                outfitManager.setCharacter(charName);
                outfitPanel.render();
                console.log(`[OutfitTracker] Set character: ${charName}`);
            } catch (error) {
                console.error("[OutfitTracker] Character update failed", error);
            }
        }

        function setupEventListeners() {
            try {
                const { eventSource, event_types } = getContext();
                eventSource.on(event_types.CHAT_CHANGED, updateForCurrentCharacter);
                console.log("[OutfitTracker] Event listeners set up");
            } catch (error) {
                console.error("[OutfitTracker] Event listener setup failed", error);
            }
        }

        function initSettings() {
            if (!extension_settings[MODULE_NAME]) {
                extension_settings[MODULE_NAME] = {
                    autoOpen: true,
                    position: 'right'
                };
            }
        }

        initSettings();
        registerOutfitCommand();
        setupEventListeners();
        updateForCurrentCharacter();

        if (extension_settings[MODULE_NAME].autoOpen) {
            setTimeout(() => {
                try {
                    outfitPanel.show();
                    console.log("[OutfitTracker] Panel auto-opened");
                } catch (error) {
                    console.error("[OutfitTracker] Auto-open failed", error);
                }
            }, 1000);
        }
    }

    $(async () => {
        try {
            await initializeExtension();
            console.log("[OutfitTracker] Extension loaded successfully");
        } catch (error) {
            console.error("[OutfitTracker] Initialization failed", error);
        }
    });

} catch (loadingError) {
    console.error("[OutfitTracker] Critical loading error", loadingError);
}
