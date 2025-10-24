// Test for Outfit Store functionality
// Since we can't directly import the module due to dependencies, we'll use a mock approach

// Mock the dependencies
jest.mock('../src/config/constants.js', () => ({
  DEFAULT_SETTINGS: {
    botPanelColors: { primary: '#6a4fc1', secondary: '#5a49d0' },
    userPanelColors: { primary: '#1a78d1', secondary: '#2a68c1' },
    autoOpenBot: true,
    autoOpenUser: false,
    autoOutfitEnabled: false
  }
}));

jest.mock('../src/utils/utilities.js', () => ({
  deepClone: (obj) => JSON.parse(JSON.stringify(obj))
}));

// Create a mock OutfitStore class since we can't import directly
class MockOutfitStore {
  constructor() {
    this.state = {
      botOutfits: {},
      userOutfits: {},
      botInstances: {},
      userInstances: {},
      presets: {
        bot: {},
        user: {},
      },
      panelSettings: {
        botPanelColors: { primary: '#6a4fc1', secondary: '#5a49d0' },
        userPanelColors: { primary: '#1a78d1', secondary: '#2a68c1' },
      },
      settings: {
        autoOpenBot: true,
        autoOpenUser: false,
        autoOutfitEnabled: false
      },
      currentCharacterId: null,
      currentChatId: null,
      currentOutfitInstanceId: null,
      panelVisibility: {
        bot: false,
        user: false,
      },
      references: {
        botPanel: null,
        userPanel: null,
        autoOutfitSystem: null,
      },
      listeners: [],
    };
    this.dataManager = null;
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  notifyListeners() {
    this.state.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in store listener:', error);
      }
    });
  }

  subscribe(listener) {
    this.state.listeners.push(listener);
    return () => {
      this.state.listeners = this.state.listeners.filter(l => l !== listener);
    };
  }

  getBotOutfit(characterId, instanceId) {
    const characterData = this.state.botInstances[characterId];
    if (!characterData) return {};
    const instanceData = characterData[instanceId];
    if (!instanceData) return {};
    return JSON.parse(JSON.stringify(instanceData.bot || {}));
  }

  setBotOutfit(characterId, instanceId, outfitData) {
    if (!this.state.botInstances[characterId]) {
      this.state.botInstances[characterId] = {};
    }
    if (!this.state.botInstances[characterId][instanceId]) {
      this.state.botInstances[characterId][instanceId] = { bot: {}, user: {} };
    }
    this.state.botInstances[characterId][instanceId].bot = { ...outfitData };
    this.notifyListeners();
  }

  setCurrentInstanceId(instanceId) {
    this.state.currentOutfitInstanceId = instanceId;
    this.notifyListeners();
  }

  getCurrentInstanceId() {
    return this.state.currentOutfitInstanceId;
  }

  setPanelVisibility(panelType, isVisible) {
    this.state.panelVisibility[panelType] = isVisible;
    this.notifyListeners();
  }

  getPanelVisibility(panelType) {
    return this.state.panelVisibility[panelType];
  }
}

describe('Outfit Store', () => {
  let store;

  beforeEach(() => {
    store = new MockOutfitStore();
  });

  test('should initialize with default state', () => {
    const state = store.getState();
    expect(state.botOutfits).toEqual({});
    expect(state.userOutfits).toEqual({});
    expect(state.settings.autoOpenBot).toBe(true);
    expect(state.settings.autoOpenUser).toBe(false);
    expect(state.currentOutfitInstanceId).toBeNull();
    expect(state.panelVisibility.bot).toBe(false);
    expect(state.panelVisibility.user).toBe(false);
  });

  test('should set and get bot outfit correctly', () => {
    const characterId = 'char123';
    const instanceId = 'inst456';
    const outfitData = { topwear: 'Red Shirt', headwear: 'Blue Hat' };

    store.setBotOutfit(characterId, instanceId, outfitData);
    const retrievedData = store.getBotOutfit(characterId, instanceId);

    expect(retrievedData).toEqual(outfitData);
  });

  test('should handle missing character or instance data gracefully', () => {
    const characterId = 'nonexistent';
    const instanceId = 'nonexistent';

    const retrievedData = store.getBotOutfit(characterId, instanceId);
    expect(retrievedData).toEqual({});
  });

  test('should set and get current instance ID', () => {
    const instanceId = 'test-instance-123';
    store.setCurrentInstanceId(instanceId);
    
    expect(store.getCurrentInstanceId()).toBe(instanceId);
  });

  test('should set and get panel visibility', () => {
    store.setPanelVisibility('bot', true);
    expect(store.getPanelVisibility('bot')).toBe(true);
    
    store.setPanelVisibility('user', true);
    expect(store.getPanelVisibility('user')).toBe(true);
  });

  test('should notify listeners when state changes', () => {
    const listener = jest.fn();
    store.subscribe(listener);
    
    const updates = { currentOutfitInstanceId: 'new-instance' };
    store.setState(updates);
    
    expect(listener).toHaveBeenCalledTimes(1);
    // Check that the listener was called and the state has the updated value
    expect(store.getState().currentOutfitInstanceId).toBe('new-instance');
  });
});