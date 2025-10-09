export function setupEventListeners(botManager, userManager, botPanel, userPanel, autoOutfitSystem, updateForCurrentCharacter, CLOTHING_SLOTS, ACCESSORY_SLOTS) {
    // Get the context which should have eventSource
    const context = window.getContext();

    // Verify that context and eventSource are available
    if (!context || !context.eventSource || !context.event_types) {
        console.warn('[OutfitTracker] Context not fully available for event listeners yet, trying again later');
        // Set up a timeout to try again in a bit
        setTimeout(() => {
            setupEventListeners(botManager, userManager, botPanel, userPanel, autoOutfitSystem, updateForCurrentCharacter, CLOTHING_SLOTS, ACCESSORY_SLOTS);
        }, 1000);
        return;
    }

    const { eventSource, event_types } = context;

    // Listen for app ready event to mark initialization
    eventSource.on(event_types.APP_READY, () => {
        console.log('[OutfitTracker] App ready, marking auto outfit system as initialized');
        if (window.autoOutfitSystem) {
            autoOutfitSystem.markAppInitialized();
        }
        // Update the current character after app is ready to ensure context is properly initialized
        updateForCurrentCharacter();
    });

    // Listen for chat-related events since outfit states are tied to chats
    eventSource.on(event_types.CHAT_ID_CHANGED, () => {
        console.log('[OutfitTracker] CHAT_ID_CHANGED event fired');
        updateForCurrentCharacter();
    });
    eventSource.on(event_types.CHAT_CHANGED, () => {
        console.log('[OutfitTracker] CHAT_CHANGED event fired - updating outfit data for character switch');
        updateForCurrentCharacter();
    });
    eventSource.on(event_types.CHAT_CREATED, async () => {
        console.log('[OutfitTracker] CHAT_CREATED event fired - creating new outfit instance');
        // When a new chat is created, create a new outfit instance for this conversation
        try {
            // Use the same temporary ID for both bot and user to ensure consistency
            const tempInstanceId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            if (botManager) {
                // Create a new outfit instance for this chat
                // Initially, we don't know the first message yet, so we'll use a temporary ID
                // Use a more descriptive temporary ID to avoid conflicts
                botManager.setOutfitInstanceId(tempInstanceId);

                // The outfit will be properly initialized when we detect the first message
                console.log('[OutfitTracker] Created new outfit instance for character:', tempInstanceId);
            }

            if (userManager) {
                // Create a new outfit instance for this chat using the same temporary ID
                userManager.setOutfitInstanceId(tempInstanceId);

                console.log('[OutfitTracker] Created new outfit instance for user:', tempInstanceId);
            }
        } catch (error) {
            console.error('[OutfitTracker] Error creating new outfit instance on chat creation:', error);
        }
        updateForCurrentCharacter(); // Update the character after creating new instance
    });

    // Listen for the first message selected event which is more specific than MESSAGE_RECEIVED


    // Listen for message swiped event to handle first message changes
    // The MESSAGE_SWIPED event is emitted with the index of the message that was swiped
    eventSource.on(event_types.MESSAGE_SWIPED, async (index) => {
        console.log(`[OutfitTracker] MESSAGE_SWIPED event fired with index: ${index}`);
        try {
            const context = window.getContext();

            if (context && context.chat && context.chat.length > 0 && index >= 0 && index < context.chat.length) {
                // The event provides the index of the swiped message
                const swipedMessage = context.chat[index];

                if (!swipedMessage) {
                    console.log('[OutfitTracker] Swiped message not found at provided index');
                    return;
                }

                // Check if the swiped message is the first AI message in the chat
                const aiMessages = context.chat.filter(msg => !msg.is_user && !msg.is_system);
                const firstMessage = aiMessages.length > 0 ? aiMessages[0] : null;

                // Check if the swiped message is the first AI message (not a user message)
                if (firstMessage && !swipedMessage.is_user && !swipedMessage.is_system &&
                    (swipedMessage.swid === firstMessage.swid ||
                        (swipedMessage.mes === firstMessage.mes && swipedMessage.name === firstMessage.name))) {
                    console.log('[OutfitTracker] First message was swiped, updating outfit instance');

                    // Create a specific outfit instance based on the new first message content
                    const firstMessageText = swipedMessage.mes || '';

                    // Determine scenario type based on message content
                    let instanceId = null;

                    // Create a more robust and descriptive instance ID
                    const messagePreview = firstMessageText.substring(0, 20).replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase();

                    if (firstMessageText.toLowerCase().includes('hello') || firstMessageText.toLowerCase().includes('hi')) {
                        // Create consistent ID based on message content
                        const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);

                        instanceId = `greeting_${messagePreview}_${textHash}`;
                    } else if (firstMessageText.toLowerCase().includes('bedroom') || firstMessageText.toLowerCase().includes('bed')) {
                        // Create consistent ID based on message content
                        const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);

                        instanceId = `bedroom_${messagePreview}_${textHash}`;
                    } else if (firstMessageText.toLowerCase().includes('office') || firstMessageText.toLowerCase().includes('work')) {
                        // Create consistent ID based on message content
                        const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);

                        instanceId = `office_${messagePreview}_${textHash}`;
                    } else {
                        // Create a hash-based ID with more information
                        const textHash = btoa(encodeURIComponent(firstMessageText)).replace(/[=]/g, '').substring(0, 16);

                        instanceId = `scenario_${textHash}`;
                    }

                    if (botManager) {
                        // Check if the instance ID is actually changing before updating
                        const currentInstanceId = botManager.getOutfitInstanceId();
                        
                        // Only update if the instance ID is actually changing
                        if (currentInstanceId !== instanceId) {
                            // Set the outfit instance ID based on the first message scenario
                            botManager.setOutfitInstanceId(instanceId);
                            console.log(`[OutfitTracker] Set bot outfit instance ID after swipe: ${instanceId} (was ${currentInstanceId})`);

                            // Load the outfit data for the new instance
                            botManager.loadOutfit();
                        } else {
                            console.log(`[OutfitTracker] Bot instance ID unchanged, skipping update: ${instanceId}`);
                        }
                    }

                    if (userManager) {
                        // Check if the instance ID is actually changing before updating
                        const currentUserInstanceId = userManager.getOutfitInstanceId();
                        
                        // Only update if the instance ID is actually changing
                        if (currentUserInstanceId !== instanceId) {
                            // Also set a corresponding instance ID for the user
                            userManager.setOutfitInstanceId(instanceId);
                            console.log(`[OutfitTracker] Set user outfit instance ID after swipe: ${instanceId} (was ${currentUserInstanceId})`);

                            // Load the outfit data for the new instance
                            userManager.loadOutfit();
                        } else {
                            console.log(`[OutfitTracker] User instance ID unchanged, skipping update: ${instanceId}`);
                        }
                    }

                    // Update the panels to reflect the new instance
                    if (botPanel && botPanel.isVisible) {
                        botPanel.updateCharacter(botManager.character);
                        botPanel.renderContent();
                    }

                    if (userPanel && userPanel.isVisible) {
                        userPanel.updateHeader();
                        userPanel.renderContent();
                    }

                    console.log(`[OutfitTracker] Created outfit instances after first message swipe: ${instanceId}`);
                } else {
                    console.log('[OutfitTracker] Swiped message is not the first AI message, skipping instance update');
                }
            }
        } catch (error) {
            console.error('[OutfitTracker] Error handling message swipe event:', error);
        }
    });

    // Hook into the clear chat functionality by overriding the clearChat function
    // This will be called when the user clears the current chat
    const originalClearChat = window.clearChat;

    // Store the original function to be able to restore it later
    window._originalClearChat = originalClearChat;

    window.clearChat = async function() {
        // Before clearing the chat, save all outfit data for current character
        let savedBotOutfits = {};
        let savedUserOutfits = {};

        if (botManager && botManager.characterId) {
            // Save all outfit instances for this character to preserve across chat resets
            // Include both old format (with chatId) and new format (without chatId) variables
            const allVars = botManager.getAllVariables();
            const pattern = new RegExp(`^OUTFIT_INST_${botManager.characterId}_`);

            for (const varName in allVars) {
                if (pattern.test(varName)) {
                    savedBotOutfits[varName] = allVars[varName];
                }
            }

            console.log(`[OutfitTracker] Saved ${Object.keys(savedBotOutfits).length} bot outfit instances before chat clear`);
        }

        if (userManager) {
            // Save all user outfit instances to preserve across chat resets
            const allVars = userManager.getAllVariables();
            const pattern = /^OUTFIT_INST_USER_/;

            for (const varName in allVars) {
                if (pattern.test(varName)) {
                    savedUserOutfits[varName] = allVars[varName];
                }
            }

            console.log(`[OutfitTracker] Saved ${Object.keys(savedUserOutfits).length} user outfit instances before chat clear`);
        }

        // First call the original function to clear the chat
        if (typeof originalClearChat === 'function') {
            originalClearChat.apply(this, arguments);
        } else {
            // If the original function doesn't exist, manually clear the chat
            // Get the current chat and clear it
            const context = window.getContext();

            if (context && context.chat && Array.isArray(context.chat)) {
                context.chat = [];
                // Update the UI to reflect the cleared chat
                if (typeof window.updateChatOutput === 'function') {
                    window.updateChatOutput();
                }
            }
        }

        // Restore saved outfit data AFTER calling the original function
        // This ensures that when CHAT_CREATED event fires and temporary instances are created,
        // the saved data is applied to the new instances properly after they are set up
        if (botManager && Object.keys(savedBotOutfits).length > 0) {
            // After chat is cleared, we need to wait a bit for the CHAT_CREATED event to set up new instances
            setTimeout(() => {
                // Restore all saved bot outfit instances
                for (const [varName, value] of Object.entries(savedBotOutfits)) {
                    botManager.setGlobalVariable(varName, value);
                }
                // Reload the outfit for the new instances to reflect the restored data
                botManager.loadOutfit();
                
                // Update the UI to reflect the restored data
                if (botPanel && botPanel.isVisible) {
                    botPanel.renderContent();
                }
                
                console.log('[OutfitTracker] Restored bot outfit instances after chat clear');
            }, 100); // Small delay to ensure new instances are set up
        }

        if (userManager && Object.keys(savedUserOutfits).length > 0) {
            // Restore all saved user outfit instances
            setTimeout(() => {
                for (const [varName, value] of Object.entries(savedUserOutfits)) {
                    userManager.setGlobalVariable(varName, value);
                }
                // Reload the outfit for the new instances to reflect the restored data
                userManager.loadOutfit();
                
                // Update the UI to reflect the restored data
                if (userPanel && userPanel.isVisible) {
                    userPanel.renderContent();
                }
                
                console.log('[OutfitTracker] Restored user outfit instances after chat clear');
            }, 100); // Small delay to ensure new instances are set up
        }
    };

    // Function to clean up old temporary outfit instances periodically
    function cleanupOldTempInstances() {
        try {
            if (botManager) {
                botManager.cleanupTempInstances();
            }
            if (userManager) {
                userManager.cleanupTempInstances();
            }
        } catch (error) {
            console.error('[OutfitTracker] Error during temp instance cleanup:', error);
        }
    }

    // Schedule cleanup of old temporary instances periodically (every 10 minutes)
    setInterval(cleanupOldTempInstances, 10 * 60 * 1000);
}