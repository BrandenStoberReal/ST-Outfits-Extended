// Mock for browser globals that are available in SillyTavern but not in test environment
global.$ = jest.fn();
global.jQuery = global.$;

// Mock SillyTavern's global object
global.SillyTavern = {
    getContext: jest.fn(),
    libs: {
        DOMPurify: {sanitize: jest.fn(text => text)},
        moment: jest.fn(),
        showdown: {Converter: jest.fn()},
        lodash: {},
        localforage: {},
        Fuse: {}
    }
};

// Mock jQuery functions commonly used in the extension
global.$.mockImplementation = (selector) => {
    return {
        ready: jest.fn((callback) => callback()),
        on: jest.fn(),
        append: jest.fn(),
        remove: jest.fn(),
        hide: jest.fn(),
        show: jest.fn(),
        css: jest.fn(),
        val: jest.fn(),
        text: jest.fn(),
        html: jest.fn(),
        find: jest.fn(() => global.$()),
        trigger: jest.fn(),
        data: jest.fn(),
        attr: jest.fn(),
        addClass: jest.fn(),
        removeClass: jest.fn(),
        toggleClass: jest.fn(),
        prop: jest.fn(),
        click: jest.fn(),
        submit: jest.fn(),
        parent: jest.fn(() => global.$()),
        siblings: jest.fn(() => global.$()),
        closest: jest.fn(() => global.$()),
        each: jest.fn((callback) => {
            if (callback) {
                callback();
            }
        }),
        length: 0
    };
};

// Mock common browser APIs
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock fetch API
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        ok: true,
        status: 200
    })
);

// Mock extension settings and context based on documentation
const mockContext = {
    // State objects
    chat: [], // Chat log - MUTABLE
    characters: [], // Character list
    characterId: null, // Index of the current character
    groups: [], // Group list
    groupId: null, // ID of the current group

    // Settings and persistence
    extensionSettings: {},
    saveSettingsDebounced: jest.fn(),

    // Chat metadata
    chatMetadata: {},
    saveMetadata: jest.fn(),

    // Events
    eventSource: {
        on: jest.fn(),
        emit: jest.fn()
    },
    event_types: {
        APP_READY: 'APP_READY',
        MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
        MESSAGE_SENT: 'MESSAGE_SENT',
        USER_MESSAGE_RENDERED: 'USER_MESSAGE_RENDERED',
        CHARACTER_MESSAGE_RENDERED: 'CHARACTER_MESSAGE_RENDERED',
        CHAT_CHANGED: 'CHAT_CHANGED',
        GENERATION_AFTER_COMMANDS: 'GENERATION_AFTER_COMMANDS',
        GENERATION_STOPPED: 'GENERATION_STOPPED',
        GENERATION_ENDED: 'GENERATION_ENDED',
        SETTINGS_UPDATED: 'SETTINGS_UPDATED'
    },

    // Character cards
    writeExtensionField: jest.fn(),

    // Text generation
    generateQuietPrompt: jest.fn(),
    generateRaw: jest.fn(),

    // Macros
    registerMacro: jest.fn(),
    unregisterMacro: jest.fn(),
    addLocaleData: jest.fn(),

    // Settings presets
    getPresetManager: jest.fn(() => ({
        writePresetExtensionField: jest.fn(),
        readPresetExtensionField: jest.fn()
    })),

    // Additional documented methods
    registerSlashCommand: jest.fn()
};

global.SillyTavern.getContext.mockReturnValue(mockContext);

// Mock setTimeout for async operations
global.setTimeout = (fn) => fn();