# ST-Outfits Extension Documentation

## Project Overview

ST-Outfits is a SillyTavern extension that enables tracking of character outfits within conversations. The extension provides an outfit management system that allows users to define what both the AI character and the user are wearing during conversations, with support for clothing items and accessories across multiple slots. The system automatically injects outfit information into conversation contexts and supports advanced features like automatic outfit updates using LLM analysis.

## Architecture

The extension follows a modular architecture with distinct components:

- **Core**: Contains the main extension functionality in separate modules
  - `ExtensionCore.js`: Main initialization and core functionality
  - `OutfitCommands.js`: All slash command definitions and handlers
  - `EventSystem.js`: SillyTavern event listeners and handlers
  - `SettingsUI.js`: Settings panel UI creation and management
  - `AutoOutfitSystem.js`: Auto-outfit detection functionality
- **Managers**: Handle outfit data management for bot and user (`BotOutfitManager.js`, `UserOutfitManager.js`)
- **Panels**: UI components for displaying and modifying outfits (`BotOutfitPanel.js`, `UserOutfitPanel.js`)
- **Utils**: Utility functions for string processing and LLM interaction (`StringProcessor.js`, `LLMUtility.js`)
- **Config**: Configuration modules (`paths.js`)
- **Common**: Shared utilities including the centralized data store (`Store.js`)

## Key Features

### Outfit Tracking
- Clothing slots: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear
- Accessory slots: head-accessory, ears-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory

### UI Components
- Character outfit panel (`#bot-outfit-panel`)
- User outfit panel (`#user-outfit-panel`)
- Draggable and minimizable panels
- Tabbed interface for outfits and presets

### Command System
The extension provides a comprehensive slash command system with over 20 commands, including:
- `/outfit-bot` and `/outfit-user` - Toggle character and user outfit panels
- `/outfit-auto [on/off]` - Enable/disable automatic outfit updates
- `/switch-outfit <name>` - Switch to a saved outfit by name
- `/import-outfit` - Import outfit from character card
- Mobile-friendly commands like `/outfit-wear`, `/outfit-remove`, `/outfit-change`
- Outfit preset commands like `/outfit-save`, `/outfit-delete`

### Auto Outfit Updates
An optional feature that analyzes the conversation after each character response and automatically updates outfit items based on changes mentioned in the dialogue. Uses LLM analysis with a customizable system prompt.

### Outfit Presets
Users can save, load, and manage outfit presets for both character and user outfits.

### Context Injection
The extension automatically injects current outfit information into the conversation context using the `generate_interceptor` function. Outfit information appears in the format:

⚠️ **Important Scope Note:** The `<BOT>` placeholder replacement and global variable processing (`{{getglobalvar::*}}`) only works in conversation context and generated responses, NOT in character card fields (description, personality, scenario, etc.). For character card fields, SillyTavern's core macro system handles replacement, which processes `{{char}}`, `{{user}}`, etc., but not the extension's custom macros. Global variables will only work in character cards if SillyTavern's core macro system is configured to process them.

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

### LLM-Powered Import
The `/import-outfit` command uses LLM analysis to automatically extract outfit information from character descriptions, personality notes, scenario, and character notes, then updates the outfit tracker accordingly.

## Implementation of Centralized Data Storage

### Problem with Global Variables
The previous version of the extension relied heavily on global variables for data storage, which created several issues:
- Risk of variable name conflicts
- Data pollution across the global scope
- Difficulty in tracking and managing changes
- Potential performance issues with large datasets
- Hard to debug and maintain

### New Data Storage Architecture
To address these issues, a new centralized data storage system has been implemented:

#### 1. Centralized Store Module (`Store.js`)
- Implements a state management system that acts as a single source of truth for all outfit-related data
- Uses a class-based approach with methods for setting, getting, and updating state
- Provides methods for subscribing to state changes
- Includes migration functionality to handle data from the old global variable system

#### 2. Core Store Features
- **Bot Outfit Data**: Manages outfit data by character ID and instance ID
- **User Outfit Data**: Handles user outfit data by instance ID
- **Instance Management**: Tracks conversation-specific outfit instances
- **Presets**: Stores outfit presets for both bot and user
- **Panel Settings**: Manages UI settings like panel colors and visibility
- **Extension Settings**: Handles general settings like auto-open preferences
- **Panel References**: Keeps track of UI panel instances
- **Auto Outfit System**: Maintains reference to the auto-outfit system

#### 3. Backward Compatibility
- Maintains compatibility with SillyTavern's extension settings system
- Falls back to legacy data format when needed
- Updates both the new store and legacy system for smooth transition
- Preserves all existing functionality

#### 4. Migration Process
- The system automatically migrates old data format to the new store structure
- Preserves all existing outfit data and settings
- Maintains data integrity during the transition

