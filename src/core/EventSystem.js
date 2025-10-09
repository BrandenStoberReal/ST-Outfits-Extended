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
            // Reset the first message initialization flag for the new chat
            if (typeof window.resetFirstMessageInitialized === 'function') {
                window.resetFirstMessageInitialized();
            }

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

    // Listen for character message rendered event to handle first message rendering
    // The CHARACTER_MESSAGE_RENDERED event is emitted with the message ID and type
    // When type is 'first_message' it indicates the first AI message in a chat was rendered
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (messageId, type) => {
        console.log(`[OutfitTracker] CHARACTER_MESSAGE_RENDERED event fired with message ID: ${messageId}, type: ${type}`);
        try {
            if (type === 'first_message') {
                const context = window.getContext();

                if (context && context.chat && context.chat.length > 0) {
                    // Find the first AI message in the chat
                    const aiMessages = context.chat.filter(msg => 
                        !msg.is_user && !msg.is_system);

                    if (aiMessages.length > 0) {
                        const firstMessage = aiMessages[0];
                        
                        console.log('[OutfitTracker] First message detected on render:', firstMessage);

                        // Create a specific outfit instance based on the first message content
                        const firstMessageText = firstMessage.mes || '';

                        // Use the same simple hash function as defined in ExtensionCore.js for consistent instance ID generation
                        let hash = 0;
                        const str = firstMessageText.substring(0, 100); // Only use first 100 chars to keep ID manageable

                        for (let i = 0; i < str.length; i++) {
                            const char = str.charCodeAt(i);

                            hash = ((hash << 5) - hash) + char;
                            hash &= hash; // Convert to 32-bit integer
                        }

                        // Convert to positive and return string representation
                        const textHash = Math.abs(hash).toString(36);
                        const instanceId = `first_msg_${textHash}`;

                        if (botManager) {
                            // Check if the instance ID is actually changing before updating
                            const currentInstanceId = botManager.getOutfitInstanceId();
                            
                            // Only update if the instance ID is actually changing
                            if (currentInstanceId !== instanceId) {
                                // Set the outfit instance ID based on the first message scenario
                                botManager.setOutfitInstanceId(instanceId);
                                console.log(`[OutfitTracker] Set bot outfit instance ID after first message render: ${instanceId} (was ${currentInstanceId})`);

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
                                console.log(`[OutfitTracker] Set user outfit instance ID after first message render: ${instanceId} (was ${currentUserInstanceId})`);

                                // Load the outfit data for the new instance
                                userManager.loadOutfit();
                            } else {
                                console.log(`[OutfitTracker] User instance ID unchanged, skipping update: ${instanceId}`);
                            }
                        }

                        // For first message handling, specifically update the panels with the new outfit data
                        // Ensure the bot manager has the character name properly set
                        if (botManager && firstMessage.name) {
                            botManager.setCharacter(firstMessage.name, context.characterId);
                        }
                        
                        // Load the outfit data to ensure it's fresh
                        if (botManager) {
                            botManager.loadOutfit();
                        }
                        if (userManager) {
                            userManager.loadOutfit();
                        }
                        
                        // Update the panels directly to ensure they refresh with the new outfit data
                        if (botPanel && botPanel.isVisible) {
                            botPanel.updateCharacter(botManager.character);
                            botPanel.renderContent();
                        }
                        if (userPanel && userPanel.isVisible) {
                            userPanel.updateHeader();
                            userPanel.renderContent();
                        }

                        console.log(`[OutfitTracker] Created outfit instances after first message render: ${instanceId}`);
                    }
                }
            }
        } catch (error) {
            console.error('[OutfitTracker] Error handling CHARACTER_MESSAGE_RENDERED event:', error);
        }
    });


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
        // Before clearing the chat, save the current outfit data for this character and user
        let savedBotOutfitData = null;
        let savedUserOutfitData = null;

        if (botManager && botManager.characterId && botManager.outfitInstanceId) {
            // Save the current outfit instance data for this character
            const instanceKey = botManager.outfitInstanceId;

            savedBotOutfitData = {
                characterId: botManager.characterId,
                instanceId: instanceKey,
                outfit: { ...botManager.currentValues } // Copy current values
            };

            console.log(`[OutfitTracker] Saved bot outfit instance data before chat clear: ${instanceKey}`);
        }

        if (userManager && userManager.outfitInstanceId) {
            // Save the current user outfit instance data
            const instanceKey = userManager.outfitInstanceId;

            savedUserOutfitData = {
                instanceId: instanceKey,
                outfit: { ...userManager.currentValues } // Copy current values
            };

            console.log(`[OutfitTracker] Saved user outfit instance data before chat clear: ${instanceKey}`);
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

        // After chat is cleared, wait for the chat to be properly reset before proceeding
        // Use a dynamic check for chat state instead of fixed timeout
        await waitForChatReset();
        
        // Call updateForCurrentCharacter and wait for it to complete
        await updateForCurrentCharacter();
        
        // Wait for UI to be ready by checking for outfit panel availability
        await waitForUIReady();
        
        // Restore the saved data to the current instances
        // Restore bot outfit data if it was saved
        if (savedBotOutfitData && botManager) {
            // Set the outfit values for the current instance
            for (const [slot, value] of Object.entries(savedBotOutfitData.outfit)) {
                botManager.currentValues[slot] = value;
            }
            
            // Save the outfit to ensure it's persisted
            await botManager.saveOutfit();
            
            // Reload the outfit to make sure UI is updated
            botManager.loadOutfit();
            
            // Update the UI to reflect the restored data
            if (botPanel) {
                botPanel.renderContent();
            }
            
            console.log('[OutfitTracker] Restored bot outfit data after chat clear');
        }

        // Restore user outfit data if it was saved
        if (savedUserOutfitData && userManager) {
            // Set the outfit values for the current instance
            for (const [slot, value] of Object.entries(savedUserOutfitData.outfit)) {
                userManager.currentValues[slot] = value;
            }
            
            // Save the outfit to ensure it's persisted
            await userManager.saveOutfit();
            
            // Reload the outfit to make sure UI is updated
            userManager.loadOutfit();
            
            // Update the UI to reflect the restored data
            if (userPanel) {
                userPanel.renderContent();
            }
            
            console.log('[OutfitTracker] Restored user outfit data after chat clear');
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
    
    // Wait for chat to be properly reset with a dynamic check instead of fixed timeout
    async function waitForChatReset() {
        const maxWaitTime = 2000; // Maximum wait time of 2 seconds
        const checkInterval = 50; // Check every 50ms
        const startTime = Date.now();
        
        // Wait for the chat to be properly initialized
        while (Date.now() - startTime < maxWaitTime) {
            const context = window.getContext();
            if (context && context.chat && Array.isArray(context.chat)) {
                // Chat is properly initialized, exit the loop
                return;
            }
            // Wait a short interval before checking again
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        // If we've waited too long, log a warning but continue
        console.warn('[OutfitTracker] Timed out waiting for chat reset, continuing with available context');
    }
    
    // Wait for UI to be ready by checking if outfit panels are available
    async function waitForUIReady() {
        const maxWaitTime = 2000; // Maximum wait time of 2 seconds
        const checkInterval = 50; // Check every 50ms
        const startTime = Date.now();
        
        // Wait for the UI to be ready
        while (Date.now() - startTime < maxWaitTime) {
            // Check if both panels exist and are ready
            if ((botPanel && typeof botPanel.renderContent === 'function') && 
                (userPanel && typeof userPanel.renderContent === 'function')) {
                // UI is ready, exit the loop
                return;
            }
            // Wait a short interval before checking again
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        // If we've waited too long, log a warning but continue
        console.warn('[OutfitTracker] Timed out waiting for UI to be ready, continuing');
    }

    // Schedule cleanup of old temporary instances periodically (every 10 minutes)
    setInterval(cleanupOldTempInstances, 10 * 60 * 1000);
}