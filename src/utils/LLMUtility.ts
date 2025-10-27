declare global {
    interface Window {
        SillyTavern: any;
        getContext: any;
    }

    interface SillyTavernContext {
        ConnectionManagerRequestService?: {
            getSupportedProfiles: () => Promise<any[]>;
            sendRequest: (profileId: string, prompt: any, maxTokens: number, custom?: any, overridePayload?: any) => Promise<any>;
        };
    }
}

export class ConnectionProfileHelper {
    static async withConnectionProfile(profileId: string, generationFunc: (context: SillyTavernContext) => Promise<any>, context: SillyTavernContext | null = null): Promise<any> {
        if (!profileId) {
            if (context) {
                return generationFunc(context);
            } else {
                throw new Error('Context is required for generation');
            }
        }

        if (!context) {
            context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        }

        // Check if context is null and handle appropriately
        if (!context) {
            throw new Error('Context is required for generation but could not be retrieved');
        }

        // Get the Connection Manager service from the context
        const connectionService = context.ConnectionManagerRequestService;
        if (!connectionService) {
            console.warn('[LLMUtility] Connection Manager is not available, using default connection');
            return generationFunc(context);
        }

        // Validate if the profile exists
        const allProfiles = await this.getAllProfiles(context);
        const profile = allProfiles.find((p: any) => p.id === profileId);
        if (!profile) {
            console.warn(`[LLMUtility] Profile with ID ${profileId} not found, using default connection`);
            return generationFunc(context);
        }

        // Use the connection manager service to send the request with the specified profile
        return this.generateWithProfileUsingService(context, profileId, generationFunc);
    }

    static async generateWithProfileUsingService(context: SillyTavernContext, profileId: string, generationFunc: (context: SillyTavernContext) => Promise<any>): Promise<any> {
        // Create a modified context that uses the connection manager for requests
        const modifiedContext = {
            ...context,
            // Create a wrapper function that uses the connection manager service
            async generateRaw(prompt: string, systemPrompt: string = 'You are an AI assistant.'): Promise<string> {
                const connectionService = context.ConnectionManagerRequestService!;

                // Format the prompt as messages for the chat completion API
                const messages = [
                    {role: 'system', content: systemPrompt},
                    {role: 'user', content: prompt}
                ];

                try {
                    // Send the request using the connection manager service
                    const result = await connectionService.sendRequest(profileId, messages, 1000);

                    // Extract the content from the response (the structure might differ based on the API)
                    if (result && typeof result === 'object' && result.choices && result.choices[0]?.message?.content) {
                        return result.choices[0].message.content as string;
                    } else {
                        // Fallback if the result doesn't match the expected structure
                        if (typeof result === 'string') {
                            return result;
                        }
                        throw new Error('Unexpected response format from connection manager');
                    }
                } catch (error) {
                    console.error('Error sending request via connection manager:', error);
                    throw error;
                }
            },
            async generateQuietPrompt(prompt: string): Promise<string> {
                const connectionService = context.ConnectionManagerRequestService!;

                try {
                    // Send the request using the connection manager service
                    const result = await connectionService.sendRequest(profileId, prompt, 1000);

                    // Extract the content from the response
                    if (result && typeof result === 'object' && result.choices && result.choices[0]?.message?.content) {
                        return result.choices[0].message.content as string;
                    } else {
                        // Fallback if the result doesn't match the expected structure
                        if (typeof result === 'string') {
                            return result;
                        }
                        throw new Error('Unexpected response format from connection manager');
                    }
                } catch (error) {
                    console.error('Error sending quiet prompt via connection manager:', error);
                    throw error;
                }
            }
        } as SillyTavernContext;

        return generationFunc(modifiedContext);
    }

    static async getProfileById(profileId: string, context: SillyTavernContext | null = null): Promise<any | null> {
        if (!profileId) {
            return null;
        }

        if (!context) {
            context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        }

        // Check if context is null and handle appropriately
        if (!context) {
            throw new Error('Context is required for getting profile by ID but could not be retrieved');
        }

        const allProfiles = await this.getAllProfiles(context);
        return allProfiles.find((p: any) => p.id === profileId) || null;
    }

    static async getAllProfiles(context: SillyTavernContext | null = null): Promise<any[]> {
        if (!context) {
            context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        }

        // Check if context is null and handle appropriately
        if (!context) {
            console.warn('Context is required for getting all profiles but could not be retrieved');
            return [];
        }

        try {
            // Use the connection manager service to get supported profiles
            const connectionService = context.ConnectionManagerRequestService;
            if (connectionService && typeof connectionService.getSupportedProfiles === 'function') {
                return await connectionService.getSupportedProfiles();
            } else {
                console.warn('ConnectionManagerRequestService not available or getSupportedProfiles not found');
                return [];
            }
        } catch (error) {
            console.warn('Could not fetch profiles from ConnectionManagerRequestService:', error);
            return [];
        }
    }
}

export class LLMUtility {
    static async generateWithRetry(prompt: string, systemPrompt: string = 'You are an AI assistant.', context: SillyTavernContext | null = null, maxRetries: number = 3): Promise<string> {
        if (!context) {
            context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        }

        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                let result: string;

                if (context && context.generateRaw) {
                    result = await context.generateRaw(prompt, systemPrompt);
                } else if (context && context.generateQuietPrompt) {
                    result = await context.generateQuietPrompt(prompt);
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
            } catch (error: any) {
                console.error(`[LLMUtility] Generation attempt ${attempt + 1}/${maxRetries} failed:`, error);
                attempt++;
                if (attempt >= maxRetries) {
                    throw new Error(`Generation failed after ${maxRetries} attempts: ${error.message}`);
                }
            }
        }

        throw new Error(`Generation failed after ${maxRetries} attempts`);
    }

    static async generateWithProfile(prompt: string, systemPrompt: string = 'You are an AI assistant.', context: SillyTavernContext | null = null, profile: string | null = null, maxRetries: number = 3): Promise<string> {
        if (!context) {
            context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        }

        const generationFunc = async (genContext: SillyTavernContext): Promise<string> => {
            if (genContext && genContext.generateRaw) {
                return genContext.generateRaw(prompt, systemPrompt);
            } else if (genContext && genContext.generateQuietPrompt) {
                return genContext.generateQuietPrompt(prompt);
            }
            throw new Error('No generation method available in context');
        };

        try {
            if (profile && context) {
                return await ConnectionProfileHelper.withConnectionProfile(profile, generationFunc, context);
            }
            return await this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
        } catch (error: any) {
            console.error(`[LLMUtility] Profile generation with ${profile ?? 'null'} failed:`, error);
            console.log('[LLMUtility] Falling back to default generation after profile failures...');
            return this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
        }
    }
}
