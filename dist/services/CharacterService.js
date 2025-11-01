var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { outfitStore } from '../stores/Store.js';
import { debouncedStore } from '../stores/DebouncedStore.js';
import { debugLog } from '../logging/DebugLogger.js';
import { CharacterInfoType, getCharacterInfoById } from '../utils/CharacterUtils.js';
/**
 * CharacterService - Handles character updates for the Outfit Tracker extension
 */
/**
 * Refresh macro processing after character changes
 */
function refreshMacroProcessing() {
    var _a;
    try {
        if (window.customMacroSystem && typeof window.customMacroSystem.replaceMacrosInText === 'function') {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            if (context && context.chat) {
                const visibleMessages = Array.from(document.querySelectorAll('#chat .mes'));
                visibleMessages.forEach(messageElement => {
                    // Add null check for parentElement
                    if (!messageElement.parentElement)
                        return;
                    const messageIndex = Array.from(messageElement.parentElement.children).indexOf(messageElement);
                    const message = context.chat[messageIndex];
                    if (message && message.mes && typeof message.mes === 'string') {
                        const originalMes = message.mes;
                        message.mes = window.customMacroSystem.replaceMacrosInText(message.mes);
                        if (originalMes !== message.mes) {
                            const textElement = messageElement.querySelector('.mes_text');
                            if (textElement) {
                                textElement.innerHTML = message.mes;
                            }
                        }
                    }
                });
            }
        }
    }
    catch (error) {
        debugLog('Error refreshing macro processing', error, 'error');
    }
}
/**
 * Updates outfit managers and panels for the current character
 * @param {object} botManager - Bot outfit manager instance
 * @param {object} userManager - User outfit manager instance
 * @param {object} botPanel - Bot outfit panel instance
 * @param {object} userPanel - User outfit panel instance
 * @returns {Promise<void>}
 */
export function updateForCurrentCharacter(botManager, userManager, botPanel, userPanel) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            // Before changing anything, save the current outfit instances with their current instance IDs
            const oldBotInstanceId = botManager.getOutfitInstanceId();
            const oldUserInstanceId = userManager.getOutfitInstanceId();
            // Save the current outfits to their current instances before changing character
            if (oldBotInstanceId && botManager.characterId) {
                const oldBotOutfitData = Object.assign({}, botManager.getCurrentOutfit());
                outfitStore.setBotOutfit(botManager.characterId, oldBotInstanceId, oldBotOutfitData);
            }
            if (oldUserInstanceId) {
                const oldUserOutfitData = Object.assign({}, userManager.getCurrentOutfit());
                outfitStore.setUserOutfit(oldUserInstanceId, oldUserOutfitData);
            }
            // Update the bot manager with the current character info
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            const charId = context.characterId;
            const chatId = context.chatId;
            if (chatId) {
                botManager.setOutfitInstanceId(chatId);
                userManager.setOutfitInstanceId(chatId);
                outfitStore.setCurrentInstanceId(chatId);
            }
            if (charId !== undefined && charId !== null) {
                const characterName = getCharacterInfoById(charId, CharacterInfoType.Name);
                if (characterName) {
                    botManager.setCharacter(characterName, charId.toString());
                }
            }
            // Reload the bot outfit for the new character/instance
            const botOutfitInstanceId = botManager.getOutfitInstanceId();
            botManager.loadOutfit(botOutfitInstanceId);
            // Update the bot panel character name
            if (botPanel) {
                botPanel.updateCharacter(botManager.character);
            }
            // Update the user manager and panel 
            // (User manager uses a standard instance ID and doesn't change based on character)
            userManager.setCharacter('User');
            const userOutfitInstanceId = userManager.getOutfitInstanceId();
            userManager.loadOutfit(userOutfitInstanceId);
            if (userPanel) {
                // Update the header to reflect any changes (like new instance ID)
                userPanel.updateHeader();
            }
            // Update the outfit store with current context and save settings
            if (window.outfitStore) {
                window.outfitStore.setCurrentCharacter(((_b = context === null || context === void 0 ? void 0 : context.characterId) === null || _b === void 0 ? void 0 : _b.toString()) || null);
                window.outfitStore.setCurrentChat((context === null || context === void 0 ? void 0 : context.chatId) || null);
                debouncedStore.saveState();
            }
            // Optionally trigger a refresh of macro processing after character change
            refreshMacroProcessing();
            debugLog('Updated outfit managers for current character', null, 'log');
        }
        catch (error) {
            debugLog('Error updating for current character', error, 'error');
            throw error;
        }
    });
}
