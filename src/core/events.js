import { EventEmitter } from '../../../../../../lib/eventemitter.js';

export const extensionEventBus = new EventEmitter();

export const EXTENSION_EVENTS = {
    CONTEXT_UPDATED: 'context_updated',
    OUTFIT_INSTANCE_CHANGED: 'outfit_instance_changed',
    OUTFIT_UPDATED: 'outfit_updated',
    SETTINGS_CHANGED: 'settings_changed',
};
