import { getContext, extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

console.log("[OutfitTracker] Starting extension loading...");

async function initializeExtension() {
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

    const context = getContext();
    const { BotOutfitManager } = await import("./src/BotOutfitManager.js");
    const { BotOutfitPanel } = await import("./src/BotOutfitPanel.js");
    const { UserOutfitManager } = await import("./src/UserOutfitManager.js");
    const { UserOutfitPanel } = await import("./src/UserOutfitPanel.js");
    
    const botManager = new BotOutfitManager(SLOTS);
    const userManager = new UserOutfitManager(SLOTS);
    const botPanel = new BotOutfitPanel(botManager);
    const userPanel = new UserOutfitPanel(userManager);
    
    // Corrected slash command registration
    function registerOutfitCommands() {
        const { registerSlashCommand } = SillyTavern.getContext();
        
        // Register commands without spaces in names
        registerSlashCommand('outfit-bot', () => botPanel.toggle(),
            [], 'Toggle character outfit tracker', true, true);
            
        registerSlashCommand('outfit-user', () => userPanel.toggle(),
            [], 'Toggle user outfit tracker', true, true);
    }

    function updateForCurrentCharacter() {
        const charName = context.characters[context.characterId]?.name || 'Unknown';
        botManager.setCharacter(charName);
        botPanel.updateCharacter(charName);
    }

    function setupEventListeners() {
        const { eventSource, event_types } = context;
        eventSource.on(event_types.CHAT_CHANGED, updateForCurrentCharacter);
        eventSource.on(event_types.CHARACTER_CHANGED, updateForCurrentCharacter);
    }

    function initSettings() {
        if (!extension_settings[MODULE_NAME]) {
            extension_settings[MODULE_NAME] = {
                autoOpenBot: true,
                autoOpenUser: false,
                position: 'right',
                enableSysMessages: true
            };
        }
    }

    function createSettingsUI() {
        const settingsHtml = `
        <div class="outfit-extension-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Outfit Tracker Settings</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="flex-container">
                        <label for="outfit-sys-toggle">Enable system messages</label>
                        <input type="checkbox" id="outfit-sys-toggle"
                                ${extension_settings[MODULE_NAME].enableSysMessages ? 'checked' : ''}>
                    </div>
                    <div class="flex-container">
                        <label for="outfit-auto-bot">Auto-open character panel</label>
                        <input type="checkbox" id="outfit-auto-bot"
                                ${extension_settings[MODULE_NAME].autoOpenBot ? 'checked' : ''}>
                    </div>
                    <div class="flex-container">
                        <label for="outfit-auto-user">Auto-open user panel</label>
                        <input type="checkbox" id="outfit-auto-user"
                                ${extension_settings[MODULE_NAME].autoOpenUser ? 'checked' : ''}>
                    </div>
                </div>
            </div>
        </div>
        `;

        $("#extensions_settings").append(settingsHtml);

        $("#outfit-sys-toggle").on("input", function() {
            extension_settings[MODULE_NAME].enableSysMessages = $(this).prop('checked');
            saveSettingsDebounced();
        });
        
        $("#outfit-auto-bot").on("input", function() {
            extension_settings[MODULE_NAME].autoOpenBot = $(this).prop('checked');
            saveSettingsDebounced();
        });
        
        $("#outfit-auto-user").on("input", function() {
            extension_settings[MODULE_NAME].autoOpenUser = $(this).prop('checked');
            saveSettingsDebounced();
        });
    }

    initSettings();
    registerOutfitCommands();
    setupEventListeners();
    updateForCurrentCharacter();
    createSettingsUI();

    if (extension_settings[MODULE_NAME].autoOpenBot) {
        setTimeout(() => botPanel.show(), 1000);
    }
    
    if (extension_settings[MODULE_NAME].autoOpenUser) {
        setTimeout(() => userPanel.show(), 1000);
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
