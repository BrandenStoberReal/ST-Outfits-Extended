# 🎽 Outfit Tracker Extension for SillyTavern

*Keep track of what you and your AI character are wearing (or not wearing) with this comprehensive outfit management
system.*

<div align="center">
  <img width="402" height="1131" alt="Extension UI Screenshot" src="https://github.com/user-attachments/assets/8a7865e8-309a-4ace-ab6b-ea8c76479522" />
  <br>
  <p><em>Track and manage outfits for both you and your AI characters</em></p>
</div>

## 🚀 Quick Start

### Installation

1. Open the *Extensions* tab in SillyTavern
2. Click *Install Extension*
3. Enter the following URL in the Git URL field:
   ```text
   https://github.com/BrandenStoberReal/ST-Outfits-Extended
   ```

### Basic Usage

| Command        | Description                               |
|----------------|-------------------------------------------|
| `/outfit-bot`  | Toggle the AI character's outfit window   |
| `/outfit-user` | Toggle the user character's outfit window |

> 💡 **Tip:** Hold click the header part of the window and drag to position the windows as you desire.

> ⚠️ **Important:** If this is your first time using the outfit system for the active character, click the refresh
> button on top of the outfit window to generate the variables.

## 📋 Slash Commands

The Outfit Tracker extension provides comprehensive slash commands for managing outfits:

### 🖥️ Panel Control Commands

| Command        | Description                               |
|----------------|-------------------------------------------|
| `/outfit-bot`  | Toggle the AI character's outfit window   |
| `/outfit-user` | Toggle the user character's outfit window |

### 🤖 Auto Outfit Commands

| Command                 | Description                        |
|-------------------------|------------------------------------|
| `/outfit-auto [on/off]` | Enable/disable auto outfit updates |
| `/outfit-prompt [text]` | Set the auto outfit system prompt  |
| `/outfit-prompt-reset`  | Reset to default system prompt     |
| `/outfit-prompt-view`   | View current system prompt         |
| `/outfit-auto-trigger`  | Manually trigger auto outfit check |

### 👕 Outfit Management Commands

| Command                 | Description                                    |
|-------------------------|------------------------------------------------|
| `/switch-outfit <name>` | Switch to a saved outfit by name               |
| `/import-outfit`        | Import outfit from character card              |
| `/outfit-list`          | List all available presets and current outfits |

### 🗃️ Outfit Preset Commands

| Command                      | Description                        | Example                      |
|------------------------------|------------------------------------|------------------------------|
| `/outfit-save <name>`        | Saves character outfit as a preset | `/outfit-save casual`        |
| `/outfit-delete <name>`      | Deletes character outfit preset    | `/outfit-delete casual`      |
| `/user-outfit-save <name>`   | Saves user outfit as a preset      | `/user-outfit-save casual`   |
| `/user-outfit-delete <name>` | Deletes user outfit preset         | `/user-outfit-delete casual` |

### 📱 Mobile-Friendly Outfit Commands

For mobile users without access to panels.

#### Character Outfit Commands:

| Command                        | Description                     | Example                                    |
|--------------------------------|---------------------------------|--------------------------------------------|
| `/outfit-wear <slot> <item>`   | Sets a character outfit item    | `/outfit-wear headwear "Red Baseball Cap"` |
| `/outfit-remove <slot>`        | Removes a character outfit item | `/outfit-remove topwear`                   |
| `/outfit-change <slot> <item>` | Changes a character outfit item | `/outfit-change topwear "Green Shirt"`     |

#### User Outfit Commands:

| Command                             | Description                | Example                                       |
|-------------------------------------|----------------------------|-----------------------------------------------|
| `/user-outfit-wear <slot> <item>`   | Sets a user outfit item    | `/user-outfit-wear headwear "Blue Cap"`       |
| `/user-outfit-remove <slot>`        | Removes a user outfit item | `/user-outfit-remove topwear`                 |
| `/user-outfit-change <slot> <item>` | Changes a user outfit item | `/user-outfit-change topwear "Green T-Shirt"` |

#### Common Arguments

Most commands support the `-quiet` argument to suppress notifications:

- Example: `/outfit-wear headwear "Red Hat" -quiet` - Sets the character's headwear without showing a notification

## 👗 Outfit Slots

