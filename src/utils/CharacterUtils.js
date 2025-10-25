/**
 * Get character name by character ID
 * @param {string} charId - The character ID to look up
 * @returns {string} The character name or the ID if not found
 */
export function getCharacterNameById(charId) {
    try {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

        if (context && context.characters) {
            const character = context.characters[charId];

            if (character && character.name) {
                return character.name;
            }
        }

        return charId || 'Unknown';
    } catch (error) {
        console.error('Error getting character name by ID:', error);
        return charId || 'Unknown';
    }
}