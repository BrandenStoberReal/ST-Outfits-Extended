// Define outfit slots for normalization
const CLOTHING_SLOTS = [
    'headwear',
    'topwear', 
    'topunderwear',
    'bottomwear',
    'bottomunderwear', 
    'footwear',
    'footunderwear'
];

const ACCESSORY_SLOTS = [
    'head-accessory',
    'ears-accessory', 
    'eyes-accessory',
    'mouth-accessory',
    'neck-accessory',
    'body-accessory',
    'arms-accessory',
    'hands-accessory',
    'waist-accessory',
    'bottom-accessory',
    'legs-accessory',
    'foot-accessory'
];

const ALL_OUTFIT_SLOTS = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];

function generateInstanceIdFromTextSimple(text) {
    let hash = 0;
    const str = text.substring(0, 100);

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);

        hash = ((hash << 5) - hash) + char;
        hash &= hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Normalizes text by removing outfit variable values to ensure consistent instance IDs
 * even when dynamic variables change.
 * @param {string} text - The input text.
 * @returns {string} The normalized text with outfit variable values removed.
 */
function normalizeTextForInstanceId(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    let normalizedText = text;
    
    // Remove any outfit-related terms with their values
    // This is a simple string replacement approach
    const outfitPhrases = [
        'wearing', 'wears', 'has on', 'is in', 'puts on', 'puts', 'removes', 'took off', 
        'dons', 'donning', 'doffing', 'doffed', 'dressed in', 'clothed in', 'adorned with'
    ];
    
    outfitPhrases.forEach(phrase => {
        let startIndex = 0;

        while (startIndex < normalizedText.length) {
            const phraseIndex = normalizedText.toLowerCase().indexOf(phrase.toLowerCase(), startIndex);

            if (phraseIndex === -1) {break;}
            
            // Find the end of this phrase's associated content (until punctuation or end of sentence)
            let contentEnd = phraseIndex + phrase.length;

            while (contentEnd < normalizedText.length && 
                   !['.', '!', '?', ';', '\n', '\r', ','].includes(normalizedText[contentEnd])) {
                contentEnd++;
            }
            
            // Replace the entire phrase and its content with a normalized version
            const replacement = `${phrase} [ITEM]`;

            normalizedText = normalizedText.substring(0, phraseIndex) + 
                            replacement + 
                            normalizedText.substring(contentEnd);
            
            // Update start index to continue after the replacement
            startIndex = phraseIndex + replacement.length;
        }
    });
    
    return normalizedText;
}

/**
 * Generates a unique instance ID from a given text.
 * Uses the Web Crypto API for a robust hash, with a fallback to a simple hash function.
 * Normalizes the text to ensure consistent instance IDs even when dynamic variables change.
 * @param {string} text - The input text.
 * @returns {Promise<string>} A promise that resolves to the instance ID.
 */
export async function generateInstanceIdFromText(text) {
    // Normalize the text to remove dynamic outfit variable values
    const normalizedText = normalizeTextForInstanceId(text);
    
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(normalizedText);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            return hashHex.substring(0, 16);
        } catch (err) {
            console.warn('Crypto API not available, falling back to simple hash for instance ID generation', err);
            return generateInstanceIdFromTextSimple(normalizedText);
        }
    } else {
        return generateInstanceIdFromTextSimple(normalizedText);
    }
}
