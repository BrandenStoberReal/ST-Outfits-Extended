# ST-Outfits Extension Documentation

## Project Overview

ST-Outfits is a SillyTavern extension that enables tracking of character outfits within conversations. The extension provides an outfit management system that allows users to define what both the AI character and the user are wearing during conversations, with support for clothing items and accessories across multiple slots. The system automatically injects outfit information into conversation contexts and supports advanced features like automatic outfit updates using LLM analysis.

## Architecture

The extension follows a modular architecture with distinct components:

- **Core**: Contains the main extension entry point (`index.js`)
- **Managers**: Handle outfit data management for bot and user (`BotOutfitManager.js`, `UserOutfitManager.js`)
- **Panels**: UI components for displaying and modifying outfits (`BotOutfitPanel.js`, `UserOutfitPanel.js`)
- **Utils**: Utility functions for string processing and LLM interaction (`StringProcessor.js`, `LLMUtility.js`)
- **Config**: Configuration modules (`paths.js`)
- **Common**: Shared utilities

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
├── common/          # Shared utilities and common functions
├── core/            # Core business logic modules
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
- Uses global variables for sharing data between modules
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