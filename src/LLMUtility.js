/**
 * Unified LLM utility with retry logic for outfit detection system
 */

export class LLMUtility {
    /**
     * Unified method to generate with retry logic
     * @param {string} prompt - The input prompt for the LLM
     * @param {string} systemPrompt - System prompt to guide the LLM
     * @param {object} context - Context object with generation methods available
     * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
     * @returns {Promise<string>} - The generated response from LLM
     */
    static async generateWithRetry(prompt, systemPrompt = "You are an AI assistant.", context = null, maxRetries = 3) {
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
    static async generateWithProfile(prompt, systemPrompt = "You are an AI assistant.", context = null, profile = null, maxRetries = 3) {
        if (!context) {
            context = window.getContext && window.getContext() || {};
        }

        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                let result;

                // This could be extended to handle different profiles
                // For now, we'll just log the profile being used
                if (profile) {
                    console.log(`[LLMUtility] Generating with profile: ${profile}`);
                }

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