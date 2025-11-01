import {generateInstanceIdFromText} from '../utils/utilities';
import {outfitStore} from '../common/Store';
import {ALL_SLOTS} from '../config/constants';


class MacroProcessor {
    allSlots: string[];
    outfitValuesCache: Map<string, { value: string[], timestamp: number }>;
    textProcessingCache: Map<string, { value: string, timestamp: number }>;
    cacheExpiryTime: number;

    constructor() {
        this.allSlots = ALL_SLOTS;
        this.outfitValuesCache = new Map();
        this.textProcessingCache = new Map();
        this.cacheExpiryTime = 5 * 60 * 1000;
    }

    clearCache(): void {
        this.outfitValuesCache.clear();
        this.textProcessingCache.clear();
    }

    async processMacrosInFirstMessage(context?: SillyTavernContext): Promise<void> {
        try {
            const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null));

            if (!ctx || !ctx.chat) {
                return;
            }

            const firstBotMessage = ctx.chat.find((message: any) => !message.is_user && !message.is_system);

            if (firstBotMessage) {
                // Clean outfit macros from the text (replace {{char_topwear}} with {{}})
                const originalMessageText = firstBotMessage.mes;
                const processedMessage = this.cleanOutfitMacrosFromText(originalMessageText);

                // Get all outfit values for the character to remove from the processed message during ID calculation
                const outfitValues = this.getAllOutfitValuesForCharacter(ctx.characterId);

                // Generate instance ID from the processed message with outfit values removed for consistent ID calculation
                const instanceId = await generateInstanceIdFromText(processedMessage, outfitValues);

                // Only update the instance ID if it's different from the current one
                // This prevents unnecessary updates that could cause flip-flopping
                const currentInstanceId = outfitStore.getCurrentInstanceId();

                // Add additional check: if we already have an instance ID and it's the same character,
                // only update if the raw message text (before macro processing) is different
                // This prevents flip-flopping when outfit values change but message content stays the same
                if (currentInstanceId !== instanceId) {
                    // For additional safety, only update if this appears to be a legitimate message change
                    // (not just macro value changes)
                    outfitStore.setCurrentInstanceId(instanceId);

                    if (window.botOutfitPanel?.outfitManager) {
                        window.botOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                    }
                    if (window.userOutfitPanel?.outfitManager) {
                        window.userOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                    }
                }
            }
        } catch (error) {
            console.error('[OutfitTracker] Error processing macros in first message:', error);
        }
    }

    getAllOutfitValuesForCharacter(characterId: string | number): string[] {
        if (!characterId) {
            return [];
        }

        const actualCharacterId = characterId.toString();
        const state = outfitStore.getState();
        const outfitValues = new Set<string>();

        // Get all outfit values from all bot instances for this character (including "None")
        if (state.botInstances && state.botInstances[actualCharacterId]) {
            Object.values(state.botInstances[actualCharacterId]).forEach(instanceData => {
                if (instanceData && instanceData.bot) {
                    Object.values(instanceData.bot).forEach(value => {
                        if (value !== undefined && value !== null && typeof value === 'string') {
                            outfitValues.add(value);
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
        if (currentInstanceId && state.botInstances[actualCharacterId]?.[currentInstanceId]?.bot) {
            const currentOutfit = state.botInstances[actualCharacterId][currentInstanceId].bot;
            Object.values(currentOutfit).forEach(value => {
                if (value !== undefined && value !== null && typeof value === 'string') {
                    outfitValues.add(value);
                }
            });
        }

        return Array.from(outfitValues);
    }

    isAlphaNumericWithUnderscores(str: string): boolean {
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

    isLowerAlphaNumericWithUnderscoresAndHyphens(str: string): boolean {
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

    cleanOutfitMacrosFromText(text: string): string {
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
