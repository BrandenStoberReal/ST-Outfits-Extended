/**
 * String processing utilities without regex
 */

// Helper function to replace all occurrences of a substring without using regex
export function replaceAll(str, searchValue, replaceValue) {
    if (!searchValue) return str;
    
    // Prevent infinite loops when the replacement value contains the search value
    if (searchValue === replaceValue) return str;
    
    let result = str;
    let index = result.indexOf(searchValue);
    
    while (index !== -1) {
        result = result.substring(0, index) + replaceValue + result.substring(index + searchValue.length);
        // Move past the replacement value to prevent infinite loops
        index = result.indexOf(searchValue, index + replaceValue.length);
    }
    
    return result;
}

// Function to extract all commands matching the pattern without using regex
// Looking for patterns like: outfit-system_wear_headwear("Red Baseball Cap")
export function extractCommands(text) {
    if (!text || typeof text !== 'string') return [];
    
    const commands = [];
    const pattern = 'outfit-system_';
    let startIndex = 0;
    
    while (startIndex < text.length) {
        const patternIndex = text.indexOf(pattern, startIndex);
        if (patternIndex === -1) break;
        
        // Find the action part (wear, remove, change)
        const actionStart = patternIndex + pattern.length;
        const actionEnd = text.indexOf('_', actionStart);
        if (actionEnd === -1) {
            startIndex = patternIndex + 1;
            continue;
        }
        
        const action = text.substring(actionStart, actionEnd);
        
        // Check if action is valid
        if (!['wear', 'remove', 'change'].includes(action)) {
            startIndex = patternIndex + 1;
            continue;
        }
        
        // Find the slot part (headwear, topwear, etc.)
        const slotStart = actionEnd + 1;
        const slotEnd = text.indexOf('(', slotStart);
        if (slotEnd === -1) {
            startIndex = patternIndex + 1;
            continue;
        }
        
        const slot = text.substring(slotStart, slotEnd);
        
        // Validate basic slot format - we'll allow alphanumeric, dash, and underscore characters
        // Instead of using a regex, we'll validate character by character
        let isValidSlot = true;
        for (let i = 0; i < slot.length; i++) {
            const char = slot[i];
            // Check if the character is alphanumeric, underscore, or dash
            if (!((char >= 'a' && char <= 'z') || 
                  (char >= 'A' && char <= 'Z') || 
                  (char >= '0' && char <= '9') || 
                  char === '_' || char === '-')) {
                isValidSlot = false;
                break;
            }
        }
        
        if (!isValidSlot) {
            startIndex = patternIndex + 1;
            continue;
        }
        
        // Find the closing parenthesis for the command
        const parenStart = slotEnd;
        let parenCount = 0;
        let parenEnd = -1;
        let i = parenStart;
        
        // We need to find the matching closing parenthesis
        if (text[i] === '(') {
            parenCount = 1;
            i++;
            
            while (i < text.length && parenCount > 0) {
                if (text[i] === '(') {
                    parenCount++;
                } else if (text[i] === ')') {
                    parenCount--;
                }
                // Handle escaped quotes inside the value
                else if (text[i] === '"') {
                    i++; // Move to the character after the quote
                    while (i < text.length && text[i] !== '"') {
                        if (i < text.length - 1 && text[i] === '\\') {
                            i += 2; // Skip escape character and the next character
                        } else {
                            i++;
                        }
                    }
                    if (i < text.length) i++; // Skip the closing quote
                    continue;
                }
                i++;
            }
            
            if (parenCount === 0) {
                parenEnd = i - 1; // Position at the closing ')'
            }
        }
        
        if (parenEnd === -1) {
            startIndex = patternIndex + 1;
            continue;
        }
        
        const fullCommand = text.substring(patternIndex, parenEnd + 1);
        commands.push(fullCommand);
        startIndex = parenEnd + 1;
    }
    
    return commands;
}

// Function to extract all macro patterns without using regex
// Looking for patterns like: {{getglobalvar::<BOT>_headwear}} or {{getglobalvar::Emma_headwear}}
export function extractMacros(text) {
    if (!text || typeof text !== 'string') return [];
    
    const macros = [];
    const startPattern = '{{getglobalvar::';
    const endPattern = '}}';
    let startIndex = 0;
    
    while (startIndex < text.length) {
        const startIdx = text.indexOf(startPattern, startIndex);
        if (startIdx === -1) break;
        
        const endIdx = text.indexOf(endPattern, startIdx + startPattern.length);
        if (endIdx === -1) {
            // No closing tag found, invalid macro format
            startIndex = startIdx + 1;
            continue;
        }
        
        const fullMacro = text.substring(startIdx, endIdx + 2);
        const varName = text.substring(startIdx + startPattern.length, endIdx);
        
        macros.push({
            fullMacro,
            varName
        });
        
        startIndex = endIdx + 2;
    }
    
    return macros;
}

// Function to extract multiple values from a text without using regex
export function extractValues(text, startMarker, endMarker) {
    if (!text || typeof text !== 'string') return [];
    
    const values = [];
    let startIndex = 0;
    
    while (startIndex < text.length) {
        const startIdx = text.indexOf(startMarker, startIndex);
        if (startIdx === -1) break;
        
        const contentStart = startIdx + startMarker.length;
        const endIdx = text.indexOf(endMarker, contentStart);
        if (endIdx === -1) {
            // No closing marker found, invalid format
            startIndex = startIdx + 1;
            continue;
        }
        
        const value = text.substring(contentStart, endIdx);
        values.push({
            fullMatch: text.substring(startIdx, endIdx + endMarker.length),
            value
        });
        
        startIndex = endIdx + endMarker.length;
    }
    
    return values;
}