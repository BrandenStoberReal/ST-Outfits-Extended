// Import shared UI utilities for drag and resize functionality
import { dragElementWithSave, resizeElement } from '../common/shared.js';

export class UserOutfitPanel {
    constructor(outfitManager, clothingSlots, accessorySlots, saveSettingsDebounced) {
        this.outfitManager = outfitManager;
        this.clothingSlots = clothingSlots;
        this.accessorySlots = accessorySlots;
        this.isVisible = false;
        this.domElement = null;
        this.currentTab = 'clothing';
        this.saveSettingsDebounced = saveSettingsDebounced;
        this.eventListeners = []; // Track event listeners for cleanup
        this.outfitSubscription = null; // Track outfit data subscription
    }

    createPanel() {
        if (this.domElement) {
            return this.domElement;
        }

        const panel = document.createElement('div');

        panel.id = 'user-outfit-panel';
        panel.className = 'outfit-panel';

        // Get the first message hash for display in the header (instance ID)
        const messageHash = this.generateMessageHash(this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || '');
        const hashDisplay = messageHash ? ` (${messageHash})` : '';
        
        panel.innerHTML = `
            <div class="outfit-header">
                <h3>Your Outfit${hashDisplay}</h3>
                <div class="outfit-actions">
                    <span class="outfit-action" id="user-outfit-refresh">↻</span>
                    <span class="outfit-action" id="user-outfit-close">×</span>
                </div>
            </div>
            <div class="outfit-tabs">
                <button class="outfit-tab${this.currentTab === 'clothing' ? ' active' : ''}" data-tab="clothing">Clothing</button>
                <button class="outfit-tab${this.currentTab === 'accessories' ? ' active' : ''}" data-tab="accessories">Accessories</button>
                <button class="outfit-tab${this.currentTab === 'outfits' ? ' active' : ''}" data-tab="outfits">Outfits</button>
            </div>
            <div class="outfit-content" id="user-outfit-tab-content"></div>
        `;

        document.body.appendChild(panel);
        
        const tabs = panel.querySelectorAll('.outfit-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                const tabName = event.target.dataset.tab;

                this.currentTab = tabName;
                this.renderContent();
                
                tabs.forEach(t => t.classList.remove('active'));
                event.target.classList.add('active');
            });
        });

        return panel;
    }
    
    // Get the first character message text to generate hash from (instance ID)
    getFirstMessageText() {
        try {
            const context = window.getContext();

            if (context && context.chat && Array.isArray(context.chat)) {
                // Get the first AI message from the character (instance identifier)
                const aiMessages = context.chat.filter(msg => 
                    !msg.is_user && !msg.is_system);
                
                if (aiMessages.length > 0) {
                    const firstMessage = aiMessages[0];

                    return firstMessage.mes || '';
                }
            }
            return '';
        } catch (error) {
            console.warn('Could not get first message text for hash generation:', error);
            return '';
        }
    }

    renderContent() {
        if (!this.domElement) {return;}
        
        const contentArea = this.domElement.querySelector('.outfit-content');

        if (!contentArea) {return;}
        
        contentArea.innerHTML = '';
        
        switch(this.currentTab) {
        case 'clothing':
            this.renderSlots(this.clothingSlots, contentArea);
            this.renderFillOutfitButton(contentArea);
            break;
        case 'accessories':
            this.renderSlots(this.accessorySlots, contentArea);
            break;
        case 'outfits':
            this.renderPresets(contentArea);
            break;
        }
    }

    renderSlots(slots, container) {
        const outfitData = this.outfitManager.getOutfitData(slots);
    
        outfitData.forEach(slot => {
            const slotElement = document.createElement('div');

            slotElement.className = 'outfit-slot';
            slotElement.dataset.slot = slot.name;
    
            slotElement.innerHTML = `
                <div class="slot-label">${this.formatSlotName(slot.name)}</div>
                <div class="slot-value" title="${slot.value}">${slot.value}</div>
                <div class="slot-actions">
                    <button class="slot-change">Change</button>
                </div>
            `;
    
            slotElement.querySelector('.slot-change').addEventListener('click', async () => {
                const message = await this.outfitManager.changeOutfitItem(slot.name);

                if (message && window.extension_settings.outfit_tracker?.enableSysMessages) {
                    this.sendSystemMessage(message);
                }
                this.saveSettingsDebounced();
                this.renderContent();
            });
    
            container.appendChild(slotElement);
        });
    }

    renderPresets(container) {
        const presets = this.outfitManager.getPresets();
        
        // Filter out the 'default' preset from the list of regular presets
        const regularPresets = presets.filter(preset => preset !== 'default');
        
        // Get the name of the preset that is currently set as default
        const defaultPresetName = this.outfitManager.getDefaultPresetName();
        
        if (regularPresets.length === 0 && !this.outfitManager.hasDefaultOutfit()) {
            container.innerHTML = '<div>No saved outfits for this instance.</div>';
        } else {
            // Check if we have a default that doesn't match any saved preset (like 'default' preset)
            if (defaultPresetName === 'default') {
                // Create a special entry for the unmatched default
                const defaultPresetElement = document.createElement('div');

                defaultPresetElement.className = 'outfit-preset default-preset';
                defaultPresetElement.innerHTML = `
                    <div class="preset-name">Default: Current Setup</div>
                    <div class="preset-actions">
                        <button class="load-preset" data-preset="default">Wear</button>
                    </div>
                `;
                
                defaultPresetElement.querySelector('.load-preset').addEventListener('click', async () => {
                    const message = await this.outfitManager.loadDefaultOutfit();

                    if (message && window.extension_settings.outfit_tracker?.enableSysMessages) {
                        this.sendSystemMessage(message);
                    }
                    this.saveSettingsDebounced();
                    this.renderContent();
                });
                
                container.appendChild(defaultPresetElement);
            }
            
            // Render all presets if the default is not 'default' (meaning we have named presets)
            if (defaultPresetName !== 'default' && regularPresets.length > 0) {
                regularPresets.forEach(preset => {
                    const isDefault = (defaultPresetName === preset);
                    const presetElement = document.createElement('div');

                    presetElement.className = `outfit-preset ${isDefault ? 'default-preset' : ''}`;
                    presetElement.innerHTML = `
                        <div class="preset-name">${preset}${isDefault ? '' : ''}</div>
                        <div class="preset-actions">
                            <button class="load-preset" data-preset="${preset}">Wear</button>
                            <button class="set-default-preset" data-preset="${preset}" ${isDefault ? 'style="display:none;"' : ''}>Default</button>
                            <button class="overwrite-preset" data-preset="${preset}">Overwrite</button>
                            <button class="delete-preset" data-preset="${preset}">×</button>
                        </div>
                    `;
                    
                    presetElement.querySelector('.load-preset').addEventListener('click', async () => {
                        const message = await this.outfitManager.loadPreset(preset);

                        if (message && window.extension_settings.outfit_tracker?.enableSysMessages) {
                            this.sendSystemMessage(message);
                        }
                        this.saveSettingsDebounced();
                        this.renderContent();
                    });
                    
                    presetElement.querySelector('.set-default-preset').addEventListener('click', async () => {
                        const message = await this.outfitManager.setPresetAsDefault(preset);

                        if (message && window.extension_settings.outfit_tracker?.enableSysMessages) {
                            this.sendSystemMessage(message);
                        }
                        this.saveSettingsDebounced();
                        this.renderContent();
                    });
                    
                    presetElement.querySelector('.delete-preset').addEventListener('click', () => {
                        if (defaultPresetName !== preset) {
                            // If it's not the default preset, just delete normally
                            if (confirm(`Delete "${preset}" outfit?`)) {
                                const message = this.outfitManager.deletePreset(preset);

                                if (message && window.extension_settings.outfit_tracker?.enableSysMessages) {
                                    this.sendSystemMessage(message);
                                }
                                this.saveSettingsDebounced();
                                this.renderContent();
                            }
                        } else if (confirm(`Delete "${preset}"? This will also clear it as the default outfit.`)) {
                            // If trying to delete the default preset, warn user that it will also clear the default
                            // Delete the preset
                            const message = this.outfitManager.deletePreset(preset);
                            
                            if (window.extension_settings.outfit_tracker?.enableSysMessages) {
                                this.sendSystemMessage(message + ' Default outfit cleared.');
                            }
                            this.saveSettingsDebounced();
                            this.renderContent();
                        }
                    });
                    
                    presetElement.querySelector('.overwrite-preset').addEventListener('click', () => {
                        // Confirmation dialog to confirm overwriting the preset
                        if (confirm(`Overwrite "${preset}" with current outfit?`)) {
                            const message = this.outfitManager.overwritePreset(preset);

                            if (message && window.extension_settings.outfit_tracker?.enableSysMessages) {
                                this.sendSystemMessage(message);
                            }
                            this.saveSettingsDebounced();
                            this.renderContent();
                        }
                    });
                    
                    container.appendChild(presetElement);
                });
            }
        }
    
        // Add save regular outfit button
        const saveButton = document.createElement('button');

        saveButton.className = 'save-outfit-btn';
        saveButton.textContent = 'Save Current Outfit';
        saveButton.style.marginTop = '5px';
        saveButton.addEventListener('click', async () => {
            const presetName = prompt('Name this outfit:');

            if (presetName && presetName.toLowerCase() !== 'default') {
                const message = await this.outfitManager.savePreset(presetName.trim());

                if (message && window.extension_settings.outfit_tracker?.enableSysMessages) {
                    this.sendSystemMessage(message);
                }
                this.saveSettingsDebounced();
                this.renderContent();
            } else if (presetName && presetName.toLowerCase() === 'default') {
                alert('Please save this outfit with a different name, then use the "Default" button on that outfit.');
            }
        });

        container.appendChild(saveButton);
    }

    sendSystemMessage(message) {
        // Use toastr popup instead of /sys command
        if (window.extension_settings.outfit_tracker?.enableSysMessages) {
            toastr.info(message, 'Outfit System', {
                timeOut: 4000,
                extendedTimeOut: 8000
            });
        }
    }

    renderFillOutfitButton(container) {
        const fillOutfitButton = document.createElement('button');

        fillOutfitButton.className = 'fill-outfit-btn';
        fillOutfitButton.textContent = 'Fill Outfit with LLM';
        fillOutfitButton.style.marginTop = '5px';
        fillOutfitButton.style.marginBottom = '10px';
        fillOutfitButton.style.width = '100%';
        
        fillOutfitButton.addEventListener('click', () => {
            alert('Fill Outfit with LLM is only available for character outfits, not user outfits.');
        });
        
        container.appendChild(fillOutfitButton);
    }

    formatSlotName(name) {
        // First do some special replacements for confusing terms
        let formattedName = name;
        
        // Replace confusing slot names with more descriptive equivalents
        formattedName = formattedName
            .replace('topunderwear', 'Top Underwear / Inner Top')
            .replace('bottomunderwear', 'Bottom Underwear / Inner Bottom')
            .replace('footunderwear', 'Foot Underwear / Socks');
        
        // Make accessory labels more descriptive
        formattedName = formattedName
            .replace('head-accessory', 'Head Accessory')
            .replace('ears-accessory', 'Ears Accessory')
            .replace('eyes-accessory', 'Eyes Accessory')
            .replace('mouth-accessory', 'Mouth Accessory')
            .replace('neck-accessory', 'Neck Accessory')
            .replace('body-accessory', 'Body Accessory')
            .replace('arms-accessory', 'Arms Accessory')
            .replace('hands-accessory', 'Hands Accessory')
            .replace('waist-accessory', 'Waist Accessory')
            .replace('bottom-accessory', 'Bottom Accessory')
            .replace('legs-accessory', 'Legs Accessory')
            .replace('foot-accessory', 'Foot Accessory');
        
        // Then apply general formatting
        return formattedName
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^./, str => str.toUpperCase())
            .replace(/-/g, ' ')
            .replace('underwear', 'Underwear');
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }



    show() {
        if (!this.domElement) {
            this.domElement = this.createPanel();
        }
        
        // Update the header to ensure it has the latest instance ID
        this.updateHeader();
        
        this.renderContent();
        this.domElement.style.display = 'flex';
        this.applyPanelColors(); // Apply colors after showing
        this.isVisible = true;

        // Set up dynamic refresh when panel becomes visible
        this.setupDynamicRefresh();

        if (this.domElement) {
            dragElementWithSave($(this.domElement), 'user-outfit-panel');
            // Initialize resizing with appropriate min/max dimensions
            setTimeout(() => {
                resizeElement($(this.domElement), 'user-outfit-panel', {
                    minWidth: 250,
                    minHeight: 200,
                    maxWidth: 600,
                    maxHeight: 800
                });
            }, 10); // Small delay to ensure panel is rendered first
            
            this.domElement.querySelector('#user-outfit-refresh')?.addEventListener('click', () => {
                this.outfitManager.loadOutfit();
                this.renderContent();
            });

            this.domElement.querySelector('#user-outfit-close')?.addEventListener('click', () => this.hide());
        }
    }

    // Apply panel colors based on saved preferences
    applyPanelColors() {
        if (window.extension_settings && window.extension_settings.outfit_tracker && this.domElement) {
            const colors = window.extension_settings.outfit_tracker.userPanelColors;

            if (colors) {
                this.domElement.style.background = colors.primary;
                this.domElement.style.border = `1px solid ${colors.border}`;
                this.domElement.style.boxShadow = `0 8px 32px ${colors.shadow}`;
            }
        }
    }

    hide() {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
        
        // Clean up dynamic refresh when panel is hidden
        this.cleanupDynamicRefresh();
    }
    
    // Update the header to reflect changes (like new instance ID)
    updateHeader() {
        // Create the panel if it doesn't exist yet, so we can update the header
        if (!this.domElement) {
            this.createPanel();
        }
        
        if (this.domElement) {
            const header = this.domElement.querySelector('.outfit-header h3');

            if (header) {
                // Get the first message hash for display in the header (instance ID)
                const messageHash = this.generateMessageHash(this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || '');
                const hashDisplay = messageHash ? ` (${messageHash})` : '';
                
                header.textContent = `Your Outfit${hashDisplay}`;
            }
        }
    }

    // Set up dynamic refresh listeners when the panel is shown
    setupDynamicRefresh() {
        // Clean up any existing listeners first
        this.cleanupDynamicRefresh();

        // Subscribe to store changes if we have access to the store
        if (window.outfitStore) {
            // Listen for changes in user outfit data
            this.outfitSubscription = window.outfitStore.subscribe((state) => {
                // Check if this panel's outfit instance has changed
                if (this.outfitManager.outfitInstanceId) {
                    const currentUserOutfit = state.userInstances[this.outfitManager.outfitInstanceId];
                    if (currentUserOutfit) {
                        // Only refresh if the outfit data has actually changed
                        let hasChanged = false;
                        for (const [slot, value] of Object.entries(currentUserOutfit)) {
                            if (this.outfitManager.currentValues[slot] !== value) {
                                hasChanged = true;
                                break;
                            }
                        }
                        
                        if (hasChanged && this.isVisible) {
                            this.renderContent();
                        }
                    }
                }
            });
        }

        // Get context to set up event listeners
        const context = window.getContext && window.getContext();
        if (context && context.eventSource && context.event_types) {
            const { eventSource, event_types } = context;

            // Listen for chat-related events that might affect outfit data
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_CHANGED, () => {
                if (this.isVisible) {
                    this.renderContent();
                }
            }));
            
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_ID_CHANGED, () => {
                if (this.isVisible) {
                    this.renderContent();
                }
            }));

            this.eventListeners.push(() => eventSource.on(event_types.CHAT_CREATED, () => {
                if (this.isVisible) {
                    this.renderContent();
                }
            }));
            
            this.eventListeners.push(() => eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                if (this.isVisible) {
                    this.renderContent();
                }
            }));
        }
    }

    // Clean up dynamic refresh listeners when the panel is hidden
    cleanupDynamicRefresh() {
        // Unsubscribe from store changes
        if (this.outfitSubscription) {
            this.outfitSubscription();
            this.outfitSubscription = null;
        }

        // Remove event listeners
        this.eventListeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.eventListeners = [];
    }

    // Generate a short identifier from the instance ID
    generateShortId(instanceId) {
        if (!instanceId) {return '';}
        
        // If the instance ID is already a short identifier, return it
        if (instanceId.startsWith('temp_')) {return 'temp';}
        
        // Create a simple short identifier by taking up to 6 characters of the instance ID
        // but only alphanumeric characters for better readability
        const cleanId = instanceId.replace(/[^a-zA-Z0-9]/g, '');

        return cleanId.substring(0, 6);
    }
    
    // Generate an 8-character hash from a text string
    generateMessageHash(text) {
        if (!text) {return '';}
        
        let hash = 0;
        const str = text.substring(0, 100); // Only use first 100 chars to keep ID manageable
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);

            hash = ((hash << 5) - hash) + char;
            hash &= hash; // Convert to 32-bit integer
        }
        
        // Convert to positive and return 8-character string representation
        return Math.abs(hash).toString(36).substring(0, 8).padEnd(8, '0');
    }
}