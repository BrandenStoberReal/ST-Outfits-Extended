import {OutfitData, outfitStore} from '../stores/Store';
import {immediateStore} from '../stores/DebouncedStore';
import {debugLog} from '../logging/DebugLogger';

class PresetManager {
    getPresets(instanceId: string, type: 'bot' | 'user'): { [presetName: string]: OutfitData } {
        const presetKey = this._generatePresetKey(instanceId, type);
        const presets = outfitStore.state.presets[type] || {};
        return presets[presetKey] || {};
    }

    savePreset(instanceId: string, presetName: string, outfitData: OutfitData, type: 'bot' | 'user'): void {
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
        outfitStore.state.presets[type][presetKey][presetName] = {...outfitData};
        immediateStore.saveState();
    }

    deletePreset(instanceId: string, presetName: string, type: 'bot' | 'user'): void {
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

        if (outfitStore.state.presets[type]?.[presetKey]?.[presetName]) {
            delete outfitStore.state.presets[type][presetKey][presetName];
            if (Object.keys(outfitStore.state.presets[type][presetKey]).length === 0) {
                delete outfitStore.state.presets[type][presetKey];
            }
            immediateStore.saveState();
        }
    }

    deleteAllPresetsForInstance(instanceId: string, type: 'bot' | 'user'): void {
        const presetKey = this._generatePresetKey(instanceId, type);

        if (outfitStore.state.presets[type]?.[presetKey]) {
            delete outfitStore.state.presets[type][presetKey];
            immediateStore.saveState();
        }
    }

    _generatePresetKey(instanceId: string, type: 'bot' | 'user'): string {
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
