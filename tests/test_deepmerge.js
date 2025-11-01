'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const utilities_1 = require('../src/utils/utilities');
// Test 1: Original scenario - empty object replacing populated object
console.log('Test 1: Empty source object replacing populated target object');
const target1 = {
    instances: {char123: {default: {topwear: 'shirt'}}},
    user_instances: {},
    presets: {
        bot: {'char123_default': {'preset1': {topwear: 'shirt'}}},
        user: {}
    }
};
const source1 = {
    instances: {char123: {default: {topwear: 'jacket'}}},
    user_instances: {},
    presets: {} // Empty presets - this is the issue!
};
const result1 = (0, utilities_1.deepMerge)(target1, source1);
console.log('Result:', result1);
console.log('Presets preserved?', Object.keys(result1.presets.bot).length > 0); // Should be true but might be false
console.log('---');
// Test 2: Normal merge with populated objects
console.log('Test 2: Normal merge with populated objects');
const target2 = {
    presets: {
        bot: {'char123_default': {'preset1': {topwear: 'shirt'}}},
        user: {}
    }
};
const source2 = {
    presets: {
        bot: {'char456_default': {'preset2': {topwear: 'dress'}}},
        user: {}
    }
};
const result2 = (0, utilities_1.deepMerge)(target2, source2);
console.log('Result:', result2);
console.log('Original preset preserved?', 'preset1' in result2.presets.bot['char123_default']); // Should be true
console.log('New preset added?', 'preset2' in result2.presets.bot['char456_default']); // Should be true
console.log('---');
// Test 3: Empty target, populated source
console.log('Test 3: Empty target, populated source');
const target3 = {};
const source3 = {
    presets: {
        bot: {'char789_default': {'preset3': {topwear: 'coat'}}},
        user: {}
    }
};
const result3 = (0, utilities_1.deepMerge)(target3, source3);
console.log('Result:', result3);
console.log('Result has presets?', 'presets' in result3); // Should be true
console.log('---');
// Test 4: Deeply nested scenario that might occur in the actual app
console.log('Test 4: Complex nested merge similar to app scenario');
const target4 = {
    instances: {'char123': {'temp_abc': {topwear: 'shirt', bottomwear: 'pants'}}},
    user_instances: {'temp_def': {topwear: 'tshirt'}},
    presets: {
        bot: {
            'char123_temp_abc': {
                'workout': {topwear: 'tank top', bottomwear: 'shorts'},
                'formal': {topwear: 'blouse', bottomwear: 'skirt'}
            },
            'char456_temp_def': {
                'casual': {topwear: 'tshirt', bottomwear: 'jeans'}
            }
        },
        user: {
            'temp_123': {
                'daily': {topwear: 'hoodie', bottomwear: 'sweatpants'}
            }
        }
    }
};
const source4 = {
    instances: {'char123': {'temp_abc': {topwear: 'jacket', bottomwear: 'pants', footwear: 'boots'}}},
    user_instances: {'temp_def': {topwear: 'sweater'}},
    presets: {} // This is the likely problem scenario!
};
const result4 = (0, utilities_1.deepMerge)(target4, source4);
console.log('Target presets before merge:', Object.keys(target4.presets.bot['char123_temp_abc'] || {}));
console.log('Source presets:', source4.presets);
console.log('Result presets for char123_temp_abc:', Object.keys(result4.presets.bot['char123_temp_abc'] || {}));
console.log('Presets preserved?', Object.keys(result4.presets.bot['char123_temp_abc'] || {}).length > 0); // This should show the issue
console.log('---');
