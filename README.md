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

## 🏷️ Custom Macro System (Advanced)

The extension now uses a custom macro system that replaces the legacy global variable approach. Instead of using
`{{getglobalvar::<BOT>_slot}}` format, the system registers custom macros that can be used directly in prompts and
character cards.

### Basic Macros

| Macro      | Description              |
|------------|--------------------------|
| `{{char}}` | Current character's name |
| `{{user}}` | Current user's name      |

### Outfit Slot Macros

The system dynamically registers outfit slot macros for both the current character and user. Each slot can be referenced
using the format `{{prefix_slot}}`:

#### Character Outfit Macros

| Macro Format               | Description                              |
|----------------------------|------------------------------------------|
| `{{char_headwear}}`        | Current character's headwear             |
| `{{char_topwear}}`         | Current character's top clothing         |
| `{{char_topunderwear}}`    | Current character's top undergarments    |
| `{{char_bottomwear}}`      | Current character's bottom clothing      |
| `{{char_bottomunderwear}}` | Current character's bottom undergarments |
| `{{char_footwear}}`        | Current character's footwear             |
| `{{char_footunderwear}}`   | Current character's foot undergarments   |

#### Character Accessory Macros

| Macro Format                | Description                            |
|-----------------------------|----------------------------------------|
| `{{char_head-accessory}}`   | Current character's head accessories   |
| `{{char_ears-accessory}}`   | Current character's ear accessories    |
| `{{char_eyes-accessory}}`   | Current character's eye accessories    |
| `{{char_mouth-accessory}}`  | Current character's mouth accessories  |
| `{{char_neck-accessory}}`   | Current character's neck accessories   |
| `{{char_body-accessory}}`   | Current character's body accessories   |
| `{{char_arms-accessory}}`   | Current character's arm accessories    |
| `{{char_hands-accessory}}`  | Current character's hand accessories   |
| `{{char_waist-accessory}}`  | Current character's waist accessories  |
| `{{char_bottom-accessory}}` | Current character's bottom accessories |
| `{{char_legs-accessory}}`   | Current character's leg accessories    |
| `{{char_foot-accessory}}`   | Current character's foot accessories   |

#### User Outfit Macros

| Macro Format               | Description                         |
|----------------------------|-------------------------------------|
| `{{user_headwear}}`        | Current user's headwear             |
| `{{user_topwear}}`         | Current user's top clothing         |
| `{{user_topunderwear}}`    | Current user's top undergarments    |
| `{{user_bottomwear}}`      | Current user's bottom clothing      |
| `{{user_bottomunderwear}}` | Current user's bottom undergarments |
| `{{user_footwear}}`        | Current user's footwear             |
| `{{user_footunderwear}}`   | Current user's foot undergarments   |

#### User Accessory Macros

| Macro Format                | Description                       |
|-----------------------------|-----------------------------------|
| `{{user_head-accessory}}`   | Current user's head accessories   |
| `{{user_ears-accessory}}`   | Current user's ear accessories    |
| `{{user_eyes-accessory}}`   | Current user's eye accessories    |
| `{{user_mouth-accessory}}`  | Current user's mouth accessories  |
| `{{user_neck-accessory}}`   | Current user's neck accessories   |
| `{{user_body-accessory}}`   | Current user's body accessories   |
| `{{user_arms-accessory}}`   | Current user's arm accessories    |
| `{{user_hands-accessory}}`  | Current user's hand accessories   |
| `{{user_waist-accessory}}`  | Current user's waist accessories  |
| `{{user_bottom-accessory}}` | Current user's bottom accessories |
| `{{user_legs-accessory}}`   | Current user's leg accessories    |
| `{{user_foot-accessory}}`   | Current user's foot accessories   |

### Character-Specific Macros

The system also registers macros for specific character names. For example, if your character's name is "Emma", the
following macros will be available:

| Macro Format                | Description                 |
|-----------------------------|-----------------------------|
| `{{Emma}}`                  | Character name "Emma"       |
| `{{Emma_headwear}}`         | Emma's headwear             |
| `{{Emma_topwear}}`          | Emma's top clothing         |
| `{{Emma_topunderwear}}`     | Emma's top undergarments    |
| `{{Emma_bottomwear}}`       | Emma's bottom clothing      |
| `{{Emma_bottomunderwear}}`  | Emma's bottom undergarments |
| `{{Emma_footwear}}`         | Emma's footwear             |
| `{{Emma_footunderwear}}`    | Emma's foot undergarments   |
| `{{Emma_head-accessory}}`   | Emma's head accessories     |
| `{{Emma_ears-accessory}}`   | Emma's ear accessories      |
| `{{Emma_eyes-accessory}}`   | Emma's eye accessories      |
| `{{Emma_mouth-accessory}}`  | Emma's mouth accessories    |
| `{{Emma_neck-accessory}}`   | Emma's neck accessories     |
| `{{Emma_body-accessory}}`   | Emma's body accessories     |
| `{{Emma_arms-accessory}}`   | Emma's arm accessories      |
| `{{Emma_hands-accessory}}`  | Emma's hand accessories     |
| `{{Emma_waist-accessory}}`  | Emma's waist accessories    |
| `{{Emma_bottom-accessory}}` | Emma's bottom accessories   |
| `{{Emma_legs-accessory}}`   | Emma's leg accessories      |
| `{{Emma_foot-accessory}}`   | Emma's foot accessories     |

> 💡 **Note:** The custom macro system registers these dynamic macros automatically when the extension loads, making them
> available throughout SillyTavern where macro substitution is supported.

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