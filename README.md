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

## List of Variables

If you take a look at the example prompt I shared above, you can see that it uses global variables such as `{{getglobalvar::<BOT>_headwear}}`. You can inject any variable stored in outfit slots anywhere you want using that macro. Write `<BOT>` for character's outfit. Write "User" for user outfit. Instead of `<BOT>` you can also write a character's own name such as `{{getglobalvar::Emma_headwear}}`. If you set Emma's headwear as "Red Baseball Hat" then if you write `{{getglobalvar::Emma_headwear}}` to somewhere, it will appear as "Red Baseball Hat". You can simply write `<BOT>` instead of "Emma" and it'll automatically replace `<BOT>` with name of current active character. These variable macros works just like how `{{user}}` or `{{char}}` macros work. Anywhere you can use those macros, you should be able to use the outfit system's macros as well. Just make sure that variable exists, or it will appear blank in the context.

💡 **User's variable names are always same. They always use "User_" regardless of your persona name.**

Here are the full list of variables you can use:

```
Character Clothing:
Headwear: {{getglobalvar::<BOT>_headwear}}
Topwear: {{getglobalvar::<BOT>_topwear}}
Top Underwear: {{getglobalvar::<BOT>_topunderwear}}
Bottomwear: {{getglobalvar::<BOT>_bottomwear}}
Bottom Underwear: {{getglobalvar::<BOT>_bottomunderwear}}
Footwear: {{getglobalvar::<BOT>_footwear}}
Foot Underwear: {{getglobalvar::<BOT>_footunderwear}}

Character Accessories:
Head Accessory: {{getglobalvar::<BOT>_head-accessory}}
Eyes Accessory: {{getglobalvar::<BOT>_ears-accessory}}
Eyes Accessory: {{getglobalvar::<BOT>_eyes-accessory}}
Mouth Accessory: {{getglobalvar::<BOT>_mouth-accessory}}
Neck Accessory: {{getglobalvar::<BOT>_neck-accessory}}
Body Accessory: {{getglobalvar::<BOT>_body-accessory}}
Arms Accessory: {{getglobalvar::<BOT>_arms-accessory}}
Hands Accessory: {{getglobalvar::<BOT>_hands-accessory}}
Waist Accessory: {{getglobalvar::<BOT>_waist-accessory}}
Bottom Accessory: {{getglobalvar::<BOT>_bottom-accessory}}
Legs Accessory: {{getglobalvar::<BOT>_legs-accessory}}
Foot Accessory: {{getglobalvar::<BOT>_foot-accessory}}

User Clothing:
Headwear: {{getglobalvar::User_headwear}}
Topwear: {{getglobalvar::User_topwear}}
Top Underwear: {{getglobalvar::User_topunderwear}}
Bottomwear: {{getglobalvar::User_bottomwear}}
Bottom Underwear: {{getglobalvar::User_bottomunderwear}}
Footwear: {{getglobalvar::User_footwear}}
Foot Underwear: {{getglobalvar::User_footunderwear}}

User Accessories:
Head Accessory: {{getglobalvar::User_head-accessory}}
Eyes Accessory: {{getglobalvar::User_ears-accessory}}
Eyes Accessory: {{getglobalvar::User_eyes-accessory}}
Mouth Accessory: {{getglobalvar::User_mouth-accessory}}
Neck Accessory: {{getglobalvar::User_neck-accessory}}
Body Accessory: {{getglobalvar::User_body-accessory}}
Arms Accessory: {{getglobalvar::User_arms-accessory}}
Hands Accessory: {{getglobalvar::User_hands-accessory}}
Waist Accessory: {{getglobalvar::User_waist-accessory}}
Bottom Accessory: {{getglobalvar::User_bottom-accessory}}
Legs Accessory: {{getglobalvar::User_legs-accessory}}
Foot Accessory: {{getglobalvar::User_foot-accessory}}
```

## License
Creative Commons Zero