/**
 * CharacterService - Handles character updates for the Outfit Tracker extension
 */

/**
 * Refresh macro processing after character changes
 */
function refreshMacroProcessing() {
    try {
        // If there's a custom macro system reference in the global context, use it
        if (window.customMacroSystem && typeof window.customMacroSystem.replaceMacrosInText === 'function') {
            // Process first message if needed
            const context = window.getContext();

            if (context && context.chat && context.chat.length > 0) {
                const firstBotMessage = context.chat.find(message => !message.is_user && !message.is_system);

                if (firstBotMessage && firstBotMessage.mes) {
                    firstBotMessage.mes = window.customMacroSystem.replaceMacrosInText(firstBotMessage.mes);
                }
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
        const context = window.getContext();

        if (context && context.characters && context.characterId !== undefined && context.characterId !== null) {
            const currentChar = context.characters[context.characterId];

            if (currentChar && currentChar.name) {
                botManager.setCharacter(currentChar.name);
                botManager.setCharacterId(context.characterId.toString());
            }
        }
        
        // Reload the bot outfit for the new character/instance
        botManager.loadOutfit();
        
        // Update the bot panel character name
        if (botPanel) {
            botPanel.updateCharacter(botManager.character);
        }
        
        // Update the user manager and panel 
        // (User manager uses a standard instance ID and doesn't change based on character)
        userManager.setCharacter('User');
        userManager.loadOutfit();
        
        if (userPanel) {
            userPanel.updateCharacter('User');
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