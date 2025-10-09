# Outfit Tracker Extension for SillyTavern

*This extension lets you keep track of what you and your AI character is wearing (or not wearing).*

<img width="402" height="1131" alt="Image" src="https://github.com/user-attachments/assets/8a7865e8-309a-4ace-ab6b-ea8c76479522" />

## Installation and Usage

### Installation

Open *Extensions*

Click *Install Extension*

Write `https://github.com/BrandenStoberReal/ST-Outfits-Extended` into the git url text field

### Usage

Use `/outfit-bot` slash command to open the AI character's outfit window.

Use `/outfit-user` slash command to open your character's outfit window.

Hold click the header part of the window and drag to position the windows as you desire.

**Important** If this is your first time using outfit system for the active character, click the refresh button on top of the outfit window to generate the variables.

### Slash Commands

The Outfit Tracker extension provides various slash commands for managing outfits:

#### Panel Control Commands
- `/outfit-bot` - Toggle the AI character's outfit window
- `/outfit-user` - Toggle the user character's outfit window

#### Auto Outfit Commands
- `/outfit-auto [on/off]` - Enable/disable auto outfit updates
- `/outfit-prompt [text]` - Set the auto outfit system prompt
- `/outfit-prompt-reset` - Reset to default system prompt
- `/outfit-prompt-view` - View current system prompt
- `/outfit-auto-trigger` - Manually trigger auto outfit check

#### Outfit Management Commands
- `/switch-outfit <name>` - Switch to a saved outfit by name
- `/import-outfit` - Import outfit from character card
- `/outfit-list` - List all available presets and current outfits

#### Outfit Preset Commands:
- `/outfit-save <name>` - Saves character outfit as a preset
  - Example: `/outfit-save casual`
- `/outfit-delete <name>` - Deletes character outfit preset
  - Example: `/outfit-delete casual`
- `/user-outfit-save <name>` - Saves user outfit as a preset
  - Example: `/user-outfit-save casual`
- `/user-outfit-delete <name>` - Deletes user outfit preset
  - Example: `/user-outfit-delete casual`

#### Mobile-Friendly Outfit Commands (for mobile users without access to panels)

##### Character Outfit Commands:
- `/outfit-wear <slot> <item>` - Sets a character outfit item
  - Example: `/outfit-wear headwear "Red Baseball Cap"`
- `/outfit-remove <slot>` - Removes a character outfit item
  - Example: `/outfit-remove topwear`
- `/outfit-change <slot> <item>` - Changes a character outfit item
  - Example: `/outfit-change topwear "Green Shirt"`

##### User Outfit Commands:
- `/user-outfit-wear <slot> <item>` - Sets a user outfit item
  - Example: `/user-outfit-wear headwear "Blue Cap"`
- `/user-outfit-remove <slot>` - Removes a user outfit item
  - Example: `/user-outfit-remove topwear`
- `/user-outfit-change <slot> <item>` - Changes a user outfit item
  - Example: `/user-outfit-change topwear "Green T-Shirt"`

##### Common Arguments
Most commands support the `-quiet` argument to suppress notifications:
- Example: `/outfit-wear headwear "Red Hat" -quiet` - Sets the character's headwear without showing a notification

### Outfit Slots

#### Clothing Slots:
- headwear
- topwear
- topunderwear
- bottomwear
- bottomunderwear
- footwear
- footunderwear

#### Accessory Slots:
- head-accessory
- ears-accessory
- eyes-accessory
- mouth-accessory
- neck-accessory
- body-accessory
- arms-accessory
- hands-accessory
- waist-accessory
- bottom-accessory
- legs-accessory
- foot-accessory

## Auto Outfit Updates
<img width="766" height="789" alt="Image" src="https://github.com/user-attachments/assets/322f485e-75bf-494c-ae71-f5201d16c1b0" />

Auto Outfit Updates is an optional feature that you can enable from Extension Settings.

When enabled, after every character response, system will perform a check and automatically wear, remove or change item slots based on what happened in last messages.

Keep in mind that the results of this feature completely depends on how smart the AI you are using is. If you are using an old, small, less smart model, AI may make mistakes and wear/remove things when it shouldn't.

Also since it performs a check after every message, you should have a decent generation speed if you don't want to wait too much between messages.

💡 **Make sure you wait for the check to finish before you say something to AI.**

💡 **AI can wear/remove/change multiple items in one turn.**

💡 **In Extension Settings window you can see the prompt system uses for performing self-check. If you don't know what you are doing, please don't change this.**

## Import Outfit from Character Card (Experimental)

The `/import-outfit` command is a powerful feature that uses LLM analysis to automatically extract outfit information from your character card. This command will:

1. Analyze character description, personality, scenario, and character notes
2. Identify clothing and accessories mentioned in the text
3. Populate the outfit tracker with these items using appropriate commands
4. Clean up the original character card by removing clothing references
5. Fix spelling and grammar errors during the cleanup process

This is especially useful when importing characters that already have outfit descriptions in their character card.

## Connection Profile Support (Experimental)

The auto outfit system now supports using different connection profiles for LLM generation. In the settings, you can specify a connection profile (like OpenRouter, Oobabooga, OpenAI, or Claude) that will be used specifically for auto outfit detection. This allows you to use a different model for outfit detection than for your main conversation if desired.

## Automatic Outfit Context Injection

The Outfit Tracker automatically injects current outfit information into the conversation context, so you don't need to manually add variables to your character card. The system intelligently includes outfit information only when outfits are actually set (non-empty), automatically removing sections that contain no clothing or accessories.

