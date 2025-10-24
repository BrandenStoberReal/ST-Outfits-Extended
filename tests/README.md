# Testing Suite for ST-Outfits-Extended

This directory contains a comprehensive testing suite for the ST-Outfits-Extended extension using Jest as the test runner.

## Test Structure

The test suite is organized as follows:

- `utils.test.js` - Tests for utility functions that can be tested in isolation
- `extensionCore.test.js` - Tests for helper functions from the ExtensionCore module
- `store.test.js` - Tests for the Outfit Store functionality
- `initialization.test.js` - Tests for extension initialization process
- `setup.js` - Jest setup file with global mocks for browser APIs and SillyTavern context

## Testing Approach

Due to the browser-dependent nature of the SillyTavern extension, tests are organized using the following approaches:

1. **Mock-based testing**: For functions that depend on browser APIs or SillyTavern context, we use mocks to simulate the environment.

2. **Pure function testing**: Utility functions that don't require browser APIs are tested directly by copying their implementations to the test file.

3. **Class behavior testing**: Complex systems like the OutfitStore are tested by creating mock classes that implement the same interface.

## Mock Implementation Details

The mock implementations in `setup.js` follow the SillyTavern documentation and include:

- **SillyTavern context** with all documented properties:
  - State objects: `chat`, `characters`, `characterId`, `groups`, `groupId`
  - Settings and persistence: `extensionSettings`, `saveSettingsDebounced`
  - Chat metadata: `chatMetadata`, `saveMetadata`
  - Events: `eventSource`, `event_types` with all documented event types
  - Character cards: `writeExtensionField`
  - Text generation: `generateQuietPrompt`, `generateRaw`
  - Macros: `registerMacro`, `unregisterMacro`, `addLocaleData`
  - Settings presets: `getPresetManager`
  - Additional: `registerSlashCommand`

- **SillyTavern shared libraries** including `DOMPurify`, `moment`, `showdown`, `lodash`, `localforage`, `Fuse`

- **jQuery** with commonly used methods

## Running Tests

To run all tests:
```bash
npm test
```

To run tests in watch mode:
```bash
npm run test:watch
```

To run tests with coverage:
```bash
npm run test:coverage
```

## Coverage

The tests cover:
- Core utility functions (validation, string processing)
- Outfit store state management
- Extension initialization process
- Mock implementations of browser/SillyTavern APIs