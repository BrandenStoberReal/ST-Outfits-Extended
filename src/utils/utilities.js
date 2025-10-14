/**
 * Utility functions for Outfit Tracker Extension
 */

/**
 * Generates a short identifier from an ID
 * @param {string} id - The ID to shorten
 * @param {number} maxLength - Maximum length for the shortened ID (default: 8)
 * @returns {string} - The shortened ID
 */
export function generateShortId(id, maxLength = 8) {
    if (!id) {return '';}
    
    // If the ID is already a short identifier, return it
    if (id.startsWith('temp_')) {return 'temp';}
    
    // Create a simple short identifier by taking up to maxLength characters of the ID
    // but only alphanumeric characters for better readability
    const cleanId = id.replace(/[^a-zA-Z0-9]/g, '');
    
    return cleanId.substring(0, maxLength);
}

/**
 * Generates an 8-character hash from a text string
 * @param {string} text - The text to hash
 * @returns {string} - 8-character hash string
 */
export function generateMessageHash(text) {
    if (!text) {return '';}
    
    let hash = 0;
    const str = text.substring(0, 100); // Only use first 100 chars to keep ID manageable
    
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);

        hash = ((hash << 5) - hash) + char;
        hash &= hash; // Convert to 32-bit integer
    }
    
    // Convert to positive and return 8-character string representation
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
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result === null || result === undefined) {
                return defaultValue;
            }
            result = result[key];
        }
        
        return result !== undefined ? result : defaultValue;
    } catch (error) {
        console.error(`Error in safeGet for path "${path}":`, error);
        return defaultValue;
    }
}

/**
 * Formats a slot name for display
 * @param {string} slotName - The slot name to format
 * @returns {string} - The formatted slot name
 */
export function formatSlotName(slotName) {
    // First do some special replacements for confusing terms
    let formattedName = slotName;
    
    // Replace confusing slot names with more descriptive equivalents
    formattedName = formattedName
        .replace('topunderwear', 'Top Underwear / Inner Top')
        .replace('bottomunderwear', 'Bottom Underwear / Inner Bottom')
        .replace('footunderwear', 'Foot Underwear / Socks');

    // Make accessory labels more descriptive
    formattedName = formattedName
        .replace('head-accessory', 'Head Accessory')
        .replace('ears-accessory', 'Ears Accessory')
        .replace('eyes-accessory', 'Eyes Accessory')
        .replace('mouth-accessory', 'Mouth Accessory')
        .replace('neck-accessory', 'Neck Accessory')
        .replace('body-accessory', 'Body Accessory')
        .replace('arms-accessory', 'Arms Accessory')
        .replace('hands-accessory', 'Hands Accessory')
        .replace('waist-accessory', 'Waist Accessory')
        .replace('bottom-accessory', 'Bottom Accessory')
        .replace('legs-accessory', 'Legs Accessory')
        .replace('foot-accessory', 'Foot Accessory');

    // Then apply general formatting
    return formattedName
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, str => str.toUpperCase())
        .replace(/-/g, ' ')
        .replace('underwear', 'Underwear');
}