The extension uses SillyTavern's `generate_interceptor` to automatically add outfit information at the appropriate position in the conversation context. When outfits are set, they appear in the context like this:

**<BOT>'s Current Outfit**  
**Headwear:** Red Baseball Cap  
**Topwear:** Blue T-Shirt  
**Bottomwear:** Black Jeans  

**<BOT>'s Current Accessories**  
**Neck Accessory:** Gold Chain  
**Hands Accessory:** Leather Gloves  

**{{user}}'s Current Outfit**  
**Headwear:** White Sun Hat  
**Topwear:** Summer Dress  

**{{user}}'s Current Accessories**  
**Neck Accessory:** Silver Pendant  

💡 **This injection happens automatically** - no need to add any variables to your character card unless you want to reference them elsewhere in your prompt.

## Manual Variable Reference (Advanced)

If you need to manually reference outfit variables in your character card or prompts, you can use the global variable macros. The system supports the following format: `{{getglobalvar::<BOT>_slot}}` for character outfits and `{{getglobalvar::User_slot}}` for user outfits.

Write `<BOT>` for character's outfit. Instead of `<BOT>` you can also write a character's own name such as `{{getglobalvar::Emma_headwear}}`. If you set Emma's headwear as "Red Baseball Hat" then if you write `{{getglobalvar::Emma_headwear}}` to somewhere, it will appear as "Red Baseball Hat". You can simply write `<BOT>` instead of "Emma" and it'll automatically replace `<BOT>` with name of current active character. These variable macros work just like how `{{user}}` or `{{char}}` macros work.

⚠️ **Important:** The `<BOT>` placeholder in outfit display text is automatically replaced with the actual character's name during context injection. The global variable format `{{getglobalvar::<BOT>_slot}}` uses `<BOT>` as a placeholder that gets replaced with the character name during processing.

💡 **User's variable names are always the same. They always use "User_" regardless of your persona name.**

⚠️ **Important Scope Note:** The `<BOT>` placeholder replacement and global variable processing (`{{getglobalvar::*}}`) only works in conversation context and generated responses, NOT in character card fields (description, personality, scenario, etc.). For character card fields, SillyTavern's core macro system handles replacement, which processes `{{char}}`, `{{user}}`, etc., but not the extension's custom macros. Global variables will only work in character cards if SillyTavern's core macro system is configured to process them.

Additionally, the system now features an intelligent macro resolution that automatically maps these familiar variable formats to context-specific outfit instances. This means that when you use `{{getglobalvar::<BOT>_headwear}}` or a character-specific variable like `{{getglobalvar::Emma_headwear}}`, the system automatically resolves it to the appropriate outfit instance for the current conversation context. This ensures that outfits are properly tracked and maintained across different scenarios and conversation threads.

Here are the full list of available slots:

### Character Clothing Slots:
- `{{getglobalvar::<BOT>_headwear}}`
- `{{getglobalvar::<BOT>_topwear}}`
- `{{getglobalvar::<BOT>_topunderwear}}`
- `{{getglobalvar::<BOT>_bottomwear}}`
- `{{getglobalvar::<BOT>_bottomunderwear}}`
- `{{getglobalvar::<BOT>_footwear}}`
- `{{getglobalvar::<BOT>_footunderwear}}`

### Character Accessory Slots:
- `{{getglobalvar::<BOT>_head-accessory}}`
- `{{getglobalvar::<BOT>_ears-accessory}}`
- `{{getglobalvar::<BOT>_eyes-accessory}}`
- `{{getglobalvar::<BOT>_mouth-accessory}}`
- `{{getglobalvar::<BOT>_neck-accessory}}`
- `{{getglobalvar::<BOT>_body-accessory}}`
- `{{getglobalvar::<BOT>_arms-accessory}}`
- `{{getglobalvar::<BOT>_hands-accessory}}`
- `{{getglobalvar::<BOT>_waist-accessory}}`
- `{{getglobalvar::<BOT>_bottom-accessory}}`
- `{{getglobalvar::<BOT>_legs-accessory}}`
- `{{getglobalvar::<BOT>_foot-accessory}}`

### User Clothing Slots:
- `{{getglobalvar::User_headwear}}`
- `{{getglobalvar::User_topwear}}`
- `{{getglobalvar::User_topunderwear}}`
- `{{getglobalvar::User_bottomwear}}`
- `{{getglobalvar::User_bottomunderwear}}`
- `{{getglobalvar::User_footwear}}`
- `{{getglobalvar::User_footunderwear}}`

### User Accessory Slots:
- `{{getglobalvar::User_head-accessory}}`
- `{{getglobalvar::User_ears-accessory}}`
- `{{getglobalvar::User_eyes-accessory}}`
- `{{getglobalvar::User_mouth-accessory}}`
- `{{getglobalvar::User_neck-accessory}}`
- `{{getglobalvar::User_body-accessory}}`
- `{{getglobalvar::User_arms-accessory}}`
- `{{getglobalvar::User_hands-accessory}}`
- `{{getglobalvar::User_waist-accessory}}`
- `{{getglobalvar::User_bottom-accessory}}`
- `{{getglobalvar::User_legs-accessory}}`
- `{{getglobalvar::User_foot-accessory}}`

## Development

### Path Management
This extension uses a well-organized directory structure to improve maintainability:

```
src/
├── common/          # Shared utilities and common functions
├── core/            # Core business logic modules
├── managers/        # Outfit management classes
├── panels/          # UI panel implementations
├── utils/           # Utility functions
└── config/          # Configuration modules
```

A path configuration module (`src/config/paths.js`) centralizes path definitions for improved maintainability.

## License
Creative Commons Zero