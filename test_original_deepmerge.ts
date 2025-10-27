// Test the original deepMerge function logic with an empty source object
function originalDeepMerge<T extends object, U extends object>(target: T, source: U): T & U {
    const output = {...target} as T & U;

    if (target && typeof target === 'object' && source && typeof source === 'object') {
        Object.keys(source).forEach((key) => {
            const sourceKey = key as keyof U;
            const targetKey = key as keyof T;
            const sourceValue = source[sourceKey];

            if (sourceValue && typeof sourceValue === 'object' && (targetKey as any) in target) {
                (output as any)[key] = originalDeepMerge((target as any)[targetKey], sourceValue);
            } else {
                (output as any)[key] = sourceValue;
            }
        });
    }

    return output;
}

// Test: Empty source object replacing populated target object  
console.log('Testing ORIGINAL deepMerge function with empty source:');
const target = {
    presets: {
        bot: {'char123_default': {'preset1': {topwear: 'shirt'}}},
        user: {}
    }
};

const source = {
    presets: {}  // Empty presets
};

const result = originalDeepMerge(target, source);
console.log('Target presets before merge:', Object.keys(target.presets.bot['char123_default'] || {}));
console.log('Source presets:', source.presets);
console.log('Result presets for char123_default:', Object.keys(result.presets.bot['char123_default'] || {}));
console.log('Presets preserved?', Object.keys(result.presets.bot['char123_default'] || {}).length > 0);
console.log('Full result:', result);