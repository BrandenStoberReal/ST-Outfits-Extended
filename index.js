import { getContext, extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

console.log("[OutfitTracker] Starting extension loading...");

async function initializeExtension() {
    const MODULE_NAME = 'outfit_tracker';
    const CLOTHING_SLOTS = [
        'headwear',
        'topwear',
        'topunderwear',
        'bottomwear',
        'bottomunderwear',
        'footwear',
        'footunderwear'
    ];
    
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

    const { BotOutfitManager } = await import("./src/BotOutfitManager.js");
    const { BotOutfitPanel } = await import("./src/BotOutfitPanel.js");
    const { UserOutfitManager } = await import("./src/UserOutfitManager.js");
    const { UserOutfitPanel } = await import("./src/UserOutfitPanel.js");
    const { AutoOutfitSystem } = await import("./src/AutoOutfitSystem.js");
    
    const botManager = new BotOutfitManager([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
    const userManager = new UserOutfitManager([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
    const botPanel = new BotOutfitPanel(botManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, saveSettingsDebounced);
    const userPanel = new UserOutfitPanel(userManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, saveSettingsDebounced);
    const autoOutfitSystem = new AutoOutfitSystem(botManager);
    
    // Store panels globally for access in other functions
    window.botOutfitPanel = botPanel;
    window.userOutfitPanel = userPanel;
    window.autoOutfitSystem = autoOutfitSystem;
    
    function registerOutfitCommands() {
        const { registerSlashCommand } = SillyTavern.getContext();
        
        registerSlashCommand('outfit-bot', (...args) => {
            console.log("Bot Outfit command triggered");
            botPanel.toggle();
        }, [], 'Toggle character outfit tracker', true, true);
            
        registerSlashCommand('outfit-user', (...args) => {
            console.log("User Outfit command triggered");
            userPanel.toggle();
        }, [], 'Toggle user outfit tracker', true, true);
        
        registerSlashCommand('outfit-auto', (...args) => {
            if (args[0] === 'on') {
                const message = autoOutfitSystem.enable();
                if (extension_settings.outfit_tracker?.enableSysMessages) {
                    botPanel.sendSystemMessage(message);
                }
            } else if (args[0] === 'off') {
                const message = autoOutfitSystem.disable();
                if (extension_settings.outfit_tracker?.enableSysMessages) {
                    botPanel.sendSystemMessage(message);
                }
            } else {
                const status = autoOutfitSystem.getStatus();
                toastr.info(`Auto outfit: ${status.enabled ? 'ON' : 'OFF'}\nPrompt: ${status.hasPrompt ? 'SET' : 'NOT SET'}`);
            }
        }, [], 'Toggle auto outfit updates (on/off)', true, true);
        
        registerSlashCommand('outfit-prompt', (...args) => {
            const prompt = args.join(' ');
            if (prompt) {
                const message = autoOutfitSystem.setPrompt(prompt);
                if (extension_settings.outfit_tracker?.enableSysMessages) {
                    botPanel.sendSystemMessage(message);
                }
            } else {
                toastr.info('Current prompt length: ' + (autoOutfitSystem.systemPrompt?.length || 0));
            }
        }, [], 'Set auto outfit system prompt', true, true);
    }

    function updateForCurrentCharacter() {
        const context = getContext();
        const charName = context.characters[context.characterId]?.name || 'Unknown';
        botManager.setCharacter(charName);
        botPanel.updateCharacter(charName);
    }

    function setupEventListeners() {
        const context = getContext();
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
                enableSysMessages: true,
                autoOutfitSystem: false,
                autoOutfitPrompt: '',
                presets: {
                    bot: {},
                    user: {}
                }
            };
        }
        
        // Initialize auto outfit system with saved settings
        if (extension_settings[MODULE_NAME].autoOutfitPrompt) {
            autoOutfitSystem.setPrompt(extension_settings[MODULE_NAME].autoOutfitPrompt);
        }
        
        if (extension_settings[MODULE_NAME].autoOutfitSystem) {
            autoOutfitSystem.enable();
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
                    <div class="flex-container">
                        <label for="outfit-auto-system">Enable auto outfit updates</label>
                        <input type="checkbox" id="outfit-auto-system"
                                ${extension_settings[MODULE_NAME].autoOutfitSystem ? 'checked' : ''}>
                    </div>
                    <div class="flex-container">
                        <label for="outfit-prompt-input">System Prompt:</label>
                        <textarea id="outfit-prompt-input" rows="4" placeholder="Enter system prompt for auto outfit detection">${extension_settings[MODULE_NAME].autoOutfitPrompt || ''}</textarea>
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
        
        $("#outfit-auto-system").on("input", function() {
            extension_settings[MODULE_NAME].autoOutfitSystem = $(this).prop('checked');
            if ($(this).prop('checked')) {
                autoOutfitSystem.enable();
            } else {
                autoOutfitSystem.disable();
            }
            saveSettingsDebounced();
        });

        $("#outfit-prompt-input").on("change", function() {
            extension_settings[MODULE_NAME].autoOutfitPrompt = $(this).val();
            autoOutfitSystem.setPrompt($(this).val());
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
