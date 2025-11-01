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
                    // Clean outfit macros from the text (replace {{char_topwear}} with {{}})
                    const processedMessage = this.cleanOutfitMacrosFromText(firstBotMessage.mes);
                    // Get all outfit values for the character to remove from the processed message during ID calculation
                    const outfitValues = this.getAllOutfitValuesForCharacter(ctx.characterId);
                    // Generate instance ID from the processed message with outfit values removed for consistent ID calculation
                    const instanceId = yield generateInstanceIdFromText(processedMessage, outfitValues);
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
    getAllOutfitValuesForCharacter(characterId) {
        if (!characterId) {
            return [];
        }
        const actualCharacterId = characterId.toString();
        const state = outfitStore.getState();
        const outfitValues = new Set();
        // Get all outfit values from all bot instances for this character
        if (state.botInstances && state.botInstances[actualCharacterId]) {
            Object.values(state.botInstances[actualCharacterId]).forEach(instanceData => {
                if (instanceData && instanceData.bot) {
                    Object.values(instanceData.bot).forEach(value => {
                        if (value && typeof value === 'string') { // Include 'None' values as requested
                            outfitValues.add(value);
                        }
                    });
                }
            });
        }
        // Get all preset values for this character
        if (state.presets && state.presets.bot) {
            Object.keys(state.presets.bot).forEach(key => {
                if (key.startsWith(actualCharacterId + '_')) {
                    const presets = state.presets.bot[key];
                    if (presets) {
                        Object.values(presets).forEach(preset => {
                            if (preset) {
                                Object.values(preset).forEach(value => {
                                    if (value && typeof value === 'string') { // Include 'None' values as requested
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
