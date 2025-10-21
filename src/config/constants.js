// Constants for Outfit Tracker Extension
export const CLOTHING_SLOTS = [
    'headwear', 'topwear', 'topunderwear', 'bottomwear',
    'bottomunderwear', 'footwear', 'footunderwear'
];

export const ACCESSORY_SLOTS = [
    'head-accessory', 'ears-accessory', 'eyes-accessory', 'mouth-accessory',
    'neck-accessory', 'body-accessory', 'arms-accessory', 'hands-accessory',
    'waist-accessory', 'bottom-accessory', 'legs-accessory', 'foot-accessory'
];

export const ALL_SLOTS = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];



export const DEFAULT_SETTINGS = Object.freeze({
    autoOpenBot: true,
    autoOpenUser: false,
    position: 'right',
    enableSysMessages: true,
    autoOutfitSystem: false,
    autoOutfitPrompt: 'After each character response, analyze the conversation to identify any outfit changes (items worn, removed, or changed). Provide updates in the format: "/outfit-wear slotName item", "/outfit-remove slotName", or "/outfit-change slotName newItem". Only output the commands, no additional text.',
    autoOutfitConnectionProfile: null,
    botPanelColors: {
        primary: 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)',
        border: '#8a7fdb',
        shadow: 'rgba(106, 79, 193, 0.4)'
    },
    userPanelColors: {
        primary: 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)',
        border: '#5da6f0',
        shadow: 'rgba(26, 120, 209, 0.4)'
    }
});

export const OUTFIT_COMMANDS = {
    WEAR: 'wear',
    REMOVE: 'remove',
    CHANGE: 'change'
};