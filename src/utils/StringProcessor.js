/**
 * String processing utilities without regex
 */

// Helper function to replace all occurrences of a substring without using regex
export function replaceAll(str, searchValue, replaceValue) {
    if (!searchValue) {return str;}
    
    // Prevent infinite loops when the replacement value contains the search value
    if (searchValue === replaceValue) {return str;}
    
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
// Helper function to find the closing quote, handling escaped quotes
function findClosingQuote(text, startIndex) {
    let i = startIndex;

    while (i < text.length) {
        if (text[i] === '"') {
            return i + 1; // Return the position after the closing quote
        }
        if (text[i] === '\\' && i + 1 < text.length) {
            i += 2; // Skip escaped character
        } else {
            i++;
        }
    }
    return text.length; // Return the end of the string if no closing quote is found
}

function findNextCommand(text, startIndex) {
    const pattern = 'outfit-system_';
    const patternIndex = text.indexOf(pattern, startIndex);

    if (patternIndex === -1) {
        return null;
    }

    const actionStart = patternIndex + pattern.length;
    const actionEnd = text.indexOf('_', actionStart);

    if (actionEnd === -1) {
        return { command: null, nextIndex: patternIndex + 1 };
    }

    const action = text.substring(actionStart, actionEnd);

    if (!['wear', 'remove', 'change'].includes(action)) {
        return { command: null, nextIndex: patternIndex + 1 };
    }

    const slotStart = actionEnd + 1;
    const slotEnd = text.indexOf('(', slotStart);

    if (slotEnd === -1) {
        return { command: null, nextIndex: patternIndex + 1 };
    }

    const slot = text.substring(slotStart, slotEnd);

    if (!/^[a-zA-Z0-9_-]+$/.test(slot)) {
        return { command: null, nextIndex: patternIndex + 1 };
    }

    const parenStart = slotEnd;
    let parenCount = 0;
    let parenEnd = -1;
    let i = parenStart;

    if (text[i] === '(') {
        parenCount = 1;
        i++;

        while (i < text.length && parenCount > 0) {
            if (text[i] === '(') {
                parenCount++;
            } else if (text[i] === ')') {
                parenCount--;
            } else if (text[i] === '"') {
                i = findClosingQuote(text, i + 1);
                continue; // Continue to the next character
            }
            i++;
        }

        if (parenCount === 0) {
            parenEnd = i - 1;
        }
    }

    if (parenEnd === -1) {
        return { command: null, nextIndex: patternIndex + 1 };
    }

    const fullCommand = text.substring(patternIndex, parenEnd + 1);

    return { command: fullCommand, nextIndex: parenEnd + 1 };
}

export function extractCommands(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const commands = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        const result = findNextCommand(text, startIndex);

        if (!result) {
            break;
        }

        if (result.command) {
            commands.push(result.command);
        }

        startIndex = result.nextIndex;
    }

    return commands;
}

// Function to extract all macro patterns without using regex
// Looking for patterns like: {{getglobalvar::<BOT>_headwear}} or {{getglobalvar::Emma_headwear}}
export function extractMacros(text) {
    if (!text || typeof text !== 'string') {return [];}
    
    const macros = [];
    const startPattern = '{{getglobalvar::';
    const endPattern = '}}';
    let startIndex = 0;
    
    while (startIndex < text.length) {
        const startIdx = text.indexOf(startPattern, startIndex);

        if (startIdx === -1) {break;}
        
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
    if (!text || typeof text !== 'string') {return [];}
    
    const values = [];
    let startIndex = 0;
    
    while (startIndex < text.length) {
        const startIdx = text.indexOf(startMarker, startIndex);

        if (startIdx === -1) {break;}
        
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

// Function to safely access nested properties
export function safeGet(obj, path, defaultValue = null) {
    if (!obj || typeof obj !== 'object') {return defaultValue;}
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current === null || current === undefined) {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
}

// Function to safely set nested properties
export function safeSet(obj, path, value) {
    if (!obj || typeof obj !== 'object') {return;}
    
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
        if (current[key] === null || current[key] === undefined || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
}

// Function to remove macros from a string
export function removeMacros(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    // Remove {{...}} and <...> patterns
    return text.replace(/\{\{.*?}}/g, '').replace(/<.*?>/g, '');
}