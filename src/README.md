# Outfit Tracker Extension - Source Structure

This document describes the source code structure and path organization of the Outfit Tracker Extension.

## Directory Structure

```
src/
├── common/          # Shared utilities and common functions
├── core/            # Core business logic modules
├── managers/        # Outfit management classes
├── panels/          # UI panel implementations
├── utils/           # Utility functions
└── config/          # Configuration modules
```

## Path Configuration

The `config/paths.js` file centralizes path definitions for:
- Common utilities
- Core modules
- Managers
- Panels
- Utilities

This improves maintainability by having a single source of truth for internal paths.

## Import Conventions

### External Dependencies
- Use relative paths from the project root to reach SillyTavern core modules
- Example: `../../../extensions.js`

### Internal Dependencies
- Use relative paths based on directory structure
- For adjacent modules: `./filename.js`
- For parent directory: `../filename.js`
- For sibling directories: `../directory/filename.js`

## Module Responsibilities

- `common/`: Shared utilities used across multiple modules
- `core/`: Core logic like auto-outfit detection
- `managers/`: State management for outfits
- `panels/`: UI rendering and user interaction
- `utils/`: Helper functions and processing utilities