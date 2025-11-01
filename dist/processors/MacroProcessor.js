var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { generateInstanceIdFromText } from '../utils/utilities.js';
import { outfitStore } from '../common/Store.js';
import { ALL_SLOTS } from '../config/constants.js';
class MacroProcessor {
    constructor() {
        this.allSlots = ALL_SLOTS;
        this.outfitValuesCache = new Map();
        this.textProcessingCache = new Map();
        this.cacheExpiryTime = 5 * 60 * 1000;
    }
    clearCache() {
        this.outfitValuesCache.clear();
        this.textProcessingCache.clear();
    }
    processMacrosInFirstMessage(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const ctx = context || (((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null));
                if (!ctx || !ctx.chat) {
                    return;
                }
                const firstBotMessage = ctx.chat.find((message) => !message.is_user && !message.is_system);
                if (firstBotMessage) {
                    // Get all outfit data for the character to remove from the first message
                    const allOutfitData = this.getAllOutfitDataForCharacter(ctx.characterId);
                    // Create a cleaned version of the first message with outfit data removed
                    let cleanedMessage = firstBotMessage.mes;
                    // Remove all outfit data values from the message
                    Object.values(allOutfitData).forEach((outfitInstanceData) => {
                        if (outfitInstanceData && outfitInstanceData.bot) {
                            Object.values(outfitInstanceData.bot).forEach((value) => {
                                if (value && typeof value === 'string') { // Removed !== 'None' condition to also remove "None"
                                    // Remove this value from the message
                                    cleanedMessage = this.removeValueFromText(cleanedMessage, value);
                                }
                            });
                        }
                    });
                    // Also process any remaining outfit macros
                    cleanedMessage = this.cleanOutfitMacrosFromText(cleanedMessage);
                    const instanceId = yield generateInstanceIdFromText(cleanedMessage);
                    outfitStore.setCurrentInstanceId(instanceId);
                    if ((_b = window.botOutfitPanel) === null || _b === void 0 ? void 0 : _b.outfitManager) {
                        window.botOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                    }
                    if ((_c = window.userOutfitPanel) === null || _c === void 0 ? void 0 : _c.outfitManager) {
                        window.userOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                    }
                }
            }
            catch (error) {
                console.error('[OutfitTracker] Error processing macros in first message:', error);
            }
        });
    }
    getAllOutfitDataForCharacter(characterId) {
        if (!characterId) {
            return {};
        }
        const actualCharacterId = characterId.toString();
        const state = outfitStore.getState();
        const allOutfitData = {};
        // Get all bot instances for this character
        if (state.botInstances && state.botInstances[actualCharacterId]) {
            Object.keys(state.botInstances[actualCharacterId]).forEach(instanceId => {
                allOutfitData[instanceId] = state.botInstances[actualCharacterId][instanceId];
            });
        }
        // Get all presets for this character
        if (state.presets && state.presets.bot) {
            Object.keys(state.presets.bot).forEach(key => {
                if (key.startsWith(actualCharacterId + '_')) {
                    const presets = state.presets.bot[key];
                    if (presets) {
                        // Create a dummy instance for presets to match the structure
                        const presetInstanceId = `preset_${key}`;
                        if (!allOutfitData[presetInstanceId]) {
                            allOutfitData[presetInstanceId] = { bot: {} };
                        }
                        Object.keys(presets).forEach(presetName => {
                            Object.assign(allOutfitData[presetInstanceId].bot, presets[presetName]);
                        });
                    }
                }
            });
        }
        return allOutfitData;
    }
    removeValueFromText(text, value) {
        if (!text || !value || typeof text !== 'string' || typeof value !== 'string') {
            return text || '';
        }
        let result = text;
        let lowerText = result.toLowerCase();
        let lowerValue = value.toLowerCase();
        let startIndex = 0;
        while ((startIndex = lowerText.indexOf(lowerValue, startIndex)) !== -1) {
            const endIndex = startIndex + lowerValue.length;
            const beforeChar = startIndex > 0 ? lowerText.charAt(startIndex - 1) : ' ';
            const afterChar = endIndex < lowerText.length ? lowerText.charAt(endIndex) : ' ';
            // Check if the match is at word boundaries to avoid partial matches
            const isWordBoundary = (beforeChar === ' ' || beforeChar === '.' || beforeChar === ',' ||
                beforeChar === '"' || beforeChar === '\'' ||
                beforeChar === '(' || beforeChar === '[' ||
                beforeChar === '\n' || beforeChar === '\t') &&
                (afterChar === ' ' || afterChar === '.' || afterChar === ',' ||
                    afterChar === '"' || afterChar === '\'' ||
                    afterChar === ')' || afterChar === ']'
                    || afterChar === '\n' || afterChar === '\t');
            if (isWordBoundary) {
                result = result.substring(0, startIndex) + '[OUTFIT_REMOVED]' + result.substring(endIndex);
                lowerText = result.toLowerCase();
                startIndex += '[OUTFIT_REMOVED]'.length;
            }
            else {
                startIndex = endIndex;
            }
        }
        return result;
    }
    getAllOutfitValuesForCharacter(characterId) {
        if (!characterId) {
            return [];
        }
        const actualCharacterId = characterId.toString();
        const state = outfitStore.getState();
        const outfitValues = new Set();
        if (state.botInstances && state.botInstances[actualCharacterId]) {
            Object.values(state.botInstances[actualCharacterId]).forEach(instanceData => {
                if (instanceData && instanceData.bot) {
                    Object.values(instanceData.bot).forEach(value => {
                        if (value && typeof value === 'string' && value !== 'None') {
                            outfitValues.add(value);
                        }
                    });
                }
            });
        }
        if (state.presets && state.presets.bot) {
            Object.keys(state.presets.bot).forEach(key => {
                if (key.startsWith(actualCharacterId + '_')) {
                    const presets = state.presets.bot[key];
                    if (presets) {
                        Object.values(presets).forEach(preset => {
                            if (preset) {
                                Object.values(preset).forEach(value => {
                                    if (value && typeof value === 'string' && value !== 'None') {
                                        outfitValues.add(value);
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }
        return Array.from(outfitValues);
    }
    isAlphaNumericWithUnderscores(str) {
        if (!str || typeof str !== 'string') {
            return false;
        }
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const code = char.charCodeAt(0);
            if (code >= 65 && code <= 90) {
                continue;
            }
            if (code >= 97 && code <= 122) {
                continue;
            }
            if (code >= 48 && code <= 57) {
                continue;
            }
            if (code === 95) {
                continue;
            }
            return false;
        }
        return true;
    }
    isLowerAlphaNumericWithUnderscoresAndHyphens(str) {
        if (!str || typeof str !== 'string') {
            return false;
        }
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const code = char.charCodeAt(0);
            if (code >= 97 && code <= 122) {
                continue;
            }
            if (code >= 48 && code <= 57) {
                continue;
            }
            if (code === 95) {
                continue;
            }
            if (code === 45) {
                continue;
            }
            return false;
        }
        return true;
    }
    cleanOutfitMacrosFromText(text) {
        if (!text || typeof text !== 'string') {
            return text || '';
        }
        let resultText = text;
        let startIndex = 0;
        while (startIndex < resultText.length) {
            const openIdx = resultText.indexOf('{{', startIndex);
            if (openIdx === -1) {
                break;
            }
            const endIdx = resultText.indexOf('}}', openIdx);
            if (endIdx === -1) {
                break;
            }
            const macroContent = resultText.substring(openIdx + 2, endIdx);
            const underscoreIndex = macroContent.indexOf('_');
            if (underscoreIndex !== -1) {
                const prefix = macroContent.substring(0, underscoreIndex);
                const suffix = macroContent.substring(underscoreIndex + 1);
                const isPrefixValid = prefix === 'char' || prefix === 'user' || this.isAlphaNumericWithUnderscores(prefix);
                const isSuffixValid = this.isLowerAlphaNumericWithUnderscoresAndHyphens(suffix);
                if (isPrefixValid && isSuffixValid) {
                    resultText = resultText.substring(0, openIdx) + '{{}}' + resultText.substring(endIdx + 2);
                    startIndex = openIdx + 2;
                    continue;
                }
            }
            startIndex = endIdx + 2;
        }
        return resultText;
    }
}
export const macroProcessor = new MacroProcessor();
