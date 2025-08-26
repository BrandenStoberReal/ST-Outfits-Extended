# Outfit Tracker Extension for SillyTavern

*This extension lets you keep track of what you and your AI character is wearing (or not wearing).*

<img width="402" height="1131" alt="Image" src="https://github.com/user-attachments/assets/8a7865e8-309a-4ace-ab6b-ea8c76479522" />

## Installation and Usage

### Installation

Open *Extensions*

Click *Install Extension*

Write `https://github.com/lannashelton/ST-Outfits/` into the git url text field

### Usage

Use `/outfit-bot` slash command to open the AI character's outfit window.

Use `/outfit-user` slash command to open your character's outfit window.

Hold click the header part of the window and drag to position the windows as you desire.

**Important** If this is your first time using outfit system for the active character, click the refresh button on top of the outfit window to generate the variables.

Add a prompt like this into your Character Description or Author's Notes or World Info Entry (depending on how you prefer to prompt AI) to let AI see the current outfit. (*Personally I prefer to add this as Character Notes as System Role and Depth 1. If you inject this at top of the context, each time you change your outfit, AI will have to process whole context. If you are using Api models, you don't have to worry about it, but if you are using local models, you may want to use this trick to keep context cache intact.)

```
**<BOT>'s Current Outfit**
**Headwear:** {{getglobalvar::<BOT>_headwear}}
**Topwear:** {{getglobalvar::<BOT>_topwear}}
**Top Underwear:** {{getglobalvar::<BOT>_topunderwear}}
**Bottomwear:** {{getglobalvar::<BOT>_bottomwear}}
**Bottom Underwear:** {{getglobalvar::<BOT>_bottomunderwear}}
**Footwear:** {{getglobalvar::<BOT>_footwear}}
**Foot Underwear:** {{getglobalvar::<BOT>_footunderwear}}

**{{user}}'s Current Outfit**
**Headwear:** {{getglobalvar::User_headwear}}
**Topwear:** {{getglobalvar::User_topwear}}
**Top Underwear:** {{getglobalvar::User_topunderwear}}
**Bottomwear:** {{getglobalvar::User_bottomwear}}
**Bottom Underwear:** {{getglobalvar::User_bottomunderwear}}
**Footwear:** {{getglobalvar::User_footwear}}
**Foot Underwear:** {{getglobalvar::User_footunderwear}}
```

*Note: This prompt doesn't include accessory slots. If you want to use accessory slots as well, please add them using the variables I've shared below.*

**Keep in mind, you don't have to use every variable or slot exists.** For example if you don't care what kind of underwear or socks you or your character wears, you can just use "Headwear", "Topwear", "Bottomwear" and "Footwear" to keep things simple. You can make your outfit prompt as complex or simple as you want. You should only use the slots you want to use. However AI can only see the things you show it in the prompt. The prompt piece I shared above is just a guideline. You can get creative and use the variables this system creates however you find useful and personalize your outfit prompt as you like.

If you want system messages to appear after changing clothes, enable system messages option under "Extensions -> Outfit Tracker Settings". There are also settings to automatically open windows when you start SillyTavern if you don't want to use commands every time.

If you want to remove a clothing, enter "remove" or "None" as clothing name.

**Clothing**
- This page has Headwear, Topwear, TopUnderwear, Bottomwear, BottomUnderwear, Footwear and FootUnderwear slots.
- This is the main outfit page.

**Accessories**
- This page has head-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory and foot-accessory slots.
- You can use these for things like glasses on "eyes-accessory" or backpack on "body-accessory".
- You can also use these for bondage such as "blindfold" on "eyes-accessory" or "black cuffs (chained together)" on "hands-accessory" etc.

**Outfits**
- Here you can *Save Current Outfit*, *Wear a Saved Outfit* or *Delete a Saved Outfit*

## List of Variables
If you take a look at the example prompt I shared above, you can see that it uses global variables such as `{{getglobalvar::<BOT>_headwear}}`. You can inject any variable stored in outfit slots anywhere you want using that macro. Write `<BOT>` for character's outfit. Write "User" for user outfit. Instead of `<BOT>` you can also write a character's own name such as `{{getglobalvar::Emma_headwear}}`. If you set Emma's headwear as "Red Baseball Hat" then if you write `{{getglobalvar::Emma_headwear}}` to somewhere, it will appear as "Red Baseball Hat". You can simply write `<BOT>` instead of "Emma" and it'll automatically replace `<BOT>` with name of current active character. These variable macros works just like how `{{user}}` or `{{char}}` macros work. Anywhere you can use those macros, you should be able to use the outfit system's macros as well. Just make sure that variable exists, or it will appear blank in the context.

**User's variable names are always same. They always use "User_" regardless of your persona name.**

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
