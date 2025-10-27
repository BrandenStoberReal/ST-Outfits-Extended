import { outfitStore } from '../common/Store.js';
class PresetManager {
    /**
     * Saves a preset with the specified name and outfit data
     * @param characterId The character ID to save the preset for
     * @param instanceId The instance ID to save the preset for
     * @param presetName The name of the preset to save
     * @param outfitData The outfit data to save
     * @param type The type of preset (bot or user)
     * @returns A message indicating the result of the operation
     */
    static savePreset(characterId, instanceId, presetName, outfitData, type = 'bot') {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[PresetManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        outfitStore.savePreset(characterId, instanceId, presetName, outfitData, type);
        // Ensure the presets are saved to persistent storage
        outfitStore.saveState();
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Saved \"${presetName}\" outfit (${type}).`;
        }
        return '';
    }
    /**
     * Loads a preset with the specified name
     * @param characterId The character ID to load the preset for
     * @param instanceId The instance ID to load the preset for
     * @param presetName The name of the preset to load
     * @param type The type of preset (bot or user)
     * @returns The outfit data for the preset, or null if not found
     */
    static loadPreset(characterId, instanceId, presetName, type = 'bot') {
        if (!presetName || typeof presetName !== 'string') {
            console.error('[PresetManager] Invalid preset name provided');
            return null;
        }
        const { bot, user } = outfitStore.getPresets(characterId, instanceId);
        const presets = type === 'bot' ? bot : user;
        if (!presets || !presets[presetName]) {
            console.warn(`[PresetManager] Preset \"${presetName}\" not found for ${type} instance ${instanceId}.`);
            return null;
        }
        return Object.assign({}, presets[presetName]); // Return a copy to avoid direct manipulation
    }
    /**
     * Deletes a preset with the specified name
     * @param characterId The character ID to delete the preset for
     * @param instanceId The instance ID to delete the preset for
     * @param presetName The name of the preset to delete
     * @param type The type of preset (bot or user)
     * @returns A message indicating the result of the operation
     */
    static deletePreset(characterId, instanceId, presetName, type = 'bot') {
        if (!presetName || typeof presetName !== 'string') {
            console.error('[PresetManager] Invalid preset name provided');
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }
        const { bot, user } = outfitStore.getPresets(characterId, instanceId);
        const presets = type === 'bot' ? bot : user;
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset \"${presetName}\" not found for ${type} instance ${instanceId}.`;
        }
        // Check if the preset being deleted is the same as the current default preset
        const defaultPreset = this.getDefaultPreset(characterId, instanceId, type);
        let message = '';
        if (defaultPreset && Object.keys(defaultPreset).length > 0 && presetName === 'default') {
            // If we're deleting the 'default' preset, clear the default status
            outfitStore.deletePreset(characterId, instanceId, 'default', type);
            message = `Deleted \"${presetName}\" and cleared default outfit for ${type} (instance: ${instanceId}).`;
        }
        else {
            message = `Deleted \"${presetName}\" outfit for ${type} instance ${instanceId}.`;
        }
        outfitStore.deletePreset(characterId, instanceId, presetName, type);
        outfitStore.saveState(); // Ensure the presets are saved to persistent storage
        if (outfitStore.getSetting('enableSysMessages')) {
            return message;
        }
        return '';
    }
    /**
     * Gets an array of all preset names for the specified character and instance
     * @param characterId The character ID to get presets for
     * @param instanceId The instance ID to get presets for
     * @param type The type of presets (bot or user)
     * @returns An array of preset names
     */
    static getPresets(characterId, instanceId, type = 'bot') {
        const { bot, user } = outfitStore.getPresets(characterId, instanceId);
        const presets = type === 'bot' ? bot : user;
        if (!presets) {
            return [];
        }
        // Return all preset names except 'default' which is handled separately
        return Object.keys(presets).filter(presetName => presetName !== 'default');
    }
    /**
     * Gets all presets with their outfit data for the specified character and instance
     * @param characterId The character ID to get presets for
     * @param instanceId The instance ID to get presets for
     * @param type The type of presets (bot or user)
     * @returns An object containing all presets with their outfit data
     */
    static getAllPresets(characterId, instanceId, type = 'bot') {
        return outfitStore.getAllPresets(characterId, instanceId, type);
    }
    /**
     * Checks if there is a default outfit for the specified character and instance
     * @param characterId The character ID to check for default preset
     * @param instanceId The instance ID to check for default preset
     * @param type The type of preset (bot or user)
     * @returns True if a default preset exists, false otherwise
     */
    static hasDefaultPreset(characterId, instanceId, type = 'bot') {
        const { bot, user } = outfitStore.getPresets(characterId, instanceId);
        const presets = type === 'bot' ? bot : user;
        return Boolean(presets && presets['default']);
    }
    /**
     * Gets the default preset data for the specified character and instance
     * @param characterId The character ID to get default preset for
     * @param instanceId The instance ID to get default preset for
     * @param type The type of preset (bot or user)
     * @returns The default preset data, or null if none exists
     */
    static getDefaultPreset(characterId, instanceId, type = 'bot') {
        const { bot, user } = outfitStore.getPresets(characterId, instanceId);
        const presets = type === 'bot' ? bot : user;
        if (presets && presets['default']) {
            return Object.assign({}, presets['default']); // Return a copy to avoid direct manipulation
        }
        return null;
    }
    /**
     * Sets the specified preset as the default preset
     * @param characterId The character ID to set default preset for
     * @param instanceId The instance ID to set default preset for
     * @param presetName The name of the preset to set as default
     * @param type The type of preset (bot or user)
     * @returns A message indicating the result of the operation
     */
    static setPresetAsDefault(characterId, instanceId, presetName, type = 'bot') {
        const { bot, user } = outfitStore.getPresets(characterId, instanceId);
        const presets = type === 'bot' ? bot : user;
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset \"${presetName}\" does not exist for ${type} instance ${instanceId}. Cannot set as default.`;
        }
        const presetToSetAsDefault = presets[presetName];
        outfitStore.savePreset(characterId, instanceId, 'default', presetToSetAsDefault, type);
        outfitStore.saveState(); // Ensure the presets are saved to persistent storage
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Set \"${presetName}\" as the default outfit for ${type} (instance: ${instanceId}).`;
        }
        return '';
    }
    /**
     * Overwrites the specified preset with new outfit data
     * @param characterId The character ID to overwrite preset for
     * @param instanceId The instance ID to overwrite preset for
     * @param presetName The name of the preset to overwrite
     * @param outfitData The new outfit data for the preset
     * @param type The type of preset (bot or user)
     * @returns A message indicating the result of the operation
     */
    static overwritePreset(characterId, instanceId, presetName, outfitData, type = 'bot') {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            console.error('[PresetManager] Invalid preset name provided');
            return '[Outfit System] Invalid preset name provided.';
        }
        const { bot, user } = outfitStore.getPresets(characterId, instanceId);
        const presets = type === 'bot' ? bot : user;
        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset \"${presetName}\" does not exist for ${type} instance ${instanceId}. Cannot overwrite.`;
        }
        outfitStore.savePreset(characterId, instanceId, presetName, outfitData, type);
        outfitStore.saveState(); // Ensure the presets are saved to persistent storage
        if (outfitStore.getSetting('enableSysMessages')) {
            return `Overwrote \"${presetName}\" outfit for ${type} (instance: ${instanceId}).`;
        }
        return '';
    }
}
export { PresetManager };
