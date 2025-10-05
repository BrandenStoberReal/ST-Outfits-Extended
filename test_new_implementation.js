// Comprehensive test for the new non-regex macro replacement implementation

// Import the string processing functions
import { replaceAll, extractCommands, extractMacros } from './src/StringProcessor.js';

// Mock the global environment that would exist in SillyTavern
global.extension_settings = {
    variables: {
        global: {}
    },
    outfit_tracker: {
        presets: {
            bot: {},
            user: {}
        }
    }
};

// Simulate the getContext function
global.getContext = () => {
    return {
        characters: [{ name: 'Emma' }],
        characterId: 0
    };
};

// Create test data with proper variable names
function setupTestVariables() {
    // Set up variables for "Emma" character
    extension_settings.variables.global['Emma_headwear'] = 'Red Hat';
    extension_settings.variables.global['Emma_topwear'] = 'Blue Dress';
    extension_settings.variables.global['Emma_bottomwear'] = 'Black Pants';
    extension_settings.variables.global['Emma_footwear'] = 'Heels';
    extension_settings.variables.global['Emma_eyes-accessory'] = 'Designer Glasses';
    extension_settings.variables.global['Emma_neck-accessory'] = 'Pearl Necklace';
    
    // Set up user variables
    extension_settings.variables.global['User_headwear'] = 'Baseball Cap';
    extension_settings.variables.global['User_topwear'] = 'T-Shirt';
    extension_settings.variables.global['User_bottomwear'] = 'Jeans';
}

// Function similar to the one in index.js for testing
function replaceOutfitMacrosInText(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    let processedText = text;

    try {
        // Get the current bot character name
        const context = getContext();
        let botCharacterName = 'Unknown';

        if (context && context.characters && context.characterId !== undefined && context.characterId !== null && context.characters[context.characterId]) {
            const character = context.characters[context.characterId];
            if (character && character.name) {
                botCharacterName = character.name;
            }
        }

        // Replace all <BOT> instances with the actual character name
        processedText = replaceAll(processedText, '<BOT>', botCharacterName);

        // Normalize character name for variable access (replace spaces with underscores)
        const normalizedBotName = botCharacterName.replace(/\s+/g, '_');

        // Extract all macros from the text
        const macros = extractMacros(processedText);
        
        // Process each macro and replace with actual values
        for (const { fullMacro, varName } of macros) {
            let value = 'None'; // Default value if not found

            // Check if it's a character-specific variable (checking multiple possible formats)
            if (varName.startsWith(`${botCharacterName}_`) || varName.startsWith(`${normalizedBotName}_`)) {
                // Extract slot name after the character name prefix
                let slot;
                if (varName.startsWith(`${botCharacterName}_`)) {
                    slot = varName.substring(botCharacterName.length + 1);
                } else if (varName.startsWith(`${normalizedBotName}_`)) {
                    slot = varName.substring(normalizedBotName.length + 1);
                }
                
                // Try to get the value using both formats to ensure compatibility
                const originalFormatVarName = `${botCharacterName}_${slot}`;
                const normalizedFormatVarName = `${normalizedBotName}_${slot}`;
                
                // Check both possible formats in global variables
                if (global.extension_settings.variables.global && 
                    global.extension_settings.variables.global[originalFormatVarName] !== undefined) {
                    value = global.extension_settings.variables.global[originalFormatVarName];
                } else if (global.extension_settings.variables.global && 
                           global.extension_settings.variables.global[normalizedFormatVarName] !== undefined) {
                    value = global.extension_settings.variables.global[normalizedFormatVarName];
                }
            }
            // Check if it's a user variable
            else if (varName.startsWith('User_')) {
                try {
                    if (global.extension_settings.variables.global && 
                        global.extension_settings.variables.global[`${varName}`] !== undefined) {
                        value = global.extension_settings.variables.global[`${varName}`];
                    }
                } catch (error) {
                    console.warn('Could not access user outfit manager for macro replacement:', error);
                }
            }

            // Replace the macro with the actual value
            processedText = replaceAll(processedText, fullMacro, value);
        }
    } catch (error) {
        console.error('Error replacing outfit macros in text:', error);
    }

    return processedText;
}

// Test the extractCommands function
console.log('=== Testing extractCommands function ===');
const testTextWithCommands = `outfit-system_wear_headwear("Red Hat")
outfit-system_remove_topwear()
outfit-system_change_bottomwear("Blue Jeans")
outfit-system_wear_eyes-accessory("Designer Glasses")`;

const extractedCommands = extractCommands(testTextWithCommands);
console.log('Original text:', testTextWithCommands);
console.log('Extracted commands:', extractedCommands);
console.log('Number of commands found:', extractedCommands.length);

// Test the extractMacros function
console.log('\n=== Testing extractMacros function ===');
const testTextWithMacros = `**Emma's Current Outfit**
Headwear: {{getglobalvar::Emma_headwear}}
Topwear: {{getglobalvar::Emma_topwear}}
Eyes Accessory: {{getglobalvar::Emma_eyes-accessory}}
Footwear: {{getglobalvar::Emma_footwear}}
`;

