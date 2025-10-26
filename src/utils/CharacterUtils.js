import {debugLog} from '../logging/DebugLogger';
import * as SillyTavernUtility from './SillyTavernUtility.js';

export const CharacterInfoType = {
    Name: 'CharName',
    Description: 'CharDesc',
    Personality: 'CharPersonality',
    Scenario: 'CharScenario',
    DefaultMessage: 'CharDefaultMessage',
    ExampleMessage: 'CharExampleMessage',
    CreatorComment: 'CharCreatorComment',
};

/**
 * Get character information by character ID
 * @param {string} charId - The character ID to look up
 * @param {string} infoType - A field from the CharacterInfoType enum representing the desired data
 * @returns {string|null} The character info or null if not found
 */
export function getCharacterInfoById(charId, infoType) {
    try {
        const character = SillyTavernUtility.getCharacterById(charId);

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
            default:
                infoBuffer = null;
                break;
            }

            debugLog('Character info field "' + infoType + '"successfully fetched from ID ' + charId);
            return infoBuffer;
        }

        debugLog('Resolving character information (' + infoType + ') from ID failed. Returning null. Faulty ID: ' + charId, null, 'error');
        return null;
    } catch (error) {
        console.error('Error getting character info by ID:', error);
        return null;
    }
}