# Outfit Tracker Extension for SillyTavern

*This extension lets you keep track of what is your AI character is wearing (or not wearing).*

<img width="386" height="1212" alt="Image" src="https://github.com/user-attachments/assets/af3bead4-23a9-44f6-bd55-96786ba4a3cf" />

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

## License

Creative Commons Zero