#### 5. Module Updates
- **NewBotOutfitManager**: Updated to use the store for all data operations
- **NewUserOutfitManager**: Updated to use the store for all data operations
- **AutoOutfitSystem**: Updated to access macro values through the store when possible
- **ExtensionCore**: Updated to initialize and register components with the store

### Benefits of the New Architecture
- **Cleaner Code**: Eliminates global variable pollution
- **Better Performance**: More efficient data access and updates
- **Easier Debugging**: Centralized data management makes it easier to track changes
- **Scalability**: The architecture can easily handle more features in the future
- **Maintainability**: Clear separation of concerns makes the code easier to maintain
- **State Management**: Proper handling of UI state, data, and references

## Installation

This is a SillyTavern extension that should be installed using SillyTavern's extension management system. The manifest file specifies the extension details including the JavaScript file (`index.js`), CSS file (`style.css`), and loading order.

## Development

### Setting up the Project
1. Clone the repository
2. Install as a SillyTavern extension
3. Restart SillyTavern

### File Structure
```
src/
├── common/          # Shared utilities and common functions including Store.js
├── core/            # Core business logic modules (ExtensionCore, OutfitCommands, EventSystem, SettingsUI)
├── managers/        # Outfit management classes
├── panels/          # UI panel implementations
├── utils/           # Utility functions
└── config/          # Configuration modules
```

### SillyTavern Source Code Reference
For reference, SillyTavern source code files relevant to this extension are available in the `docs/` folder, specifically:
- `docs/sillytavern-src/events.js` - Event definitions used by the extension
- `docs/sillytavern-src/script.js` - Additional SillyTavern framework code

These files can be helpful for understanding how the extension integrates with SillyTavern's event system and core functionality.

### Building and Running
The extension is loaded automatically when SillyTavern starts, provided it's properly installed in the extensions directory.

### Development Conventions
- Uses ES6 modules for imports/exports
- Follows SillyTavern extension patterns and conventions
- Uses `extension_settings` for storing persistent data
- Implements a centralized store for application state management
- Implements a generate interceptor for context injection

### Testing
There are no explicit test files visible in the repository. Testing would likely involve manual testing within a SillyTavern environment.

## Dependencies

The extension relies on SillyTavern's core modules:
- `../../../extensions.js` for extension settings
- `../../../../script.js` for settings debounce
- `../../../slash-commands/` modules for slash command functionality
- Various UI libraries for toast notifications and UI components

## Configuration

The extension provides settings accessible through the SillyTavern extension settings UI:
- Auto-open panels on startup
- Enable/disable system messages
- Enable/disable auto outfit updates
- Custom system prompt for auto outfit detection
- Connection profile selection for auto outfit feature
- Panel color customization

## Security Considerations

- Uses safe property access utilities to prevent errors with undefined objects
- Implements input validation for outfit values
- Sanitizes user input where appropriate
- Limits maximum value length for outfit items to prevent storage issues

## Performance

The extension implements several performance optimizations:
- Debounced settings saving
- Efficient UI rendering
- Asynchronous operations where appropriate
- Cleanup of temporary outfit instances
- Centralized state management for efficient data access

## Troubleshooting

If outfit information isn't appearing in conversation context, ensure:
1. The extension is properly loaded
2. The `generate_interceptor` is functioning
3. Outfit items have been set to non-"None" values
4. The character is properly selected in SillyTavern

For issues with auto outfit updates, verify that:
1. The feature is enabled in settings
2. A valid system prompt is set
3. An appropriate LLM connection is available
4. The character has a properly formatted name and description

## Event Handling

The extension listens to several SillyTavern events to ensure outfit data is properly loaded and updated:

- `APP_READY`: The app is fully loaded and ready to use. It will auto-fire every time a new listener is attached after the app is ready.
- `CHARACTER_PAGE_LOADED`: This event references the character selection page loading, NOT the character's data loading. This event is used to update outfit data when the character selection page is loaded.
- `CHAT_ID_CHANGED`: Triggered when switching between different chat conversations
- `CHAT_CHANGED`: Triggered when the current chat context changes (e.g., switched to another character, or another chat was loaded).
- `CHAT_CREATED`: Triggered when a new chat is created
- `MESSAGE_RECEIVED`: The LLM message is generated and recorded into the chat object but not yet rendered in the UI.
- `MESSAGE_SENT`: The message is sent by the user and recorded into the chat object but not yet rendered in the UI.
- `USER_MESSAGE_RENDERED`: The message sent by a user is rendered in the UI.
- `CHARACTER_MESSAGE_RENDERED`: The generated LLM message is rendered in the UI.
- `GENERATION_AFTER_COMMANDS`: The generation is about to start after processing slash commands.
- `GENERATION_STOPPED`: The generation was stopped by the user.
- `GENERATION_ENDED`: The generation has been completed or has errored out.
- `MESSAGE_SWIPED`: Triggered when switching between different message variants
- `CHARACTER_FIRST_MESSAGE_SELECTED`: Triggered when the first message of a character is selected
- `SETTINGS_UPDATED`: The application settings have been updated.