import {outfitStore} from '../common/Store';

declare global {
    interface Window {
        connectionManager: any;
        SlashCommandParser: any;
        extension_settings: any;
        SillyTavern: any;
        getContext: any;
    }
}

class ConnectionProfileHelper {
    static async withConnectionProfile(profileId: string, generationFunc: (context: SillyTavernContext) => Promise<any>, context: SillyTavernContext | null = null): Promise<any> {
        if (!profileId) {
            if (context) {
                return generationFunc(context);
            } else {
                throw new Error('Context is required for generation');
            }
        }

        const currentProfile = this.getCurrentConnectionProfile();

        try {
            await this.applyConnectionProfile(profileId);
            if (context) {
                return await generationFunc(context);
            } else {
                throw new Error('Context is null but required for generation');
            }
        } catch (error: any) {
            console.error(`[LLMUtility] Error during generation with connection profile ${profileId}:`, error);
            throw error;
        } finally {
            if (currentProfile && currentProfile !== profileId) {
                await this.applyConnectionProfile(currentProfile);
            }
        }
    }

    static async applyConnectionProfile(profileId: string): Promise<void> {
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
        } catch (error: any) {
            console.error(`[LLMUtility] Failed to apply connection profile ${profileId}:`, error);
        }
    }

    static getCurrentConnectionProfile(): string | null {
        if (window.connectionManager && typeof window.connectionManager.getCurrentProfileId === 'function') {
            return window.connectionManager.getCurrentProfileId();
        }

        if (window.extension_settings?.connectionManager?.selectedProfile) {
            return window.extension_settings.connectionManager.selectedProfile;
        }

        try {
            const storeState = outfitStore.getState();
            return storeState.settings?.autoOutfitConnectionProfile || null;
        } catch (error: any) {
            console.warn('Could not access store for connection profile:', error);
        }

        return null;
    }

    static getProfileById(profileId: string): any | null {
        if (!profileId) {
            return null;
        }

        if (window.connectionManager && typeof window.connectionManager.getProfileById === 'function') {
            return window.connectionManager.getProfileById(profileId);
        }

        if (window.extension_settings?.connectionManager?.profiles) {
            return window.extension_settings.connectionManager.profiles.find((p: any) => p.id === profileId);
        }

        try {
            const storeState = outfitStore.getState();
            return null;
        } catch (error) {
            console.warn('Could not access store for profiles:', error);
        }

        return null;
    }

    static getAllProfiles(): any[] {
        if (window.connectionManager && typeof window.connectionManager.getAllProfiles === 'function') {
            return window.connectionManager.getAllProfiles();
        }

        if (window.extension_settings?.connectionManager?.profiles) {
            return window.extension_settings.connectionManager.profiles;
        }

        try {
            const storeState = outfitStore.getState();
            return [];
        } catch (error) {
            console.warn('Could not access store for profiles:', error);
        }

        return [];
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
