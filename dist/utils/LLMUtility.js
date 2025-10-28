var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { debugLog } from '../logging/DebugLogger.js';
export class ConnectionProfileHelper {
    static withConnectionProfile(profileId_1, generationFunc_1) {
        return __awaiter(this, arguments, void 0, function* (profileId, generationFunc, context = null) {
            var _a;
            if (!profileId) {
                if (context) {
                    return generationFunc(context);
                }
                else {
                    throw new Error('Context is required for generation');
                }
            }
            if (!context) {
                context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            }
            // Check if context is null and handle appropriately
            if (!context) {
                throw new Error('Context is required for generation but could not be retrieved');
            }
            // Get the Connection Manager service from the context
            const connectionService = context.ConnectionManagerRequestService;
            if (!connectionService) {
                debugLog('Connection Manager is not available, using default connection', null, 'warn');
                return generationFunc(context);
            }
            // Validate if the profile exists
            const allProfiles = yield this.getAllProfiles(context);
            const profile = allProfiles.find((p) => p.id === profileId);
            if (!profile) {
                debugLog(`Profile with ID ${profileId} not found, using default connection`, null, 'warn');
                return generationFunc(context);
            }
            // Use the connection manager service to send the request with the specified profile
            return this.generateWithProfileUsingService(context, profileId, generationFunc);
        });
    }
    static generateWithProfileUsingService(context, profileId, generationFunc) {
        return __awaiter(this, void 0, void 0, function* () {
            // Create a modified context that uses the connection manager for requests
            const modifiedContext = Object.assign(Object.assign({}, context), { 
                // Create a wrapper function that uses the connection manager service
                generateRaw(prompt_1) {
                    return __awaiter(this, arguments, void 0, function* (prompt, systemPrompt = 'You are an AI assistant.') {
                        var _a, _b;
                        const connectionService = context.ConnectionManagerRequestService;
                        // Format the prompt as messages for the chat completion API
                        const messages = [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: prompt }
                        ];
                        try {
                            // Send the request using the connection manager service
                            const result = yield connectionService.sendRequest(profileId, messages, 1000);
                            // Extract the content from the response (the structure might differ based on the API)
                            if (result && typeof result === 'object' && result.choices && ((_b = (_a = result.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content)) {
                                return result.choices[0].message.content;
                            }
                            else {
                                // Fallback if the result doesn't match the expected structure
                                if (typeof result === 'string') {
                                    return result;
                                }
                                throw new Error('Unexpected response format from connection manager');
                            }
                        }
                        catch (error) {
                            debugLog('Error sending request via connection manager', error, 'error');
                            throw error;
                        }
                    });
                },
                generateQuietPrompt(prompt) {
                    return __awaiter(this, void 0, void 0, function* () {
                        var _a, _b;
                        const connectionService = context.ConnectionManagerRequestService;
                        try {
                            // Send the request using the connection manager service
                            const result = yield connectionService.sendRequest(profileId, prompt, 1000);
                            // Extract the content from the response
                            if (result && typeof result === 'object' && result.choices && ((_b = (_a = result.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content)) {
                                return result.choices[0].message.content;
                            }
                            else {
                                // Fallback if the result doesn't match the expected structure
                                if (typeof result === 'string') {
                                    return result;
                                }
                                throw new Error('Unexpected response format from connection manager');
                            }
                        }
                        catch (error) {
                            debugLog('Error sending quiet prompt via connection manager', error, 'error');
                            throw error;
                        }
                    });
                } });
            return generationFunc(modifiedContext);
        });
    }
    static getProfileById(profileId_1) {
        return __awaiter(this, arguments, void 0, function* (profileId, context = null) {
            var _a;
            if (!profileId) {
                return null;
            }
            if (!context) {
                context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            }
            // Check if context is null and handle appropriately
            if (!context) {
                throw new Error('Context is required for getting profile by ID but could not be retrieved');
            }
            const allProfiles = yield this.getAllProfiles(context);
            return allProfiles.find((p) => p.id === profileId) || null;
        });
    }
    static getAllProfiles() {
        return __awaiter(this, arguments, void 0, function* (context = null) {
            var _a;
            if (!context) {
                context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            }
            // Check if context is null and handle appropriately
            if (!context) {
                debugLog('Context is required for getting all profiles but could not be retrieved', null, 'warn');
                return [];
            }
            try {
                // Use the connection manager service to get supported profiles
                const connectionService = context.ConnectionManagerRequestService;
                if (connectionService && typeof connectionService.getSupportedProfiles === 'function') {
                    return yield connectionService.getSupportedProfiles();
                }
                else {
                    debugLog('ConnectionManagerRequestService not available or getSupportedProfiles not found', null, 'warn');
                    return [];
                }
            }
            catch (error) {
                debugLog('Could not fetch profiles from ConnectionManagerRequestService', error, 'warn');
                return [];
            }
        });
    }
}
export class LLMUtility {
    static generateWithRetry(prompt_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, systemPrompt = 'You are an AI assistant.', context = null, maxRetries = 3) {
            var _a;
            if (!context) {
                context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            }
            let attempt = 0;
            while (attempt < maxRetries) {
                try {
                    let result;
                    if (context && context.generateRaw) {
                        result = yield context.generateRaw(prompt, systemPrompt);
                    }
                    else if (context && context.generateQuietPrompt) {
                        result = yield context.generateQuietPrompt(prompt);
                    }
                    else {
                        throw new Error('No generation method available in context');
                    }
                    if (!result || result.trim() === '') {
                        debugLog(`Empty response from LLM (attempt ${attempt + 1}/${maxRetries})`, null, 'warn');
                        attempt++;
                        if (attempt >= maxRetries) {
                            throw new Error('Empty response from LLM after retries');
                        }
                        continue;
                    }
                    return result;
                }
                catch (error) {
                    debugLog(`Generation attempt ${attempt + 1}/${maxRetries} failed`, error, 'error');
                    attempt++;
                    if (attempt >= maxRetries) {
                        throw new Error(`Generation failed after ${maxRetries} attempts: ${error.message}`);
                    }
                }
            }
            throw new Error(`Generation failed after ${maxRetries} attempts`);
        });
    }
    static generateWithProfile(prompt_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, systemPrompt = 'You are an AI assistant.', context = null, profile = null, maxRetries = 3) {
            var _a;
            if (!context) {
                context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            }
            const generationFunc = (genContext) => __awaiter(this, void 0, void 0, function* () {
                if (genContext && genContext.generateRaw) {
                    return genContext.generateRaw(prompt, systemPrompt);
                }
                else if (genContext && genContext.generateQuietPrompt) {
                    return genContext.generateQuietPrompt(prompt);
                }
                throw new Error('No generation method available in context');
            });
            try {
                if (profile && context) {
                    return yield ConnectionProfileHelper.withConnectionProfile(profile, generationFunc, context);
                }
                return yield this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
            }
            catch (error) {
                debugLog(`Profile generation with ${profile !== null && profile !== void 0 ? profile : 'null'} failed`, error, 'error');
                debugLog('Falling back to default generation after profile failures...', null, 'log');
                return this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
            }
        });
    }
}
