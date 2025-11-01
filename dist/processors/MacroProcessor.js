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
            var _a, _b, _c, _d, _e;
            try {
                const ctx = context || (((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null));
                if (!ctx || !ctx.chat) {
                    return;
                }
                const firstBotMessage = ctx.chat.find((message) => !message.is_user && !message.is_system);
                if (firstBotMessage) {
                    // Get ALL outfit values for the character, including "None" fields
                    const allOutfitValues = this.getAllOutfitValuesForCharacter(ctx.characterId);
                    // Also include any outfit values that might be in the current managers
                    if ((_b = window.botOutfitPanel) === null || _b === void 0 ? void 0 : _b.outfitManager) {
                        const currentOutfit = window.botOutfitPanel.outfitManager.getCurrentOutfit();
                        Object.values(currentOutfit).forEach(value => {
                            if (value && typeof value === 'string' && !allOutfitValues.includes(value)) {
                                allOutfitValues.push(value);
                            }
                        });
                    }
                    if ((_c = window.userOutfitPanel) === null || _c === void 0 ? void 0 : _c.outfitManager) {
                        const currentUserOutfit = window.userOutfitPanel.outfitManager.getCurrentOutfit();
                        Object.values(currentUserOutfit).forEach(value => {
                            if (value && typeof value === 'string' && !allOutfitValues.includes(value)) {
                                allOutfitValues.push(value);
                            }
                        });
                    }
                    const processedMessage = this.cleanOutfitMacrosFromText(firstBotMessage.mes);
                    const instanceId = yield generateInstanceIdFromText(processedMessage, allOutfitValues);
                    outfitStore.setCurrentInstanceId(instanceId);
                    if ((_d = window.botOutfitPanel) === null || _d === void 0 ? void 0 : _d.outfitManager) {
                        window.botOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                    }
                    if ((_e = window.userOutfitPanel) === null || _e === void 0 ? void 0 : _e.outfitManager) {
                        window.userOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                    }
                }
            }
            catch (error) {
                console.error('[OutfitTracker] Error processing macros in first message:', error);
            }
        });
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
        var _a;
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
        const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        if (!context || !context.characterId) {
            return resultText;
        }
        const characterId = context.characterId.toString();
        const state = outfitStore.getState();
        const outfitValues = new Set();
        if (state.botInstances && state.botInstances[characterId]) {
            Object.values(state.botInstances[characterId]).forEach(instanceData => {
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
                if (key.startsWith(characterId + '_')) {
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
        const sortedValues = Array.from(outfitValues).sort((a, b) => b.length - a.length);
        let workingText = resultText;
        sortedValues.forEach(outfitValue => {
            if (outfitValue && typeof outfitValue === 'string') {
                let tempText = workingText;
                let lowerTempText = tempText.toLowerCase();
                let lowerOutfitValue = outfitValue.toLowerCase();
                let searchStart = 0;
                while ((searchStart = lowerTempText.indexOf(lowerOutfitValue, searchStart)) !== -1) {
                    const endIndex = searchStart + lowerOutfitValue.length;
                    const beforeChar = searchStart > 0 ? lowerTempText.charAt(searchStart - 1) : ' ';
                    const afterChar = endIndex < lowerTempText.length ? lowerTempText.charAt(endIndex) : ' ';
                    const isWordBoundary = (beforeChar === ' ' || beforeChar === '.' || beforeChar === ',' ||
                        beforeChar === '"' || beforeChar === '\'' ||
                        beforeChar === '(' || beforeChar === '[' ||
                        beforeChar === '\n' || beforeChar === '\t') &&
                        (afterChar === ' ' || afterChar === '.' || afterChar === ',' ||
                            afterChar === '"' || afterChar === '\'' ||
                            afterChar === ')' || afterChar === ']'
                            || afterChar === '\n' || afterChar === '\t');
                    if (isWordBoundary) {
                        workingText = workingText.substring(0, searchStart) + '[OUTFIT_REMOVED]' + workingText.substring(endIndex);
                        lowerTempText = workingText.toLowerCase();
                        searchStart += '[OUTFIT_REMOVED]'.length;
                    }
                    else {
                        searchStart = endIndex;
                    }
                }
            }
        });
        return workingText;
    }
}
export const macroProcessor = new MacroProcessor();
