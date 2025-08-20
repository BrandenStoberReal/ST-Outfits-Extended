# Outfit Tracker Extension for SillyTavern

*This extension lets you keep track of what is your AI character is wearing (or not wearing).*

## Installation and Usage

### Installation

*Install using ST's inbuilt extension installer.* 

### Usage

Use `/outfit` slash command to open the outfit window.

Add this section into your Character Description or Author's Notes or World Info Entry (depending on how you prefer to prompt AI) to let AI see the current outfit.

```
**<BOT>'s Current Outfit**
**Headwear:** {{getglobalvar::<BOT>_headwear}}
**Topwear:** {{getglobalvar::<BOT>_topwear}}
**Top Underwear:** {{getglobalvar::<BOT>_topunderwear}}
**Bottomwear:** {{getglobalvar::<BOT>_bottomwear}}
**Bottom Underwear:** {{getglobalvar::<BOT>_bottomunderwear}}
**Footwear:** {{getglobalvar::<BOT>_footwear}}
**Foot Underwear:** {{getglobalvar::<BOT>_footunderwear}}
```

## License

Creative Commons Zero
