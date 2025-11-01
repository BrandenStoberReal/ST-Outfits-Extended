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
                    // Try to get characterId from context first, then from the first bot message
                    let characterId = ctx.characterId;
                    if (!characterId && firstBotMessage.name) {
                        // Look for the character in the context's characters array based on the message name
                        if (ctx.characters && Array.isArray(ctx.characters)) {
                            const characterIndex = ctx.characters.findIndex((char) => (char === null || char === void 0 ? void 0 : char.name) === firstBotMessage.name);
                            if (characterIndex !== -1) {
                                characterId = characterIndex;
                            }
                        }
                    }
                    // Get all outfit values for the character to remove from the message during ID calculation
                    // Only proceed if we have a valid characterId
                    let outfitValues = [];
                    if (characterId !== undefined && characterId !== null) {
                        outfitValues = this.getAllOutfitValuesForCharacter(characterId);
                    }
                    // Start with the original message text
                    let processedMessage = firstBotMessage.mes;
                    // Clean outfit macros from the text (replace {{char_topwear}} with {{}})
                    processedMessage = this.cleanOutfitMacrosFromText(processedMessage);
                    // Remove all outfit values (including "None" and actual outfit names) from the message text
                    // This prevents the instance ID from changing when outfit values change
                    for (const value of outfitValues) {
                        if (value && typeof value === 'string' && value.trim() !== '') {
                            // Use a global case-insensitive replace to remove the value
                            // Escape special regex characters in the value
                            const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const regex = new RegExp(escapedValue, 'gi');
                            processedMessage = processedMessage.replace(regex, '');
                        }
                    }
                    // Clean up extra whitespace that might result from replacements
                    processedMessage = processedMessage.replace(/\s+/g, ' ').trim();
                    console.log('[OutfitTracker] Instance ID generation debug:');
                    console.log('[OutfitTracker] Original message text:', firstBotMessage.mes);
                    console.log('[OutfitTracker] Processed message text (macros and outfit values cleaned):', processedMessage);
                    console.log('[OutfitTracker] Character ID used:', characterId);
                    console.log('[OutfitTracker] Outfit values removed:', outfitValues);
                    // Generate instance ID from the processed message with outfit values removed for consistent ID calculation
                    const instanceId = yield generateInstanceIdFromText(processedMessage, []);
                    console.log('[OutfitTracker] Generated instance ID:', instanceId);
                    // Only update the instance ID if it's different from the current one
                    // This prevents unnecessary updates that could cause flip-flopping
                    const currentInstanceId = outfitStore.getCurrentInstanceId();
                    console.log('[OutfitTracker] Current instance ID:', currentInstanceId);
                    if (currentInstanceId !== instanceId) {
                        console.log('[OutfitTracker] Instance ID changed from', currentInstanceId, 'to', instanceId, '- updating...');
                        outfitStore.setCurrentInstanceId(instanceId);
                        if ((_b = window.botOutfitPanel) === null || _b === void 0 ? void 0 : _b.outfitManager) {
                            window.botOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                        }
                        if ((_c = window.userOutfitPanel) === null || _c === void 0 ? void 0 : _c.outfitManager) {
                            window.userOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                        }
                    }
                    else {
                        console.log('[OutfitTracker] Instance ID unchanged - no update needed');
                    }
                }
            }
            catch (error) {
                console.error('[OutfitTracker] Error processing macros in first message:', error);
            }
        });
    }
    getAllOutfitValuesForCharacter(characterId) {
        var _a, _b;
        if (!characterId) {
            console.log('[OutfitTracker] getAllOutfitValuesForCharacter called with no characterId');
            return [];
        }
        const actualCharacterId = characterId.toString();
        const state = outfitStore.getState();
        const outfitValues = new Set();
        console.log('[OutfitTracker] Collecting outfit values for character:', actualCharacterId);
        console.log('[OutfitTracker] Current state instance ID:', state.currentOutfitInstanceId);
        // Get all outfit values from all bot instances for this character (including "None")
        if (state.botInstances && state.botInstances[actualCharacterId]) {
            console.log('[OutfitTracker] Found bot instances for character:', Object.keys(state.botInstances[actualCharacterId]));
            Object.values(state.botInstances[actualCharacterId]).forEach(instanceData => {
                if (instanceData && instanceData.bot) {
                    Object.values(instanceData.bot).forEach(value => {
                        if (value !== undefined && value !== null && typeof value === 'string') {
                            outfitValues.add(value);
                            console.log('[OutfitTracker] Added outfit value from instance:', value);
                        }
                    });
                }
            });
        }
        // Get all preset values for this character (including "None")
        if (state.presets && state.presets.bot) {
            Object.keys(state.presets.bot).forEach(key => {
                if (key.startsWith(actualCharacterId + '_')) {
                    const presets = state.presets.bot[key];
                    if (presets) {
                        Object.values(presets).forEach(preset => {
                            if (preset) {
                                Object.values(preset).forEach(value => {
                                    if (value !== undefined && value !== null && typeof value === 'string') {
                                        outfitValues.add(value);
                                        console.log('[OutfitTracker] Added preset value:', value);
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }
        // Also include current outfit values for this character if available
        const currentInstanceId = state.currentOutfitInstanceId;
        if (currentInstanceId && ((_b = (_a = state.botInstances[actualCharacterId]) === null || _a === void 0 ? void 0 : _a[currentInstanceId]) === null || _b === void 0 ? void 0 : _b.bot)) {
            const currentOutfit = state.botInstances[actualCharacterId][currentInstanceId].bot;
            Object.values(currentOutfit).forEach(value => {
                if (value !== undefined && value !== null && typeof value === 'string') {
                    outfitValues.add(value);
                    console.log('[OutfitTracker] Added current outfit value:', value);
                }
            });
        }
        const allValues = Array.from(outfitValues);
        console.log('[OutfitTracker] All collected outfit values:', allValues);
        return allValues;
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
        // First, clean outfit macro patterns like {{char_topwear}} -> {{}}
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
        // Additional cleaning: Remove "None" text that might be the result of macro replacement
        // This handles cases where "{{char_topwear}}" was replaced with "None" in the message
        resultText = resultText.replace(/\bNone\b/g, "");
        // Clean up any double spaces that might result from the removal
        resultText = resultText.replace(/\s+/g, " ").trim();
        return resultText;
    }
}
export const macroProcessor = new MacroProcessor();
