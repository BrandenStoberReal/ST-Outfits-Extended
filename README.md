# Outfit Tracker Extension for SillyTavern

*This extension lets you keep track of what is you and your AI character is wearing (or not wearing).*

<img width="758" height="1133" alt="Image" src="https://github.com/user-attachments/assets/9510c1af-ba34-417f-9768-a9ea7703cb2b" />

## Installation and Usage

### Installation

Open *Extensions*

Click *Install Extension*

Write `https://github.com/lannashelton/ST-Outfits/` into the git url text field


### Usage

Use `/outfit-bot` slash command to open the AI character's outfit window.

Use `/outfit-user` slash command to open your character's outfit window.

Hold click and drag the windows to position them as you desire.

If this is your first time using outfit system for the active character, click the refresh button on top of the outfit window to generate the variables.

Add this prompt into your Character Description or Author's Notes or World Info Entry (depending on how you prefer to prompt AI) to let AI see the current outfit.

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

If you want system messages to appear after changing clothes, enable system messages option under "Extensions -> Outfit Tracker Settings"

If you want to remove a clothing, enter "remove" or "None" as clothing name.

### Planned Features
- Background of control windows are currently transparent and it makes it difficult to read in non-plain backgrounds. Will add solid backgrounds to windows.
- Will add a button to let AI auto-fill their outfit slots based on what they are wearing.
- Will add Accessorry Slots. This slots will be for things such as glasses, necklaces, backpacks, belts etc. This accessory slots can also be used for bondage items such as ball gags, blindfolds, restraints etc.
- Will add a "Save Current Outfit" button for creating outfit presets and quickly switch between saved outfits.

## License

Creative Commons Zero
