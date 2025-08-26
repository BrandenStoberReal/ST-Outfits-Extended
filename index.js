import { getContext, extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

console.log("[OutfitTracker] Starting extension loading...");

// Get the absolute base path for this extension
function getExtensionBasePath() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src && src.includes('ST-Outfits/index.js')) {
            const path = src.substring(0, src.lastIndexOf('/'));
            console.log(`Extension base path: ${path}`);
            return path;
        }
    }
    console.warn("Could not determine extension base path, using fallback");
    return ''; // Fallback
}

const moduleName = 'outfit_tracker';
const EXTENSION_BASE = getExtensionBasePath();

try {
    // Import all dependencies at the top level
    import(`${EXTENSION_BASE}/src/BotOutfitManager.js`)
        .then(module => window.BotOutfitManager = module.BotOutfitManager);
    
    import(`${EXTENSION_BASE}/src/BotOutfitPanel.js`)
        .then(module => window.BotOutfitPanel = module.BotOutfitPanel);
    
    import(`${EXTENSION_BASE}/src/UserOutfitManager.js`)
        .then(module => window.UserOutfitManager = module.UserOutfitManager);
    
    import(`${EXTENSION_BASE}/src/UserOutfitPanel.js`)
        .then(module => window.UserOutfitPanel = module.UserOutfitPanel);
    
    console.log("JS modules successfully imported");
} catch (error) {
    console.error("Failed to import JS modules:", error);
}

async function initializeExtension() {
    const CLOTHING_SLOTS = [
        'headwear',
        'topwear',
        'topunderwear',
        'bottomwear',
        'bottomunderwear',
        'footwear',
        'footunderwear'
    ];

    // Updated detailed accessory slots
    const ACCESSORY_SLOTS = [
        'head-accessory',
        'eyes-accessory',
        'mouth-accessory',
        'neck-accessory',
        'body-accessory',
        'arms-accessory',
        'hands-accessory',
        'waist-accessory',
        'bottom-accessory',
        'legs-accessory',
        'foot-accessory'
    ];

    console.log("Creating managers and panels...");
    const botManager = new BotOutfitManager(CLOTHING_SLOTS, ACCESSORY_SLOTS);
    const userManager = new UserOutfitManager(CLOTHING_SLOTS, ACCESSORY_SLOTS);
    const botPanel = new BotOutfitPanel(botManager);
    const userPanel = new UserOutfitPanel(userManager);
    
    function registerOutfitCommands() {
        const { registerSlashCommand } = SillyTavern.getContext();
        
        registerSlashCommand('outfit-bot', () => {
            console.log("Bot Outfit command triggered");
            botPanel.toggle();
        }, [], 'Toggle character outfit tracker', true, true);
            
        registerSlashCommand('outfit-user', () => {
            console.log("User Outfit command triggered");
            userPanel.toggle();
        }, [], 'Toggle user outfit tracker', true, true);
    }

    function updateForCurrentCharacter() {
        const context = getContext();
        const charName = context.characters[context.characterId]?.name || 'Unknown';
        console.log(`Updating for character: ${charName}`);
        botManager.setCharacter(charName);
        botPanel.updateCharacter(charName);
    }

    function setupEventListeners() {
        const context = getContext();
        const { eventSource, event_types } = context;
        eventSource.on(event_types.CHAT_CHANGED, updateForCurrentCharacter);
        eventSource.on(event_types.CHARACTER_CHANGED, updateForCurrentCharacter);
        console.log("Event listeners set up");
    }

    function initSettings() {
        if (!extension_settings[MODULE_NAME]) {
            extension_settings[MODULE_NAME] = {
                autoOpenBot: true,
                autoOpenUser: false,
                position: 'right',
                enableSysMessages: true,
                bot_presets: {},
                user_presets: {}
            };
            console.log("Initialized new settings");
        } else {
            console.log("Loaded existing settings");
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
        console.log("Settings UI created");

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

    // Initialize core functions
    console.log("Initializing extension with logging...");
    initSettings();
    registerOutfitCommands();
    setupEventListeners();
    updateForCurrentCharacter();
    createSettingsUI();

    // Show panels if enabled
    if (extension_settings[moduleName].autoOpenBot) {
        botPanel.show();
    }
    
    if (extension_settings[moduleName].autoOpenUser) {
        userPanel.show();
    }
    console.log("Initialization complete");
}

$(async () => {
    try {
        console.log("[OutfitTracker] Starting initialization...");
        await initializeExtension();
        console.log("[OutfitTracker] Extension loaded successfully");
    } catch (error) {
        console.error("[OutfitTracker] Initialization failed", error);
        // Show error to user
        toastr.error("Outfit Tracker failed to load. Check console for details.");
    }
});
