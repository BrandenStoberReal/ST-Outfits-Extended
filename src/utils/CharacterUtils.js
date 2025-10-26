import {debugLog} from '../logging/DebugLogger.js';

export const CharacterInfoType = {
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
};

/**
 * Get character information by character ID
 * @param {string} charId - The character ID to look up
 * @param {string} infoType - A field from the CharacterInfoType enum representing the desired data
 * @returns {any|null} The character info or null if not found
 */
export function getCharacterInfoById(charId, infoType) {
    try {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

        if (context && context.characters) {
            const character = context.characters[charId];

            if (character) {
                let infoBuffer;

                switch (infoType) {
                case CharacterInfoType.Name:
                    infoBuffer = character.name;
                    break;
                case CharacterInfoType.Description:
                    infoBuffer = character.description;
                    break;
                case CharacterInfoType.Personality:
                    infoBuffer = character.personality;
                    break;
                case CharacterInfoType.Scenario:
                    infoBuffer = character.scenario;
                    break;
                case CharacterInfoType.DefaultMessage:
                    infoBuffer = character.first_mes;
                    break;
                case CharacterInfoType.ExampleMessage:
                    infoBuffer = character.mes_example;
                    break;
                case CharacterInfoType.CreatorComment:
                    infoBuffer = character.creatorcomment;
                    break;
                case CharacterInfoType.Avatar:
                    infoBuffer = character.avatar;
                    break;
                case CharacterInfoType.Talkativeness:
                    infoBuffer = character.talkativeness;
                    break;
                case CharacterInfoType.Favorited:
                    infoBuffer = character.fav;
                    break;
                case CharacterInfoType.Tags:
                    infoBuffer = character.tags;
                    break;
                case CharacterInfoType.Spec:
                    infoBuffer = character.spec;
                    break;
                case CharacterInfoType.SpecVersion:
                    infoBuffer = character.spec_version;
                    break;
                case CharacterInfoType.Data:
                    infoBuffer = character.data;
                    break;
                case CharacterInfoType.CreationDate:
                    infoBuffer = character.create_date;
                    break;
                case CharacterInfoType.JsonData:
                    infoBuffer = character.json_data;
                    break;
                case CharacterInfoType.DateAdded:
                    infoBuffer = character.date_added;
                    break;
                case CharacterInfoType.ChatSize:
                    infoBuffer = character.chat_size;
                    break;
                case CharacterInfoType.DateSinceLastChat:
                    infoBuffer = character.date_last_chat;
                    break;
                case CharacterInfoType.DataSize:
                    infoBuffer = character.data_size;
                    break;
                default:
                    infoBuffer = null;
                    break;
                }

                debugLog('Character info field "' + infoType + '"successfully fetched from ID ' + charId);
                return infoBuffer;
            }
        }

        debugLog('Resolving character information (' + infoType + ') from ID failed. Returning null. Faulty ID: ' + charId, null, 'error');
        return null;
    } catch (error) {
        console.error('Error getting character info by ID:', error);
        return null;
    }
}

/**
 * Gets a list of all loaded characters.
 * @returns {array|null} The list of character objects or null if not found
 */
export function getCharacters() {
    const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

    if (context && context.characters) {
        debugLog('Character array fetched successfully.');
        return context.characters;
    }

    debugLog('Resolving character array failed.', null, 'error');
    return null;
}