The extension supports comprehensive outfit tracking with two main categories:

### 🧥 Clothing Slots

| Slot Name         | Description                 |
|-------------------|-----------------------------|
| `headwear`        | Hats, caps, helmets, etc.   |
| `topwear`         | Shirts, tops, jackets, etc. |
| `topunderwear`    | Under-shirts, bras, etc.    |
| `bottomwear`      | Pants, skirts, shorts, etc. |
| `bottomunderwear` | Underwear, panties, etc.    |
| `footwear`        | Shoes, boots, sandals, etc. |
| `footunderwear`   | Socks, stockings, etc.      |

### ✨ Accessory Slots

| Slot Name          | Description                       |
|--------------------|-----------------------------------|
| `head-accessory`   | Hair accessories, headbands, etc. |
| `ears-accessory`   | Earrings, ear cuffs, etc.         |
| `eyes-accessory`   | Glasses, contact lenses, etc.     |
| `mouth-accessory`  | Lipstick, mouthpieces, etc.       |
| `neck-accessory`   | Necklaces, scarves, etc.          |
| `body-accessory`   | Body chains, body paint, etc.     |
| `arms-accessory`   | Arm bands, sleeves, etc.          |
| `hands-accessory`  | Gloves, rings, nail polish, etc.  |
| `waist-accessory`  | Belts, sashes, etc.               |
| `bottom-accessory` | Leg chains, garters, etc.         |
| `legs-accessory`   | Leg warmers, leg bands, etc.      |
| `foot-accessory`   | Anklets, toe rings, etc.          |

## 🤖 Auto Outfit Updates

<div align="center">
  <img width="766" height="789" alt="Auto Outfit Feature Screenshot" src="https://github.com/user-attachments/assets/322f485e-75bf-494c-ae71-f5201d16c1b0" />
</div>

Auto Outfit Updates is an optional feature that you can enable from Extension Settings.

When enabled, after every character response, system will perform a check and automatically wear, remove or change item
slots based on what happened in last messages.

> ⚠️ Keep in mind that the results of this feature completely depends on how smart the AI you are using is. If you are
> using
> an old, small, less smart model, AI may make mistakes and wear/remove things when it shouldn't.

> ⚠️ Also since it performs a check after every message, you should have a decent generation speed if you don't want to
> wait
> too much between messages.

#### 💡 Tips:

- Make sure you wait for the check to finish before you say something to AI.
- AI can wear/remove/change multiple items in one turn.
- In Extension Settings window you can see the prompt system uses for performing self-check. If you don't know what
  you are doing, please don't change this.

## 📤 Import Outfit from Character Card (Experimental)

The `/import-outfit` command is a powerful feature that uses LLM analysis to automatically extract outfit information
from your character card. This command will:

1. 🔍 Analyze character description, personality, scenario, and character notes
2. 👕 Identify clothing and accessories mentioned in the text
3. 📦 Populate the outfit tracker with these items using appropriate commands
4. 🧹 Clean up the original character card by removing clothing references
5. ✅ Fix spelling and grammar errors during the cleanup process

This is especially useful when importing characters that already have outfit descriptions in their character card.

## 🌐 Connection Profile Support (Experimental)

The auto outfit system now supports using different connection profiles for LLM generation. In the settings, you can
specify a connection profile (like OpenRouter, Oobabooga, OpenAI, or Claude) that will be used specifically for auto
outfit detection. This allows you to use a different model for outfit detection than for your main conversation if
desired.

## 🔌 Automatic Outfit Context Injection

The Outfit Tracker automatically injects current outfit information into the conversation context, so you don't need to
manually add variables to your character card. The system intelligently includes outfit information only when outfits
are actually set (non-empty), automatically removing sections that contain no clothing or accessories.

The extension uses SillyTavern's `generate_interceptor` to automatically add outfit information at the appropriate
position in the conversation context. When outfits are set, they appear in the context like this:

```
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
```

> 💡 **This injection happens automatically** - no need to add any variables to your character card unless you want to
> reference them elsewhere in your prompt.

## 🏷️ Manual Variable Reference (Advanced)

If you need to manually reference outfit variables in your character card or prompts, you can use the global variable
macros. The system supports the following format: `{{getglobalvar::<BOT>_slot}}` for character outfits and
`{{getglobalvar::User_slot}}` for user outfits.