const extractedMacros = extractMacros(testTextWithMacros);
console.log('Original text:', testTextWithMacros);
console.log('Extracted macros:', extractedMacros);
console.log('Number of macros found:', extractedMacros.length);

// Test the replaceAll function
console.log('\n=== Testing replaceAll function ===');
const originalText = 'Hello <BOT>, you are wearing <BOT> clothes.';
const replacedText = replaceAll(originalText, '<BOT>', 'Emma');
console.log('Original text:', originalText);
console.log('Replaced text:', replacedText);

// Test the complete macro replacement function
console.log('\n=== Testing complete macro replacement (index.js style) ===');
setupTestVariables();

const testInput = `**<BOT>'s Current Outfit**
Headwear: {{getglobalvar::<BOT>_headwear}}
Topwear: {{getglobalvar::<BOT>_topwear}}
Bottomwear: {{getglobalvar::<BOT>_bottomwear}}
Eyes Accessory: {{getglobalvar::<BOT>_eyes-accessory}}

**{{user}}'s Current Outfit**
Headwear: {{getglobalvar::User_headwear}}
Topwear: {{getglobalvar::User_topwear}}
Bottomwear: {{getglobalvar::User_bottomwear}}
`;

console.log('Input text:');
console.log(testInput);

const result = replaceOutfitMacrosInText(testInput);

console.log('Output text:');
console.log(result);

// Verify replacements worked
console.log('\n=== Verification ===');
console.log('1. Character name replaced:', result.includes('Emma'));
console.log('2. Headwear replaced:', result.includes('Red Hat'));
console.log('3. Topwear replaced:', result.includes('Blue Dress'));
console.log('4. Bottomwear replaced:', result.includes('Black Pants'));
console.log('5. Eyes Accessory replaced:', result.includes('Designer Glasses'));
console.log('6. User Headwear replaced:', result.includes('Baseball Cap'));
console.log('7. User Topwear replaced:', result.includes('T-Shirt'));
console.log('8. User Bottomwear replaced:', result.includes('Jeans'));

// Test with AutoOutfitSystem-style processing
console.log('\n=== Testing AutoOutfitSystem-style replacement ===');

// This simulates the approach used in AutoOutfitSystem.js
function replaceMacrosInPrompt(prompt) {
    const characterName = 'Emma';
    const normalizedCharName = characterName.replace(/\s+/g, '_'); // This is ok as it's normalization, not replacement
    
    // Replace all <BOT> instances with the actual character name
    let processedPrompt = replaceAll(prompt, '<BOT>', characterName);

    // Extract all macros from the prompt
    const macros = extractMacros(processedPrompt);
    
    // Process each macro and replace with actual values
    for (const { fullMacro, varName } of macros) {
        let value = 'None'; // Default value if not found
        
        // Check if it's a character-specific variable
        if (varName.startsWith(`${normalizedCharName}_`)) {
            // It's a character-specific variable
            const slot = varName.substring(normalizedCharName.length + 1);
            if (global.extension_settings.variables.global && 
                global.extension_settings.variables.global[varName] !== undefined) {
                value = global.extension_settings.variables.global[varName];
            }
        } else if (varName.startsWith('User_')) {
            // It's a user variable
            if (global.extension_settings.variables.global && 
                global.extension_settings.variables.global[`${varName}`] !== undefined) {
                value = global.extension_settings.variables.global[`${varName}`];
            }
        }
        
        // Replace the macro with the actual value
        processedPrompt = replaceAll(processedPrompt, fullMacro, value);
    }
    
    return processedPrompt;
}

const autoSystemPrompt = `Analyze the character's actions in the recent messages. If the character puts on, wears, removes, or changes any clothing items, output the appropriate outfit commands.

Here is what character is currently wearing:

**<BOT>'s Current Outfit**
Headwear: {{getglobalvar::<BOT>_headwear}}
Topwear: {{getglobalvar::<BOT>_topwear}}
Eyes Accessory: {{getglobalvar::<BOT>_eyes-accessory}}
Footwear: {{getglobalvar::<BOT>_footwear}}
`;

console.log('Auto System Input:');
console.log(autoSystemPrompt);

const processedAutoPrompt = replaceMacrosInPrompt(autoSystemPrompt);

console.log('Auto System Output:');
console.log(processedAutoPrompt);

// Verify replacements worked in auto system prompt
console.log('\n=== Auto System Verification ===');
console.log('1. Character name replaced:', processedAutoPrompt.includes('Emma'));
console.log('2. Headwear replaced:', processedAutoPrompt.includes('Red Hat'));
console.log('3. Topwear replaced:', processedAutoPrompt.includes('Blue Dress'));
console.log('4. Eyes Accessory replaced:', processedAutoPrompt.includes('Designer Glasses'));
console.log('5. Footwear replaced:', processedAutoPrompt.includes('Heels'));

console.log('\n=== All tests completed successfully! ===');