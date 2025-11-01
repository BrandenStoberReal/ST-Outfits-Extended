import { outfitStore } from '../stores/Store.js';
import { immediateStore } from '../stores/DebouncedStore.js';
import { debugLog } from '../logging/DebugLogger.js';
class PresetManager {
    getPresets(instanceId, type) {
        const presetKey = this._generatePresetKey(instanceId, type);
        const presets = outfitStore.state.presets[type] || {};
        return presets[presetKey] || {};
    }
    savePreset(instanceId, presetName, outfitData, type) {
        // Validate inputs
        if (!instanceId) {
            debugLog('Instance ID is required for saving preset', null, 'error');
            return;
        }
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            debugLog('Valid preset name is required', null, 'error');
            return;
        }
        if (!outfitData || typeof outfitData !== 'object') {
            debugLog('Valid outfit data is required', null, 'error');
            return;
        }
        const presetKey = this._generatePresetKey(instanceId, type);
        if (!outfitStore.state.presets[type]) {
            outfitStore.state.presets[type] = {};
        }
        if (!outfitStore.state.presets[type][presetKey]) {
            outfitStore.state.presets[type][presetKey] = {};
        }
        // Create a deep clone to avoid reference issues
        outfitStore.state.presets[type][presetKey][presetName] = Object.assign({}, outfitData);
        immediateStore.saveState();
    }
    deletePreset(instanceId, presetName, type) {
        var _a, _b;
        // Validate inputs
        if (!instanceId) {
            debugLog('Instance ID is required for deleting preset', null, 'error');
            return;
        }
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            debugLog('Valid preset name is required for deletion', null, 'error');
            return;
        }
        const presetKey = this._generatePresetKey(instanceId, type);
        if ((_b = (_a = outfitStore.state.presets[type]) === null || _a === void 0 ? void 0 : _a[presetKey]) === null || _b === void 0 ? void 0 : _b[presetName]) {
            delete outfitStore.state.presets[type][presetKey][presetName];
            if (Object.keys(outfitStore.state.presets[type][presetKey]).length === 0) {
                delete outfitStore.state.presets[type][presetKey];
            }
            immediateStore.saveState();
        }
    }
    deleteAllPresetsForInstance(instanceId, type) {
        var _a;
        const presetKey = this._generatePresetKey(instanceId, type);
        if ((_a = outfitStore.state.presets[type]) === null || _a === void 0 ? void 0 : _a[presetKey]) {
            delete outfitStore.state.presets[type][presetKey];
            immediateStore.saveState();
        }
    }
    _generatePresetKey(instanceId, type) {
        if (type === 'bot') {
            if (!instanceId) {
                throw new Error('Instance ID is required for generating bot preset key');
            }
            return instanceId;
        }
        return instanceId || 'default';
    }
}
export const presetManager = new PresetManager();
