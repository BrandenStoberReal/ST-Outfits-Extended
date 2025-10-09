/**
 * Generates a unique instance ID from a given text.
 * Uses the Web Crypto API for a robust hash, with a fallback to a simple hash function.
 * @param {string} text - The input text.
 * @returns {Promise<string>} A promise that resolves to the instance ID.
 */
export async function generateInstanceIdFromText(text) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex.substring(0, 16);
        } catch (err) {
            console.warn('Crypto API not available, falling back to simple hash for instance ID generation', err);
            return generateInstanceIdFromTextSimple(text);
        }
    } else {
        return generateInstanceIdFromTextSimple(text);
    }
}

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