Write `<BOT>` for character's outfit. Instead of `<BOT>` you can also write a character's own name such as
`{{getglobalvar::Emma_headwear}}`. If you set Emma's headwear as "Red Baseball Hat" then if you write
`{{getglobalvar::Emma_headwear}}` to somewhere, it will appear as "Red Baseball Hat". You can simply write `<BOT>`
instead of "Emma" and it'll automatically replace `<BOT>` with name of current active character. These variable macros
work just like how `{{user}}` or `{{char}}` macros work.

> ⚠️ **Important:** The `<BOT>` placeholder in outfit display text is automatically replaced with the actual character's
> name during context injection. The global variable format `{{getglobalvar::<BOT>_slot}}` uses `<BOT>` as a placeholder
> that gets replaced with the character name during processing.

> 💡 **User's variable names are always the same. They always use "User_" regardless of your persona name.**

> ⚠️ **Important Scope Note:** The `<BOT>` placeholder replacement and global variable processing (
`{{getglobalvar::*}}`)
> only works in conversation context and generated responses, NOT in character card fields (description, personality,
> scenario, etc.). For character card fields, SillyTavern's core macro system handles replacement, which processes
> `{{char}}`, `{{user}}`, etc., but not the extension's custom macros. Global variables will only work in character
> cards
> if SillyTavern's core macro system is configured to process them.

Additionally, the system now features an intelligent macro resolution that automatically maps these familiar variable
formats to context-specific outfit instances. This means that when you use `{{getglobalvar::<BOT>_headwear}}` or a
character-specific variable like `{{getglobalvar::Emma_headwear}}`, the system automatically resolves it to the
appropriate outfit instance for the current conversation context. This ensures that outfits are properly tracked and
maintained across different scenarios and conversation threads.

### Character Clothing Slots

| Variable                                  | Description                      |
|-------------------------------------------|----------------------------------|
| `{{getglobalvar::<BOT>_headwear}}`        | Character's headwear             |
| `{{getglobalvar::<BOT>_topwear}}`         | Character's top clothing         |
| `{{getglobalvar::<BOT>_topunderwear}}`    | Character's top undergarments    |
| `{{getglobalvar::<BOT>_bottomwear}}`      | Character's bottom clothing      |
| `{{getglobalvar::<BOT>_bottomunderwear}}` | Character's bottom undergarments |
| `{{getglobalvar::<BOT>_footwear}}`        | Character's footwear             |
| `{{getglobalvar::<BOT>_footunderwear}}`   | Character's foot undergarments   |

### Character Accessory Slots

| Variable                                   | Description                    |
|--------------------------------------------|--------------------------------|
| `{{getglobalvar::<BOT>_head-accessory}}`   | Character's head accessories   |
| `{{getglobalvar::<BOT>_ears-accessory}}`   | Character's ear accessories    |
| `{{getglobalvar::<BOT>_eyes-accessory}}`   | Character's eye accessories    |
| `{{getglobalvar::<BOT>_mouth-accessory}}`  | Character's mouth accessories  |
| `{{getglobalvar::<BOT>_neck-accessory}}`   | Character's neck accessories   |
| `{{getglobalvar::<BOT>_body-accessory}}`   | Character's body accessories   |
| `{{getglobalvar::<BOT>_arms-accessory}}`   | Character's arm accessories    |
| `{{getglobalvar::<BOT>_hands-accessory}}`  | Character's hand accessories   |
| `{{getglobalvar::<BOT>_waist-accessory}}`  | Character's waist accessories  |
| `{{getglobalvar::<BOT>_bottom-accessory}}` | Character's bottom accessories |
| `{{getglobalvar::<BOT>_legs-accessory}}`   | Character's leg accessories    |
| `{{getglobalvar::<BOT>_foot-accessory}}`   | Character's foot accessories   |

### User Clothing Slots

| Variable                                 | Description                 |
|------------------------------------------|-----------------------------|
| `{{getglobalvar::User_headwear}}`        | User's headwear             |
| `{{getglobalvar::User_topwear}}`         | User's top clothing         |
| `{{getglobalvar::User_topunderwear}}`    | User's top undergarments    |
| `{{getglobalvar::User_bottomwear}}`      | User's bottom clothing      |
| `{{getglobalvar::User_bottomunderwear}}` | User's bottom undergarments |
| `{{getglobalvar::User_footwear}}`        | User's footwear             |
| `{{getglobalvar::User_footunderwear}}`   | User's foot undergarments   |

