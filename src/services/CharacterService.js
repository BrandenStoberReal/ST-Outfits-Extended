/**
 * CharacterService - Handles character updates for the Outfit Tracker extension
 */

/**
 * Refresh macro processing after character changes
 */
function refreshMacroProcessing() {
    try {
        if (window.customMacroSystem && typeof window.customMacroSystem.replaceMacrosInText === 'function') {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

            if (context && context.chat) {
                const visibleMessages = Array.from(document.querySelectorAll('#chat .mes'));

                visibleMessages.forEach(messageElement => {
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
    } catch (error) {
        console.error('[OutfitTracker] Error refreshing macro processing:', error);
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
export async function updateForCurrentCharacter(botManager, userManager, botPanel, userPanel) {
    try {
        // Update the bot manager with the current character info
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

        if (context && context.characters && context.characterId !== undefined && context.characterId !== null) {
            const currentChar = context.characters[context.characterId];

            if (currentChar && currentChar.name) {
                botManager.setCharacter(currentChar.name, context.characterId.toString());
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
        
        // Update the outfit store with current context
        if (window.outfitStore) {
            window.outfitStore.setCurrentCharacter(context?.characterId?.toString() || null);
            window.outfitStore.setCurrentChat(context?.chatId || null);
        }
        
        // Optionally trigger a refresh of macro processing after character change
        refreshMacroProcessing();
        
        console.log('[OutfitTracker] Updated outfit managers for current character');
    } catch (error) {
        console.error('[OutfitTracker] Error updating for current character:', error);
        throw error;
    }
}