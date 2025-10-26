"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CharacterInfoType = void 0;
exports.getCharacterInfoById = getCharacterInfoById;
exports.getCharacters = getCharacters;
exports.getCharacterIdByObject = getCharacterIdByObject;
const DebugLogger_1 = require("../logging/DebugLogger");
exports.CharacterInfoType = {
    Name: 'CharName',
    Description: 'CharDesc',
    Personality: 'CharPersonality',
    Scenario: 'CharScenario',
    DefaultMessage: 'CharDefaultMessage',
    ExampleMessage: 'CharExampleMessage',
    CreatorComment: 'CharCreatorComment',
    Avatar: 'CharAvatar',
    Talkativeness: 'CharTalkativeness',
    Favorited: 'CharFavorited',
    Tags: 'CharTags',
    Spec: 'CharSpec',
    SpecVersion: 'CharSpecVersion',
    Data: 'CharData',
    CreationDate: 'CharCreationDate',
    JsonData: 'CharJsonData',
    DateAdded: 'CharDateAdded',
    ChatSize: 'CharChatSize',
    DateSinceLastChat: 'CharDateSinceLastChat',
    DataSize: 'CharDataSize',
    CharacterNotes: 'CharCharacterNotes',
};
/**
 * Get character information by character ID
 * @param {string} charId - The character ID to look up
 * @param {string} infoType - A field from the CharacterInfoType enum representing the desired data
 * @returns {any|null} The character info or null if not found
 */
function getCharacterInfoById(charId, infoType) {
    var _a;
    try {
        const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        if (context && context.characters) {
            const character = context.characters[charId];
            if (character) {
                let infoBuffer;
                switch (infoType) {
                    case exports.CharacterInfoType.Name:
                        infoBuffer = character.name;
                        break;
                    case exports.CharacterInfoType.Description:
                        infoBuffer = character.description;
                        break;
                    case exports.CharacterInfoType.Personality:
                        infoBuffer = character.personality;
                        break;
                    case exports.CharacterInfoType.Scenario:
                        infoBuffer = character.scenario;
                        break;
                    case exports.CharacterInfoType.DefaultMessage:
                        infoBuffer = character.first_mes;
                        break;
                    case exports.CharacterInfoType.ExampleMessage:
                        infoBuffer = character.mes_example;
                        break;
                    case exports.CharacterInfoType.CreatorComment:
                        infoBuffer = character.creatorcomment;
                        break;
                    case exports.CharacterInfoType.Avatar:
                        infoBuffer = character.avatar;
                        break;
                    case exports.CharacterInfoType.Talkativeness:
                        infoBuffer = character.talkativeness;
                        break;
                    case exports.CharacterInfoType.Favorited:
                        infoBuffer = character.fav;
                        break;
                    case exports.CharacterInfoType.Tags:
                        infoBuffer = character.tags;
                        break;
                    case exports.CharacterInfoType.Spec:
                        infoBuffer = character.spec;
                        break;
                    case exports.CharacterInfoType.SpecVersion:
                        infoBuffer = character.spec_version;
                        break;
                    case exports.CharacterInfoType.Data:
                        infoBuffer = character.data;
                        break;
                    case exports.CharacterInfoType.CreationDate:
                        infoBuffer = character.create_date;
                        break;
                    case exports.CharacterInfoType.JsonData:
                        infoBuffer = character.json_data;
                        break;
                    case exports.CharacterInfoType.DateAdded:
                        infoBuffer = character.date_added;
                        break;
                    case exports.CharacterInfoType.ChatSize:
                        infoBuffer = character.chat_size;
                        break;
                    case exports.CharacterInfoType.DateSinceLastChat:
                        infoBuffer = character.date_last_chat;
                        break;
                    case exports.CharacterInfoType.DataSize:
                        infoBuffer = character.data_size;
                        break;
                    case exports.CharacterInfoType.CharacterNotes:
                        infoBuffer = character.data.extensions.depth_prompt.prompt;
                        break;
                    default:
                        infoBuffer = null;
                        break;
                }
                (0, DebugLogger_1.debugLog)(`Character info field "${infoType}" successfully fetched from ID ${charId}`, null, 'info');
                return infoBuffer;
            }
        }
        (0, DebugLogger_1.debugLog)(`Resolving character information (${infoType}) from ID failed. Returning null. Faulty ID: ${charId}`, null, 'error');
        return null;
    }
    catch (error) {
        console.error('Error getting character info by ID:', error);
        return null;
    }
}
/**
 * Gets a list of all loaded characters.
 * @returns {any[]|null} The list of character objects or null if not found
 */
function getCharacters() {
    var _a;
    const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
    if (context && context.characters) {
        (0, DebugLogger_1.debugLog)('Character array fetched successfully.', null, 'info');
        return context.characters;
    }
    (0, DebugLogger_1.debugLog)('Resolving character array failed.', null, 'error');
    return null;
}
/**
 * Gets the character ID by the character object.
 * @param {object} char_object The character object from the master array
 * @returns {number|null} The character ID or null if not found
 */
function getCharacterIdByObject(char_object) {
    const characters = getCharacters();
    if (char_object && characters) {
        (0, DebugLogger_1.debugLog)('Character ID via object fetched successfully.', null, 'info');
        return characters.indexOf(char_object);
    }
    (0, DebugLogger_1.debugLog)('Resolving character id via object failed.', null, 'error');
    return null;
}
