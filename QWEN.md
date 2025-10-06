# Outfit Tracker Extension for SillyTavern - Project Context

## Project Overview

The Outfit Tracker Extension is a comprehensive SillyTavern extension that allows users to track and manage the clothing and accessories of both AI characters and users during conversations. The extension provides a visual panel interface, slash commands for management, and advanced LLM-powered automatic outfit detection features.

**Key Features:**
- Visual outfit panels for both AI character and user
- 19 different outfit slots (7 clothing + 12 accessories)
- Preset saving/loading functionality
- LLM-powered automatic outfit detection
- Outfit import from character cards
- Global variable integration for context injection

## Architecture and Structure

The extension follows a modular architecture with clear separation of concerns:

### Main Files
- `index.js`: Main extension entry point that initializes managers, panels, and registers slash commands
- `style.css`: Custom styling for the outfit panels with gradient backgrounds and modern UI elements
- `manifest.json`: Extension metadata and configuration
- `src/` directory contains core modules organized as follows:
  - `managers/` directory:
    - `BotOutfitManager.js`: Handles AI character outfit management
    - `UserOutfitManager.js`: Handles user outfit management  
  - `panels/` directory:
    - `BotOutfitPanel.js`: UI panel for character outfits
    - `UserOutfitPanel.js`: UI panel for user outfits
  - `core/` directory:
    - `AutoOutfitSystem.js`: LLM-powered automatic outfit detection
  - `utils/` directory:
    - `StringProcessor.js`: Utility functions for text processing
    - `LLMUtility.js`: LLM generation utilities
  - `common/` directory:
    - `shared.js`: Common shared utilities

### Outfit Slots

The system supports 19 different outfit slots:

**Clothing Slots:**
- `headwear`, `topwear`, `topunderwear`, `bottomwear`, `bottomunderwear`, `footwear`, `footunderwear`

**Accessory Slots:**
- `head-accessory`, `ears-accessory`, `eyes-accessory`, `mouth-accessory`, `neck-accessory`, `body-accessory`, `arms-accessory`, `hands-accessory`, `waist-accessory`, `bottom-accessory`, `legs-accessory`, `foot-accessory`

## Key Functionality

### Panel System
- Draggable panels for both character and user outfits
- Tabbed interface for organizing outfits and presets
- Visual feedback when outfits change

### Slash Commands
The extension provides extensive slash command support for outfit management:

**Panel Control:**
- `/outfit-bot` - Toggle character outfit panel
- `/outfit-user` - Toggle user outfit panel

**Auto Outfit:**
- `/outfit-auto [on/off]` - Enable/disable auto outfit updates
- `/outfit-prompt [text]` - Set auto outfit system prompt
- `/outfit-prompt-reset` - Reset to default prompt
- `/outfit-prompt-view` - View current prompt
- `/outfit-auto-trigger` - Manually trigger auto outfit check

**Outfit Management:**
- `/switch-outfit <name>` - Switch to a saved outfit
- `/import-outfit` - Import outfit from character card
- `/outfit-list` - List all available presets and current outfits

**Preset Commands:**
- `/outfit-save <name>` - Save character outfit
- `/outfit-delete <name>` - Delete character outfit preset
- `/user-outfit-save <name>` - Save user outfit
- `/user-outfit-delete <name>` - Delete user outfit preset

**Mobile-Friendly Commands:**
- `/outfit-wear <slot> <item>` - Set character outfit item
- `/outfit-remove <slot>` - Remove character outfit item
- `/outfit-change <slot> <item>` - Change character outfit item
- Similar commands for user (`/user-outfit-wear`, etc.)

### LLM Integration
The extension includes an advanced AutoOutfitSystem that:
- Analyzes recent conversation messages for clothing changes
- Automatically updates outfit slots based on detected changes
- Uses custom prompts and connection profiles for different LLMs
- Supports various connection profiles (OpenRouter, Oobabooga, OpenAI, Claude)

### Variable Integration
The system integrates with SillyTavern's global variables system:
- Outfit data is stored in `extension_settings.variables.global`
- Variables follow format: `{{getglobalvar::<BOT>_slot}}` or `{{getglobalvar::User_slot}}`
- Variables are automatically injected into conversation context

## Building and Running

This is a SillyTavern extension that requires no build process - it runs as JavaScript directly in the SillyTavern environment. To use:

1. Install SillyTavern with extension support
2. Place the extension files in the SillyTavern extensions directory
3. Enable the extension in the SillyTavern settings panel
4. Configure settings via the extension's settings UI

## Development Conventions

- Uses SillyTavern's event system for notifications and updates
- Follows SillyTavern's slash command registration patterns
- Implements proper error handling and user feedback
- Uses global variables for persistent data storage
- Implements modular architecture with clear separation of UI, data management, and business logic

## Key Implementation Details

- The `generate_interceptor` in manifest.json hooks into message generation to inject outfit information
- Panels are implemented as draggable fixed-position elements with custom styling
- LLM processing uses multiple fallback methods for compatibility
- Outfit import from character cards uses LLM analysis to extract clothing information and clean up character descriptions
- Auto outfit updates are triggered by `MESSAGE_RECEIVED` events and include retry logic