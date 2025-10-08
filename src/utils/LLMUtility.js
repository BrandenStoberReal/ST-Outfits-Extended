/**
 * Unified LLM utility with retry logic for outfit detection system
 */

// Helper class for connection profile management
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
            // If no profileId provided, just run the generation function normally
            return await generationFunc(context);
        }

        // Get the current profile to restore later
        const currentProfile = this.getCurrentConnectionProfile();
        
        try {
            // Apply the requested connection profile
            await this.applyConnectionProfile(profileId);
            
            // Run the generation function
            const result = await generationFunc(context);
            
            return result;
        } catch (error) {
            console.error('[LLMUtility] Error during generation with connection profile:', error);
            throw error;
        } finally {
            // Restore the original connection profile
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
            // Try to use the SillyTavern connection manager directly
            if (window.connectionManager && typeof window.connectionManager.applyProfile === 'function') {
                // The applyProfile function expects a profile object, not just an ID
                const profile = this.getProfileById(profileId);

                if (profile) {
                    await window.connectionManager.applyProfile(profile);
                } else {
                    console.warn(`[LLMUtility] Profile with ID ${profileId} not found`);
                    // If profile not found, try to use slash command as fallback
                    if (window.SlashCommandParser && window.SlashCommandParser.commands && window.SlashCommandParser.commands['profile']) {
                        await window.SlashCommandParser.commands['profile'].callback({}, profileId);
                    }
                }
            } 
            // If direct connection manager API not available, try slash command
            else if (window.SlashCommandParser && window.SlashCommandParser.commands && window.SlashCommandParser.commands['profile']) {
                await window.SlashCommandParser.commands['profile'].callback({}, profileId);
            }
            // Fallback to other methods if slash command not available
            else if (typeof applyConnectionProfile === 'function') {
                // Fallback to global function if available
                const profile = this.getProfileById(profileId);

                if (profile) {
                    await applyConnectionProfile(profile);
                }
            } else {
                console.warn('[LLMUtility] Could not apply connection profile, no implementation found');
                // If no connection manager is available, still run generation without profile
                // This prevents execution from stopping completely
            }
        } catch (error) {
            console.error('[LLMUtility] Failed to apply connection profile:', error);
            // If profile switching fails, continue with current settings
            // This ensures generation still works even if profile switching fails
        }
    }
    
    /**
     * Get current connection profile ID
     * @returns {string|null}
     */
    static getCurrentConnectionProfile() {
        // First try to get from extension settings
        if (window.extension_settings?.connectionManager?.selectedProfile) {
            return window.extension_settings.connectionManager.selectedProfile;
        }
        
        // Then try to get from connection manager directly
        if (window.connectionManager && typeof window.connectionManager.getCurrentProfileId === 'function') {
            return window.connectionManager.getCurrentProfileId();
        }
        
        // Check if we can get it via slash command
        if (window.SlashCommandParser && window.SlashCommandParser.commands && window.SlashCommandParser.commands['profile']) {
            try {
                // Get current profile name via slash command
                const currentProfile = window.SlashCommandParser.commands['profile'].callback({}, null);

                // If it's not "None", find the corresponding profile ID
                if (currentProfile && currentProfile !== 'None') {
                    const profiles = this.getAllProfiles();
                    const profile = profiles.find(p => p.name === currentProfile || p.id === currentProfile);

                    if (profile) {
                        return profile.id;
                    }
                }
            } catch (error) {
                // If slash command fails, continue with other methods
            }
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
        
        // First try from extension settings
        if (window.extension_settings?.connectionManager?.profiles) {
            return window.extension_settings.connectionManager.profiles.find(p => p.id === profileId);
        }
        
        // Then try from connection manager directly
        if (window.connectionManager && typeof window.connectionManager.getProfileById === 'function') {
            return window.connectionManager.getProfileById(profileId);
        }
        
        // Fallback: get all profiles and find by ID
        const profiles = this.getAllProfiles();

        return profiles.find(p => p.id === profileId);
    }
    
    /**
     * Get all available profiles
     * @returns {Array} - Array of profile objects
     */
    static getAllProfiles() {
        // Try to get from extension settings
        if (window.extension_settings?.connectionManager?.profiles) {
            return window.extension_settings.connectionManager.profiles;
        }
        
        // Try to get from connection manager directly
        if (window.connectionManager && typeof window.connectionManager.getAllProfiles === 'function') {
            return window.connectionManager.getAllProfiles();
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
            context = window.getContext && window.getContext() || {};
        }

        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                let result;

                if (context.generateRaw) {
                    result = await context.generateRaw({
                        prompt: prompt,
                        systemPrompt: systemPrompt
                    });
                } else if (context.generateQuietPrompt) {
                    result = await context.generateQuietPrompt({
                        quietPrompt: prompt
                    });
                } else {
                    // If no generation methods are available in context, throw an error
                    throw new Error('No generation method available in context');
                }

                if (!result) {
                    console.warn(`[LLMUtility] No output generated (attempt ${attempt + 1}/${maxRetries})`);
                    attempt++;
                    if (attempt >= maxRetries) {
                        throw new Error('No output generated after retries');
                    }
                    continue; // Retry
                }

                // Check if the result is empty or just whitespace
                if (!result || result.trim() === '') {
                    console.warn(`[LLMUtility] Empty response from LLM (attempt ${attempt + 1}/${maxRetries})`);
                    attempt++;
                    if (attempt >= maxRetries) {
                        throw new Error('Empty response from LLM after retries');
                    }
                    continue; // Retry
                }

                return result; // Success
            } catch (error) {
                console.error(`[LLMUtility] Generation attempt ${attempt + 1}/${maxRetries} failed:`, error);
                if (attempt < maxRetries - 1) {
                    attempt++;
                    continue; // Retry
                } else {
                    // All retries exhausted
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
            context = window.getContext && window.getContext() || {};
        }

        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                let result;

                if (profile) {
                    // Use the connection profile helper to run generation with specified profile
                    result = await ConnectionProfileHelper.withConnectionProfile(profile, async () => {
                        if (context.generateRaw) {
                            return await context.generateRaw({
                                prompt: prompt,
                                systemPrompt: systemPrompt
                            });
                        } else if (context.generateQuietPrompt) {
                            return await context.generateQuietPrompt({
                                quietPrompt: prompt
                            });
                        } 
                        throw new Error('No generation method available in context');
                        
                    });
                } else {
                    // If no profile specified, run generation normally
                    if (context.generateRaw) {
                        result = await context.generateRaw({
                            prompt: prompt,
                            systemPrompt: systemPrompt
                        });
                    } else if (context.generateQuietPrompt) {
                        result = await context.generateQuietPrompt({
                            quietPrompt: prompt
                        });
                    } else {
                        throw new Error('No generation method available in context');
                    }
                }

                if (!result) {
                    console.warn(`[LLMUtility] No output with profile ${profile} (attempt ${attempt + 1}/${maxRetries})`);
                    attempt++;
                    if (attempt >= maxRetries) {
                        throw new Error(`No output with profile ${profile} after retries`);
                    }
                    continue; // Retry
                }

                // Check if the result is empty or just whitespace
                if (!result || result.trim() === '') {
                    console.warn(`[LLMUtility] Empty response with profile ${profile} (attempt ${attempt + 1}/${maxRetries})`);
                    attempt++;
                    if (attempt >= maxRetries) {
                        throw new Error(`Empty response with profile ${profile} after retries`);
                    }
                    continue; // Retry
                }

                return result; // Success
            } catch (error) {
                console.error(`[LLMUtility] Profile generation attempt ${attempt + 1}/${maxRetries} failed:`, error);
                if (attempt < maxRetries - 1) {
                    attempt++;
                    continue; // Retry
                } else {
                    // All retries with profile failed, try fallback
                    console.log('[LLMUtility] Trying default generation after profile failures...');
                    return await this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
                }
            }
        }
    }
}