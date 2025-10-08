# ST-Outfits Extension - Modular Architecture

This extension has been refactored into a modular architecture to improve maintainability and organization.

## File Structure

```
src/
├── core/
│   ├── ExtensionCore.js      # Main initialization and core functionality
│   ├── OutfitCommands.js     # All slash command definitions and handlers
│   ├── EventSystem.js        # SillyTavern event listeners and handlers
│   ├── SettingsUI.js         # Settings panel UI creation and management
│   └── AutoOutfitSystem.js   # Auto-outfit detection functionality
├── managers/
│   ├── BotOutfitManager.js   # Bot outfit state management
│   └── UserOutfitManager.js  # User outfit state management
├── panels/
│   ├── BotOutfitPanel.js     # Bot outfit panel UI
│   └── UserOutfitPanel.js    # User outfit panel UI
├── utils/
│   ├── StringProcessor.js    # String processing and macro utilities
│   └── LLMUtility.js         # LLM interaction utilities
└── config/
    └── paths.js              # Path configuration
```

## Core Modules

### ExtensionCore.js
- Main initialization logic
- Outfit manager and panel initialization
- Global variable setup
- Core utility functions

### OutfitCommands.js
- All slash command definitions (`/outfit-bot`, `/outfit-user`, etc.)
- Command callbacks and help text
- Argument parsing and validation

### EventSystem.js
- SillyTavern event listeners (APP_READY, CHAT_CHANGED, etc.)
- Chat lifecycle management
- Outfit instance management per conversation

### SettingsUI.js
- Settings panel creation and rendering
- Settings event handling
- Color customization functionality

## Benefits of Modularization

1. **Easier Maintenance**: Each module has a specific responsibility
2. **Improved Readability**: Code is organized by functionality
3. **Better Testing**: Modules can be tested independently
4. **Enhanced Collaboration**: Multiple developers can work on different modules
5. **Reduced Complexity**: Each file now has a focused purpose