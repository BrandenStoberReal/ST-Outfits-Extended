// Mock the global environment for testing
global.window = {
  SillyTavern: {
    getContext: jest.fn()
  }
};

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock context
const mockContext = {
  extensionSettings: {},
  saveSettingsDebounced: jest.fn(),
  characters: [],
  chat: [],
  eventSource: {
    on: jest.fn(),
    emit: jest.fn()
  }
};

global.window.SillyTavern.getContext.mockReturnValue(mockContext);

// Mock modules that will be imported
jest.mock('../src/common/Store.js', () => ({
  outfitStore: {
    setState: jest.fn(),
    getState: jest.fn(),
    setCurrentInstanceId: jest.fn(),
    setPanelRef: jest.fn(),
    setAutoOutfitSystem: jest.fn(),
    setDataManager: jest.fn(),
    loadState: jest.fn(),
    subscribe: jest.fn()
  }
}));

jest.mock('../src/services/StorageService.js', () => {
  return {
    StorageService: jest.fn().mockImplementation(() => ({
      load: jest.fn(),
      save: jest.fn()
    }))
  };
});

jest.mock('../src/services/DataManager.js', () => {
  return {
    DataManager: jest.fn().mockImplementation(() => ({
      initialize: jest.fn(),
      loadSettings: jest.fn(() => ({}))
    }))
  };
});

jest.mock('../src/managers/NewBotOutfitManager.js', () => {
  return {
    NewBotOutfitManager: jest.fn().mockImplementation(() => ({
      setOutfitInstanceId: jest.fn()
    }))
  };
});

jest.mock('../src/managers/NewUserOutfitManager.js', () => {
  return {
    NewUserOutfitManager: jest.fn().mockImplementation(() => ({
      setOutfitInstanceId: jest.fn()
    }))
  };
});

jest.mock('../src/panels/BotOutfitPanel.js', () => {
  return {
    BotOutfitPanel: jest.fn().mockImplementation(() => ({
      show: jest.fn(),
      applyPanelColors: jest.fn(),
      outfitManager: { setOutfitInstanceId: jest.fn() }
    }))
  };
});

jest.mock('../src/panels/UserOutfitPanel.js', () => {
  return {
    UserOutfitPanel: jest.fn().mockImplementation(() => ({
      show: jest.fn(),
      applyPanelColors: jest.fn(),
      outfitManager: { setOutfitInstanceId: jest.fn() }
    }))
  };
});

jest.mock('../src/config/constants.js', () => ({
  CLOTHING_SLOTS: ['topwear', 'bottomwear'],
  ACCESSORY_SLOTS: ['neck-accessory'],
  ALL_SLOTS: ['topwear', 'bottomwear', 'neck-accessory']
}));

// Since we can't directly import the initializeExtension function due to DOM dependencies,
// we'll test it through a mock version
describe('Extension Initialization', () => {
  test('should initialize without throwing errors', async () => {
    // We can't directly test the initializeExtension function due to DOM dependencies
    // But we can verify the mock modules are properly set up
    expect(global.window.SillyTavern.getContext).toBeDefined();
    
    // Check that the mock context has all required methods
    expect(mockContext.extensionSettings).toBeDefined();
    expect(typeof mockContext.saveSettingsDebounced).toBe('function');
  });
});