### User Accessory Slots

| Variable                                  | Description               |
|-------------------------------------------|---------------------------|
| `{{getglobalvar::User_head-accessory}}`   | User's head accessories   |
| `{{getglobalvar::User_ears-accessory}}`   | User's ear accessories    |
| `{{getglobalvar::User_eyes-accessory}}`   | User's eye accessories    |
| `{{getglobalvar::User_mouth-accessory}}`  | User's mouth accessories  |
| `{{getglobalvar::User_neck-accessory}}`   | User's neck accessories   |
| `{{getglobalvar::User_body-accessory}}`   | User's body accessories   |
| `{{getglobalvar::User_arms-accessory}}`   | User's arm accessories    |
| `{{getglobalvar::User_hands-accessory}}`  | User's hand accessories   |
| `{{getglobalvar::User_waist-accessory}}`  | User's waist accessories  |
| `{{getglobalvar::User_bottom-accessory}}` | User's bottom accessories |
| `{{getglobalvar::User_legs-accessory}}`   | User's leg accessories    |
| `{{getglobalvar::User_foot-accessory}}`   | User's foot accessories   |

## 👨‍💻 Development

### Project Structure

This extension follows a modular architecture with a well-organized directory structure for improved maintainability:

```
ST-Outfits-Extended/
├── index.js                 # Main extension entry point
├── manifest.json           # Extension metadata and configuration
├── package.json           # NPM package configuration
├── style.css              # UI styling for outfit panels
├── src/                   # Source code
│   ├── common/            # Shared utilities and common functions
│   ├── config/            # Configuration modules
│   ├── core/              # Core business logic
│   ├── managers/          # Outfit management classes
│   ├── panels/            # UI panel implementations
│   ├── services/          # Service classes
│   └── utils/             # Utility functions
├── tests/                 # Test files
└── node_modules/          # NPM dependencies
```

### Development Setup

1. Clone the repository to your SillyTavern extensions directory
2. Install dependencies: `npm install`
3. Make changes to the source files in the `/src` directory
4. Use `npm run lint` to check code quality
5. Use `npm test` to run tests

### 🧪 Testing

The project includes a comprehensive testing suite using Jest. The tests handle the
browser-dependent nature of the SillyTavern extension:

- ✅ Tests for utility functions (validation, string processing)
- ✅ Tests for the Outfit Store state management system
- ✅ Mock-based tests for extension initialization
- ✅ Jest configuration with jsdom environment
- ✅ Mock implementations of browser APIs and SillyTavern context

| Command                 | Description                    |
|-------------------------|--------------------------------|
| `npm test`              | Run all tests                  |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:watch`    | Run tests in watch mode        |

The tests are located in the `tests/` directory and include setup files that mock the SillyTavern context and browser
APIs.

### 🧹 Linting

ESLint is used for code quality checks and style enforcement. The project follows recommended ESLint rules
with additional custom configurations:

- ✅ Indentation with 4 spaces
- ✅ Single quotes for strings
- ✅ Semicolons required
- ✅ Line breaks in Windows style
- ✅ Function and variable naming conventions
- ✅ No unused variables allowed
- ✅ Consistent code style enforcement

| Command            | Description                        |
|--------------------|------------------------------------|
| `npm run lint`     | Run the linter to check for issues |
| `npm run lint:fix` | Automatically fix linting issues   |

The linting configuration is defined in `.eslintrc.json` and covers all JavaScript files in the `src/`
directory and the main `index.js` file.

### Developer Documentation

For more detailed information about the internal systems, please see the following documentation:

- **[Auto Outfit System](src/core/README.md)**: Describes the system for automatically detecting and applying outfit
  changes
- **[Custom Macro System](src/utils/README.md)**: Explains the custom macro format and how it's used to inject outfit
  data

## 📄 License

This project is licensed under Creative Commons Zero (CC0) - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**SillyTavern Outfit Engine** - Developed with ❤️ for the SillyTavern community

[Back to Top](#-outfit-tracker-extension-for-sillytavern)

</div>