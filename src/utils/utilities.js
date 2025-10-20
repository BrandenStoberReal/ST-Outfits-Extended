/**
 * Utility functions for Outfit Tracker Extension
 */

export function generateShortId(id, maxLength = 8) {
    if (!id) {return '';}
    if (id.startsWith('temp_')) {return 'temp';}
    
    const cleanId = id.replace(/[^a-zA-Z0-9]/g, '');

    return cleanId.substring(0, maxLength) || id.substring(0, maxLength);
}

/**
 * Generates an 8-character hash from a text string
 * @param {string} text - The text to hash
 * @returns {string} - 8-character hash string
 */
export function generateMessageHash(text) {
    if (!text) {return '';}
    
    let hash = 0;
    const str = text.substring(0, 100);
    
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);

        hash = ((hash << 5) - hash) + char;
        hash &= hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36).substring(0, 8).padEnd(8, '0');
}

/**
 * Sleep function to pause execution
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after ms milliseconds
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validates if a slot name is valid
 * @param {string} slotName - The slot name to validate
 * @param {Array} allSlots - Array of all valid slot names
 * @returns {boolean} - True if the slot name is valid
 */
export function isValidSlot(slotName, allSlots) {
    return allSlots && Array.isArray(allSlots) && allSlots.includes(slotName);
}

/**
 * Safely gets a nested property from an object
 * @param {object} obj - The object to get the property from
 * @param {string} path - Dot notation path to the property
 * @param {*} defaultValue - Value to return if path doesn't exist
 * @returns {*} - The value at the path or the default value
 */
export function safeGet(obj, path, defaultValue = null) {
    try {
        return path.split('.').reduce((acc, key) => acc && acc[key], obj) || defaultValue;
    } catch (error) {
        console.error(`Error in safeGet for path "${path}":`, error);
        return defaultValue;
    }
}

const slotNameMap = {
    'topunderwear': 'Top Underwear / Inner Top',
    'bottomunderwear': 'Bottom Underwear / Inner Bottom',
    'footunderwear': 'Foot Underwear / Socks',
    'head-accessory': 'Head Accessory',
    'ears-accessory': 'Ears Accessory',
    'eyes-accessory': 'Eyes Accessory',
    'mouth-accessory': 'Mouth Accessory',
    'neck-accessory': 'Neck Accessory',
    'body-accessory': 'Body Accessory',
    'arms-accessory': 'Arms Accessory',
    'hands-accessory': 'Hands Accessory',
    'waist-accessory': 'Waist Accessory',
    'bottom-accessory': 'Bottom Accessory',
    'legs-accessory': 'Legs Accessory',
    'foot-accessory': 'Foot Accessory'
};

/**
 * Formats a slot name for display
 * @param {string} slotName - The slot name to format
 * @returns {string} - The formatted slot name
 */
export function formatSlotName(slotName) {
    if (slotNameMap[slotName]) {
        return slotNameMap[slotName];
    }

    return slotName
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, str => str.toUpperCase())
        .replace(/-/g, ' ')
        .replace('underwear', 'Underwear');
}

function generateInstanceIdFromTextSimple(text) {
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);

        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Normalizes text by removing macro values to ensure consistent instance IDs.
 * @param {string} text - The input text.
 * @returns {string} The normalized text.
 */
function normalizeTextForInstanceId(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    let result = text;
    let startIndex = 0;

    while (startIndex < result.length) {
        const openIdx = result.indexOf('{{', startIndex);

        if (openIdx === -1) {
            break;
        }
        
        const closeIdx = result.indexOf('}}', openIdx);

        if (closeIdx === -1) {
            break;
        }
        
        // Replace the entire {{...}} pattern with {{}}
        result = result.substring(0, openIdx) + '{{}}' + result.substring(closeIdx + 2);
        // Advance startIndex to the next position after the replacement
        startIndex = openIdx + '{{}}'.length;
    }
    
    return result;
}

/**
 * Generates a unique instance ID from a given text.
 * @param {string} text - The input text.
 * @param {Array<string>} [valuesToRemove] - Optional array of values to remove from the text before hashing.
 * @returns {Promise<string>} A promise that resolves to the instance ID.
 */
export async function generateInstanceIdFromText(text, valuesToRemove = null) {
    let processedText = text;
    
    // If specific values to remove are provided, remove them from the text
    if (valuesToRemove && Array.isArray(valuesToRemove)) {
        valuesToRemove.forEach(value => {
            if (value && typeof value === 'string') {
                // Remove the value case-insensitively
                let tempText = processedText;
                let lowerTempText = tempText.toLowerCase();
                let lowerValue = value.toLowerCase();
                
                let startIndex = 0;

                while ((startIndex = lowerTempText.indexOf(lowerValue, startIndex)) !== -1) {
                    // Check if it's a complete word match to avoid partial replacements
                    const endIndex = startIndex + lowerValue.length;
                    
                    // Check if it's surrounded by word boundaries
                    const beforeChar = startIndex > 0 ? lowerTempText.charAt(startIndex - 1) : ' ';
                    const afterChar = endIndex < lowerTempText.length ? lowerTempText.charAt(endIndex) : ' ';
                    
                    if ((beforeChar === ' ' || beforeChar === '.' || beforeChar === ',' || beforeChar === '"' || beforeChar === '\'' || beforeChar === '(' || beforeChar === '[') &&
                        (afterChar === ' ' || afterChar === '.' || afterChar === ',' || afterChar === '"' || afterChar === '\'' || afterChar === ')' || afterChar === ']')) {
                        processedText = processedText.substring(0, startIndex) + '[OUTFIT_REMOVED]' + processedText.substring(endIndex);
                        lowerTempText = processedText.toLowerCase();
                    }
                    
                    startIndex = endIndex;
                }
            }
        });
    }
    
    const normalizedText = normalizeTextForInstanceId(processedText);
    
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(normalizedText);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));

            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
        } catch (err) {
            console.warn('Crypto API failed, falling back to simple hash for instance ID generation', err);
            return generateInstanceIdFromTextSimple(normalizedText);
        }
    } else {
        return generateInstanceIdFromTextSimple(normalizedText);
    }
}