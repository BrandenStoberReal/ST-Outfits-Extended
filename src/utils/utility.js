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
 * Normalizes text by removing macro values to ensure consistent instance IDs
 * even when dynamic variables change.
 * @param {string} text - The input text.
 * @returns {string} The normalized text with macro values replaced by consistent placeholders.
 */
function normalizeTextForInstanceId(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    let normalizedText = text;
    
    // Replace all macro patterns (like {{getglobalvar::Emma_headwear}} or {{char_topwear}} or {{user_neck-accessory}})
    // with consistent placeholders to ensure stable instance IDs regardless of dynamic content
    
    // First, find and replace all macro patterns with consistent placeholders
    let index = 0;

    while (index < normalizedText.length) {
        const openIdx = normalizedText.indexOf('{{', index);

        if (openIdx === -1) {
            break; // No more potential macros
        }

        const closeIdx = normalizedText.indexOf('}}', openIdx);

        if (closeIdx === -1) {
            break; // Malformed macro, no closing brackets
        }

        const macroContent = normalizedText.substring(openIdx + 2, closeIdx);
        
        // Check if it looks like an outfit macro (contains underscore and a slot name)
        if (macroContent.includes('_')) {
            // This is likely an outfit macro, replace with a stable placeholder
            const parts = macroContent.split('_');
            const slotName = parts.slice(1).join('_'); // Handle slots with hyphens like 'head-accessory'
            
            // Replace the entire macro with a normalized version
            const placeholder = `{{${parts[0]}_${slotName}}}`; // Keep the prefix and slot but normalize the value

            normalizedText = normalizedText.substring(0, openIdx) + 
                            placeholder + 
                            normalizedText.substring(closeIdx + 2);
            
            // Move index to just after the replacement
            index = openIdx + placeholder.length;
        } else {
            // Not an outfit macro, continue to next
            index = closeIdx + 2;
        }
    }
    
    // Also remove any outfit-related terms with their values to ensure consistent instance IDs
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
