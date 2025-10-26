// Define extension-specific events
export const EXTENSION_EVENTS = {
    CONTEXT_UPDATED: 'outfit-tracker-context-updated',
    OUTFIT_CHANGED: 'outfit-tracker-outfit-changed',
    PRESET_LOADED: 'outfit-tracker-preset-loaded',
    PANEL_VISIBILITY_CHANGED: 'outfit-tracker-panel-visibility-changed',
    CHAT_CLEARED: 'outfit-tracker-chat-cleared'
};
// Simple event bus implementation
class ExtensionEventBus {
    constructor() {
        this.listeners = {};
        this.listeners = {};
    }
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(listener => listener !== callback);
        }
    }
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                }
                catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
}
export const extensionEventBus = new ExtensionEventBus();
