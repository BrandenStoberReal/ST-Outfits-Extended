/**
 * Unified LLM utility with retry logic for outfit detection system
 */
import { outfitStore } from '../common/Store.js';

class ConnectionProfileHelper {
    /**
     * Switch to a specific connection profile before LLM generation and switch back after
     * @param {string} profileId - The connection profile ID to switch to
     * @param {Function} generationFunc - The function that performs the LLM generation
     * @param {*} context - Context to pass to the generation function
     * @returns {Promise<any>} - Result of the generation function
     */
    static async withConnectionProfile(profileId, generationFunc, context = null) {
        if (!profileId) {
            return generationFunc(context);
        }

        const currentProfile = this.getCurrentConnectionProfile();
        
        try {
            await this.applyConnectionProfile(profileId);
            return await generationFunc(context);
        } catch (error) {
            console.error(`[LLMUtility] Error during generation with connection profile ${profileId}:`, error);
            throw error;
        } finally {
            if (currentProfile && currentProfile !== profileId) {
                await this.applyConnectionProfile(currentProfile);
            }
        }
    }
    
    /**
     * Apply a specific connection profile using the connection manager
     * @param {string} profileId - The connection profile ID to apply
     * @returns {Promise<void>}
     */
    static async applyConnectionProfile(profileId) {
        try {
            if (window.connectionManager && typeof window.connectionManager.applyProfile === 'function') {
                const profile = this.getProfileById(profileId);

                if (profile) {
                    await window.connectionManager.applyProfile(profile);
                } else {
                    console.warn(`[LLMUtility] Profile with ID ${profileId} not found. Falling back to slash command.`);
                    if (window.SlashCommandParser?.commands?.profile) {
                        await window.SlashCommandParser.commands['profile'].callback({}, profileId);
                    }
                }
            } else if (window.SlashCommandParser?.commands?.profile) {
                await window.SlashCommandParser.commands['profile'].callback({}, profileId);
            } else {
                console.warn('[LLMUtility] Could not apply connection profile, no implementation found.');
            }
        } catch (error) {
            console.error(`[LLMUtility] Failed to apply connection profile ${profileId}:`, error);
        }
    }
    
    /**
     * Get current connection profile ID
     * @returns {string|null}
     */
    static getCurrentConnectionProfile() {
        if (window.connectionManager && typeof window.connectionManager.getCurrentProfileId === 'function') {
            return window.connectionManager.getCurrentProfileId();
        }
        
        if (window.extension_settings?.connectionManager?.selectedProfile) {
            return window.extension_settings.connectionManager.selectedProfile;
        }
        
        // Fallback: try to get from our store if available
        try {
            const storeState = outfitStore.getState();

            return storeState.settings?.autoOutfitConnectionProfile || null;
        } catch (error) {
            console.warn('Could not access store for connection profile:', error);
        }
        
        return null;
    }
    
    /**
     * Get a profile by ID from the connection manager
     * @param {string} profileId - The profile ID to retrieve
     * @returns {Object|null}
     */
    static getProfileById(profileId) {
        if (!profileId) {return null;}
        
        if (window.connectionManager && typeof window.connectionManager.getProfileById === 'function') {
            return window.connectionManager.getProfileById(profileId);
        }
        
        if (window.extension_settings?.connectionManager?.profiles) {
            return window.extension_settings.connectionManager.profiles.find(p => p.id === profileId);
        }
        
        // Fallback: try to get from our store if available
        try {
            const storeState = outfitStore.getState();

            // This might not be relevant for our outfit store but adding for consistency
            return null; // Our store doesn't store connection profiles separately
        } catch (error) {
            console.warn('Could not access store for profiles:', error);
        }
        
        return null;
    }
    
    /**
     * Get all available profiles
     * @returns {Array} - Array of profile objects
     */
    static getAllProfiles() {
        if (window.connectionManager && typeof window.connectionManager.getAllProfiles === 'function') {
            return window.connectionManager.getAllProfiles();
        }
        
        if (window.extension_settings?.connectionManager?.profiles) {
            return window.extension_settings.connectionManager.profiles;
        }
        
        // Fallback: try to get from our store if available
        try {
            const storeState = outfitStore.getState();

            // This might not be relevant for our outfit store but adding for consistency
            return []; // Our store doesn't store connection profiles separately
        } catch (error) {
            console.warn('Could not access store for profiles:', error);
        }
        
        return [];
    }
}

export class LLMUtility {
    /**
     * Unified method to generate with retry logic
     * @param {string} prompt - The input prompt for the LLM
     * @param {string} systemPrompt - System prompt to guide the LLM
     * @param {object} context - Context object with generation methods available
     * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
     * @returns {Promise<string>} - The generated response from LLM
     */
    static async generateWithRetry(prompt, systemPrompt = 'You are an AI assistant.', context = null, maxRetries = 3) {
        if (!context) {
            context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        }

        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                let result;

                if (context.generateRaw) {
                    result = await context.generateRaw({ prompt, systemPrompt });
                } else if (context.generateQuietPrompt) {
                    result = await context.generateQuietPrompt({ quietPrompt: prompt });
                } else {
                    throw new Error('No generation method available in context');
                }

                if (!result || result.trim() === '') {
                    console.warn(`[LLMUtility] Empty response from LLM (attempt ${attempt + 1}/${maxRetries})`);
                    attempt++;
                    if (attempt >= maxRetries) {
                        throw new Error('Empty response from LLM after retries');
                    }
                    continue;
                }

                return result;
            } catch (error) {
                console.error(`[LLMUtility] Generation attempt ${attempt + 1}/${maxRetries} failed:`, error);
                attempt++;
                if (attempt >= maxRetries) {
                    throw new Error(`Generation failed after ${maxRetries} attempts: ${error.message}`);
                }
            }
        }
    }

    /**
     * Unified method to generate with profile (with retry logic)
     * @param {string} prompt - The input prompt for the LLM
     * @param {string} systemPrompt - System prompt to guide the LLM
     * @param {object} context - Context object with generation methods available
     * @param {string} profile - Connection profile to use
     * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
     * @returns {Promise<string>} - The generated response from LLM
     */
    static async generateWithProfile(prompt, systemPrompt = 'You are an AI assistant.', context = null, profile = null, maxRetries = 3) {
        if (!context) {
            context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        }

        const generationFunc = async () => {
            if (context.generateRaw) {
                return context.generateRaw({ prompt, systemPrompt });
            } else if (context.generateQuietPrompt) {
                return context.generateQuietPrompt({ quietPrompt: prompt });
            } 
            throw new Error('No generation method available in context');
        };

        try {
            if (profile) {
                return await ConnectionProfileHelper.withConnectionProfile(profile, generationFunc, context);
            }
            return await this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
        } catch (error) {
            console.error(`[LLMUtility] Profile generation with ${profile} failed:`, error);
            console.log('[LLMUtility] Falling back to default generation after profile failures...');
            return this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
        }
    }
}