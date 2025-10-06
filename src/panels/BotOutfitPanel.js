import { dragElementWithSave, resizeElement } from '../common/shared.js';
import { extractCommands } from '../utils/StringProcessor.js';
import { LLMUtility } from '../utils/LLMUtility.js';

export class BotOutfitPanel {
    constructor(outfitManager, clothingSlots, accessorySlots, saveSettingsDebounced) {
        this.outfitManager = outfitManager;
        this.clothingSlots = clothingSlots;
        this.accessorySlots = accessorySlots;
        this.isVisible = false;
        this.domElement = null;
        this.currentTab = 'clothing';
        this.saveSettingsDebounced = saveSettingsDebounced;
    }

    createPanel() {
        if (this.domElement) {
            return this.domElement;
        }

        const panel = document.createElement('div');
        panel.id = 'bot-outfit-panel';
        panel.className = 'outfit-panel';

        panel.innerHTML = `
            <div class="outfit-header">
                <h3>${this.outfitManager.character}'s Outfit</h3>
                <div class="outfit-actions">
                    <span class="outfit-action" id="bot-outfit-refresh">↻</span>
                    <span class="outfit-action" id="bot-outfit-close">×</span>
                </div>
            </div>
            <div class="outfit-tabs">
                <button class="outfit-tab${this.currentTab === 'clothing' ? ' active' : ''}" data-tab="clothing">Clothing</button>
                <button class="outfit-tab${this.currentTab === 'accessories' ? ' active' : ''}" data-tab="accessories">Accessories</button>
                <button class="outfit-tab${this.currentTab === 'outfits' ? ' active' : ''}" data-tab="outfits">Outfits</button>
            </div>
            <div class="outfit-content" id="bot-outfit-tab-content"></div>
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

    renderContent() {
        if (!this.domElement) return;
        
        const contentArea = this.domElement.querySelector('.outfit-content');
        if (!contentArea) return;
        
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
            container.innerHTML = '<div>No saved outfits for this character.</div>';
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
            } else {
                // Render all presets, highlighting the default one
                regularPresets.forEach(preset => {
                    const isDefault = (defaultPresetName === preset);
                    const presetElement = document.createElement('div');
                    presetElement.className = `outfit-preset ${isDefault ? 'default-preset' : ''}`;
                    presetElement.innerHTML = `
                        <div class="preset-name">${preset}${isDefault ? '' : ''}</div>
                        <div class="preset-actions">
                            <button class="load-preset" data-preset="${preset}">Wear</button>
                            <button class="set-default-preset" data-preset="${preset}" ${isDefault ? 'style="display:none;"' : ''}>Default</button>
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
                        } else {
                            // If trying to delete the default preset, warn user that it will also clear the default
                            if (confirm(`Delete "${preset}"? This will also clear it as the default outfit.`)) {
                                // Delete the preset
                                const message = this.outfitManager.deletePreset(preset);
                                // Also clear the default
                                delete window.extension_settings.outfit_tracker.presets.bot[this.outfitManager.character]['default'];
                                
                                // Cleanup character if no presets left
                                if (Object.keys(window.extension_settings.outfit_tracker.presets.bot[this.outfitManager.character]).length === 0) {
                                    delete window.extension_settings.outfit_tracker.presets.bot[this.outfitManager.character];
                                }
                                
                                if (window.extension_settings.outfit_tracker?.enableSysMessages) {
                                    this.sendSystemMessage(message + ' Default outfit cleared.');
                                }
                                this.saveSettingsDebounced();
                                this.renderContent();
                            }
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

    renderFillOutfitButton(container) {
        const fillOutfitButton = document.createElement('button');
        fillOutfitButton.className = 'fill-outfit-btn';
        fillOutfitButton.textContent = 'Fill Outfit with LLM';
        fillOutfitButton.style.marginTop = '5px';
        fillOutfitButton.style.marginBottom = '10px';
        fillOutfitButton.style.width = '100%';
        
        fillOutfitButton.addEventListener('click', async () => {
            await this.generateOutfitFromCharacterInfo();
        });
        
        container.appendChild(fillOutfitButton);
    }

    async generateOutfitFromCharacterInfo() {
        try {
            // Show a notification that the process has started
            if (window.extension_settings.outfit_tracker?.enableSysMessages) {
                this.sendSystemMessage('Generating outfit based on character info...');
            }
            
            // Get character data
            const characterInfo = await this.getCharacterData();
            
            if (characterInfo.error) {
                console.error('Error getting character data:', characterInfo.error);
                if (window.extension_settings.outfit_tracker?.enableSysMessages) {
                    this.sendSystemMessage(`Error: ${characterInfo.error}`);
                }
                return;
            }
            
            // Generate outfit from LLM
            const response = await this.generateOutfitFromLLM(characterInfo);
            
            // Parse and apply the outfit commands
            await this.parseAndApplyOutfitCommands(response);
            
            // Success message
            if (window.extension_settings.outfit_tracker?.enableSysMessages) {
                this.sendSystemMessage('Outfit generated and applied successfully!');
            }
        } catch (error) {
            console.error('Error in generateOutfitFromCharacterInfo:', error);
            if (window.extension_settings.outfit_tracker?.enableSysMessages) {
                this.sendSystemMessage(`Error generating outfit: ${error.message}`);
            }
        }
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

    async getCharacterData() {
        const context = window.getContext();
        
        if (!context || !context.characters || context.characterId === undefined || context.characterId === null) {
            return {
                error: "No character selected or context not ready"
            };
        }
        
        const character = context.characters[context.characterId];
        if (!character) {
            return {
                error: "Character not found"
            };
        }
        
        // Get character information
        const characterInfo = {
            name: character.name || 'Unknown',
            description: character.description || '',
            personality: character.personality || '',
            scenario: character.scenario || '',
            firstMessage: character.first_message || '',
            characterNotes: character.character_notes || '',
        };
        
        // Get the first message from the current chat if it's different from the character's first_message
        if (context.chat && context.chat.length > 0) {
            const firstChatMessage = context.chat.find(msg => !msg.is_user && !msg.is_system);
            if (firstChatMessage && firstChatMessage.mes) {
                characterInfo.firstMessage = firstChatMessage.mes;
            }
        }
        
        return characterInfo;
    }

    getDefaultOutfitPrompt() {
        return `Based on the character's description, personality, scenario, notes, and first message, generate appropriate outfit commands.

CHARACTER INFO:
Name: <CHARACTER_NAME>
Description: <CHARACTER_DESCRIPTION>
Personality: <CHARACTER_PERSONALITY>
Scenario: <CHARACTER_SCENARIO>
Notes: <CHARACTER_NOTES>
First Message: <CHARACTER_FIRST_MESSAGE>

OUTPUT FORMAT (one command per line):
outfit-system_wear_headwear("item name")
outfit-system_wear_topwear("item name")
outfit-system_remove_headwear()  // for items not applicable

SLOTS:
Clothing: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear
Accessories: head-accessory, ears-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory

INSTRUCTIONS:
- Only output outfit commands based on character details
- Use "remove" for items that don't fit the character
- If uncertain about an item, omit the command
- Output only commands, no explanations`;
    }

    async generateOutfitFromLLM(characterInfo) {
        try {
            // Get the current system prompt or use the default
            let prompt = this.getDefaultOutfitPrompt();
            
            // Replace placeholders with actual character info
            prompt = prompt
                .replace('<CHARACTER_NAME>', characterInfo.name)
                .replace('<CHARACTER_DESCRIPTION>', characterInfo.description)
                .replace('<CHARACTER_PERSONALITY>', characterInfo.personality)
                .replace('<CHARACTER_SCENARIO>', characterInfo.scenario)
                .replace('<CHARACTER_NOTES>', characterInfo.characterNotes)
                .replace('<CHARACTER_FIRST_MESSAGE>', characterInfo.firstMessage);
            
            // Check if there is a connection profile set for the auto outfit system
            let connectionProfile = null;
            if (window.autoOutfitSystem && typeof window.autoOutfitSystem.getConnectionProfile === 'function') {
                connectionProfile = window.autoOutfitSystem.getConnectionProfile();
            }
            
            // Use the unified LLM utility with profile if available
            return await LLMUtility.generateWithProfile(
                prompt,
                "You are an outfit generation system. Based on the character information provided, output outfit commands to set the character's clothing and accessories.",
                window.getContext(),
                connectionProfile
            );
        } catch (error) {
            console.error('Error generating outfit from LLM:', error);
            throw error;
        }
    }

    async parseAndApplyOutfitCommands(response) {
        // Use the imported extractCommands function to extract outfit commands
        const commands = extractCommands(response);
        
        if (!commands || commands.length === 0) {
            console.log('[BotOutfitPanel] No outfit commands found in response');
            return;
        }
        
        console.log(`[BotOutfitPanel] Found ${commands.length} commands to process:`, commands);
        
        // Process each command
        for (const command of commands) {
            try {
                await this.processSingleCommand(command);
            } catch (error) {
                console.error(`Error processing command "${command}":`, error);
            }
        }
        
        // Update the outfit panel UI
        this.renderContent();
        
        // Save the settings
        this.saveSettingsDebounced();
    }

    async processSingleCommand(command) {
        try {
            // Non-regex approach to parse command - similar to AutoOutfitSystem
            if (!command.startsWith('outfit-system_')) {
                throw new Error(`Invalid command format: ${command}`);
            }
            
            // Extract the action part
            const actionStart = 'outfit-system_'.length;
            const actionEnd = command.indexOf('_', actionStart);
            if (actionEnd === -1) {
                throw new Error(`Invalid command format: ${command}`);
            }
            
            const action = command.substring(actionStart, actionEnd);
            if (!['wear', 'remove', 'change'].includes(action)) {
                throw new Error(`Invalid action: ${action}. Valid actions: wear, remove, change`);
            }
            
            // Extract the slot part
            const slotStart = actionEnd + 1;
            const slotEnd = command.indexOf('(', slotStart);
            if (slotEnd === -1) {
                throw new Error(`Invalid command format: ${command}`);
            }
            
            const slot = command.substring(slotStart, slotEnd);
            
            // Extract the value part
            const valueStart = slotEnd + 1;
            let value = '';
            
            if (command.charAt(valueStart) === '"') { // If value is quoted
                const quoteStart = valueStart + 1;
                let i = quoteStart;
                let escaped = false;
                
                while (i < command.length - 1) {
                    const char = command.charAt(i);
                    
                    if (escaped) {
                        value += char;
                        escaped = false;
                    } else if (char === '\\') {
                        escaped = true;
                    } else if (char === '"') {
                        break; // Found closing quote
                    } else {
                        value += char;
                    }
                    
                    i++;
                }
            } else {
                // Value is not quoted, extract until closing parenthesis
                const closingParen = command.indexOf(')', valueStart);
                if (closingParen !== -1) {
                    value = command.substring(valueStart, closingParen);
                }
            }
            
            const cleanValue = value.replace(/"/g, '').trim();
            
            console.log(`[BotOutfitPanel] Processing: ${action} ${slot} "${cleanValue}"`);
            
            // Apply the outfit change to the bot manager
            const message = await this.outfitManager.setOutfitItem(slot, action === 'remove' ? 'None' : cleanValue);
            
            // Show system message if enabled
            if (message && window.extension_settings.outfit_tracker?.enableSysMessages) {
                this.sendSystemMessage(message);
            }
            
        } catch (error) {
            console.error('Error processing single command:', error);
            throw error;
        }
    }

    toggle() {
        this.isVisible ? this.hide() : this.show();
    }



    show() {
        if (!this.domElement) {
            this.domElement = this.createPanel();
        }
        
        this.renderContent();
        this.domElement.style.display = 'flex';
        this.isVisible = true;

        if (this.domElement) {
            dragElementWithSave($(this.domElement), 'bot-outfit-panel');
            // Initialize resizing with appropriate min/max dimensions
            setTimeout(() => {
                resizeElement($(this.domElement), 'bot-outfit-panel', {
                    minWidth: 250,
                    minHeight: 200,
                    maxWidth: 600,
                    maxHeight: 800
                });
            }, 10); // Small delay to ensure panel is rendered first
            
            this.domElement.querySelector('#bot-outfit-refresh')?.addEventListener('click', () => {
                this.outfitManager.initializeOutfit();
                this.renderContent();
            });

            this.domElement.querySelector('#bot-outfit-close')?.addEventListener('click', () => this.hide());
        }
    }

    hide() {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
    }

    updateCharacter(name) {
        this.outfitManager.setCharacter(name);
        if (this.domElement) {
            const header = this.domElement.querySelector('.outfit-header h3');
            if (header) header.textContent = `${name}'s Outfit`;
        }
        this.renderContent();
    }
}