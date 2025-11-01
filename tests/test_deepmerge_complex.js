// Test to simulate the exact scenario that could cause problems
function originalDeepMerge(target, source) {
    const output = Object.assign({}, target);
    if (target && typeof target === 'object' && source && typeof source === 'object') {
        Object.keys(source).forEach((key) => {
            const sourceKey = key;
            const targetKey = key;
            const sourceValue = source[sourceKey];
            if (sourceValue && typeof sourceValue === 'object' && targetKey in target) {
                output[key] = originalDeepMerge(target[targetKey], sourceValue);
            } else {
                output[key] = sourceValue;
            }
        });
    }
    return output;
}

// Simulate a more complex scenario that might occur during app usage
console.log('Testing a scenario where data gets updated gradually:');
const fullStoredData = {
    instances: {
        'char123': {'temp_abc': {topwear: 'shirt', bottomwear: 'pants'}}
    },
    user_instances: {
        'temp_def': {topwear: 'tshirt', bottomwear: 'shorts'}
    },
    presets: {
        bot: {
            'char123_temp_abc': {
                'workout': {topwear: 'tank top', bottomwear: 'shorts'},
                'formal': {topwear: 'blouse', bottomwear: 'skirt'}
            }
        },
        user: {
            'temp_def': {
                'daily': {topwear: 'hoodie', bottomwear: 'sweatpants'}
            }
        }
    },
    settings: {autoOpenBot: true, position: 'right'}
};
// Scenario: User changes outfit for char123_temp_abc, but doesn't touch presets
// This might be how saveOutfitData gets called with current state where presets are temporarily empty in some situations
console.log('Full stored data has presets for char123_temp_abc:', Object.keys(fullStoredData.presets.bot['char123_temp_abc']));
// Now let's simulate what happens when saveOutfitData is called
// with updated instances but maybe an empty presets object somehow
const updateData = {
    instances: {
        'char123': {'temp_abc': {topwear: 'jacket', bottomwear: 'pants', footwear: 'boots'}} // Updated outfit
    },
    user_instances: {
        'temp_def': {topwear: 'tshirt', bottomwear: 'shorts'} // Unchanged
    },
    presets: {} // This would be empty if the in-memory state doesn't have all presets loaded
};
console.log('Calling deepMerge with full data and partial update...');
const result = originalDeepMerge(fullStoredData, updateData);
console.log('After merge, presets for char123_temp_abc:', Object.keys(result.presets.bot['char123_temp_abc'] || {}));
console.log('Presets preserved?', Object.keys(result.presets.bot['char123_temp_abc'] || {}).length > 0);
// This should still work because source.presets is {} and target.presets is a populated object
// So deepMerge(target.presets, {}) would return a copy of target.presets
console.log('Testing the actual problematic case - when the source presets has partial data:');
// Let's say the in-memory state only has presets for the current character
// and other presets are missing
const partialPresetsState = {
    bot: {
        'char456_temp_def': {
            'casual': {topwear: 'sweater', bottomwear: 'jeans'}
        }
    },
    user: {}
};
const updateDataWithPartialPresets = {
    instances: {
        'char123': {'temp_abc': {topwear: 'jacket', bottomwear: 'pants', footwear: 'boots'}}
    },
    user_instances: {
        'temp_def': {topwear: 'tshirt', bottomwear: 'shorts'}
    },
    presets: partialPresetsState // Not empty, but missing other character presets!
};
const result2 = originalDeepMerge(fullStoredData, updateDataWithPartialPresets);
console.log('Before merge - fullStoredData has presets for char123_temp_abc:', Object.keys(fullStoredData.presets.bot['char123_temp_abc']));
console.log('Before merge - fullStoredData has presets for char456_temp_def:', Object.keys(fullStoredData.presets.bot['char456_temp_def'] || {}));
console.log('After merge - result has presets for char123_temp_abc:', Object.keys(result2.presets.bot['char123_temp_abc'] || {})); // This will be empty!
console.log('After merge - result has presets for char456_temp_def:', Object.keys(result2.presets.bot['char456_temp_def'] || {}));
// This shows the real issue! When merging 
// target.presets: {bot: {'char123_temp_abc': {...}, 'char456_temp_def': {...}}}
// source.presets: {bot: {'char456_temp_def': {...}}} 
// The deepMerge will preserve char456_temp_def but will overwrite char123_temp_abc with an empty object
// because it's not present in the source!
