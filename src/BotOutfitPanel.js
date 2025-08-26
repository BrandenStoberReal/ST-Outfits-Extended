import { getContext } from "../../../../extensions.js";
import { extension_settings } from "../../../../extensions.js";
import { dragElement } from './shared.js';
import { escape } from "lodash";

export class BotOutfitPanel {
    constructor(outfitManager) {
        console.log("BotOutfitPanel created");
        this.outfitManager = outfitManager;
        this.isVisible = false;
        this.domElement = null;
        this.initialized = false;
    }

    createPanel() {
        console.log("Creating bot outfit panel");
        const panel = document.createElement('div');
        panel.id = 'bot-outfit-panel';
        panel.className = 'outfit-panel';

        panel.innerHTML = `
            <div class="outfit-header">
                <h3>${escape(this.outfitManager.character)}'s Outfit</h3>
                <div class="outfit-actions">
                    <span class="outfit-action" id="bot-outfit-refresh">↻</span>
                    <span class="outfit-action" id="bot-outfit-close">×</span>
                </div>
            </div>
            <div class="outfit-tabs">
                <button class="outfit-tab-btn active" data-tab="clothing">Clothing</button>
                <button class="outfit-tab-btn" data-tab="accessories">Accessories</button>
                <button class="outfit-tab-btn" data-tab="outfits">Outfits</button>
            </div>
            <div class="outfit-tab-content clothing active">
                <div class="outfit-slots"></div>
            </div>
            <div class="outfit-tab-content accessories">
                <div class="outfit-slots"></div>
            </div>
            <div class="outfit-tab-content outfits">
                <div class="outfits-container"></div>
                <div style="margin-top: 10px; text-align: center;">
                    <button id="save-bot-outfit" class="menu_button">Save Current Outfit</button>
                </div>
            </div>
        `;

        return panel;
    }
    
    setupTabs() {
        if (!this.domElement) return;
        
        const tabButtons = this.domElement.querySelectorAll('.outfit-tab-btn');
        const tabContents = this.domElement.querySelectorAll('.outfit-tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Update active button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Show selected tab
                tabContents.forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.classList.contains(tabName)) {
                        tab.classList.add('active');
                    }
                });
                
                // Render content based on tab
                if (tabName === 'clothing' || tabName === 'accessories') {
                    this.renderSlots(tabName);
                }
                else if (tabName === 'outfits') {
                    this.renderOutfits();
                }
                
                console.log(`Switched to tab: ${tabName}`);
            });
        });
    }
    
    renderSlots(slotType) {
        if (!this.domElement) {
            console.log("Cannot render slots - no DOM element");
            return;
        }
        
        const container = this.domElement.querySelector(`.${slotType} .outfit-slots`);
        if (!container) {
            console.log(`Container for ${slotType} not found`);
            return;
        }
        
        console.log(`Rendering ${slotType} slots`);
        container.innerHTML = '';
        
        // Filter slots by type
        const slots = slotType === 'clothing' ? 
            this.outfitManager.clothingSlots : 
            this.outfitManager.accessorySlots;
        
        if (!slots || !slots.length) {
            container.innerHTML = `<p>No ${slotType} slots defined</p>`;
            console.log(`No ${slotType} slots defined`);
            return;
        }
        
        slots.forEach(slot => {
            // Safely get current value
            const currentValue = this.outfitManager.currentValues[slot] || 'None';
            
            const slotElement = document.createElement('div');
            slotElement.className = 'outfit-slot';
            slotElement.dataset.slot = slot;
            slotElement.innerHTML = `
                <div class="slot-label">${this.formatSlotName(slot)}</div>
                <div class="slot-value" title="${escape(currentValue)}">${escape(currentValue)}</div>
                <div class="slot-actions">
                    <button class="slot-change">Change</button>
                </div>
            `;
            
            slotElement.querySelector('.slot-change').addEventListener('click', async () => {
                try {
                    const message = await this.outfitManager.changeOutfitItem(slot);
                    if (message && extension_settings.outfit_tracker?.enableSysMessages) {
                        this.sendSystemMessage(message);
                    }
                    this.renderSlots(slotType);
                } catch (error) {
                    console.error("Error changing slot:", slot, error);
                    toastr.error("Failed to update slot");
                }
            });
            
            container.appendChild(slotElement);
        });
    }
    
    renderOutfits() {
        if (!this.domElement) return;
        
        console.log("Rendering outfits tab");
        const container = this.domElement.querySelector('.outfits .outfits-container');
        if (!container) return;
        
        container.innerHTML = '';
        const presetNames = this.outfitManager.getPresetNames();
        
        if (!presetNames || !presetNames.length) {
            container.innerHTML = '<p>No outfits saved for this character yet. Click "Save Current Outfit" below.</p>';
            return;
        }
        
        presetNames.forEach(name => {
            const presetItem = document.createElement('div');
            presetItem.className = 'outfit-preset-item';
            presetItem.innerHTML = `
                <div class="outfit-preset-name">${escape(name)}</div>
                <div class="outfit-preset-actions">
                    <button class="preset-wear-btn">Wear</button>
                    <button class="preset-delete-btn">×</button>
                </div>
            `;
            
            presetItem.querySelector('.preset-wear-btn').addEventListener('click', async () => {
                try {
                    const result = this.outfitManager.loadPreset(name);
                    if (!result) return;
                    
                    if (extension_settings.outfit_tracker.enableSysMessages) {
                        this.sendSystemMessage(result.message);
                    }
                    
                    // Refresh all tabs
                    this.renderSlots('clothing');
                    this.renderSlots('accessories');
                    this.renderOutfits();
                    
                    toastr.success(`${this.outfitManager.character} changed outfit to ${name}`);
                } catch (error) {
                    console.error("Error wearing outfit:", name, error);
                    toastr.error("Failed to apply outfit");
                }
            });
            
            presetItem.querySelector('.preset-delete-btn').addEventListener('click', () => {
                try {
                    if (confirm(`Delete "${name}" outfit for ${this.outfitManager.character}?`)) {
                        if (this.outfitManager.deletePreset(name)) {
                            this.renderOutfits();
                            toastr.success(`"${name}" outfit deleted`);
                        }
                    }
                } catch (error) {
                    console.error("Error deleting outfit:", name, error);
                    toastr.error("Failed to delete outfit");
                }
            });
            
            container.appendChild(presetItem);
        });
        
        // Setup save button
        const saveButton = this.domElement.querySelector('#save-bot-outfit');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                try {
                    const name = prompt('Name for this outfit preset:');
                    if (!name || name.trim() === '') {
                        toastr.warning("Please enter a valid name");
                        return;
                    }
                    
                    const message = this.outfitManager.savePreset(name);
                    this.renderOutfits();
                    toastr.success(message);
                } catch (error) {
                    console.error("Error saving outfit:", error);
                    toastr.error("Failed to save outfit");
                }
            });
        }
    }
    
    formatSlotName(name) {
        // Format slot names nicely
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    sendSystemMessage(message) {
        try {
            const chatInput = document.getElementById('send_textarea');
            if (!chatInput) {
                console.error('Chat input not found');
                return;
            }
            
            chatInput.value = `/sys compact=true ${message}`;
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
                const sendButton = document.querySelector('#send_but');
                if (sendButton) {
                    sendButton.click();
                } else {
                    const event = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        bubbles: true
                    });
                    chatInput.dispatchEvent(event);
                }
            }, 100);
        } catch (error) {
            console.error("Failed to send system message:", error);
        }
    }
    
    updateCharacter(name) {
        try {
            console.log(`Updating character name to: ${name}`);
            if (this.outfitManager.character === name) return;
            
            this.outfitManager.setCharacter(name);
            
            if (this.domElement) {
                const header = this.domElement.querySelector('.outfit-header h3');
                if (header) header.textContent = `${name}'s Outfit`;
                this.renderSlots('clothing');
                this.renderSlots('accessories');
                this.renderOutfits();
            }
        } catch (error) {
            console.error("Error updating character:", error);
        }
    }

    toggle() {
        this.isVisible ? this.hide() : this.show();
    }

    show() {
        try {
            if (!this.initialized) {
                this.domElement = this.createPanel();
                this.setupTabs();
                this.initialized = true;
                console.log("Initialized new bot panel");
            }
            
            this.domElement.style.display = 'block';
            this.isVisible = true;
            this.renderSlots('clothing');
            this.renderOutfits();
            
            if (this.domElement) {
                dragElement($(this.domElement));
                
                this.domElement.querySelector('#bot-outfit-refresh')?.addEventListener('click', () => {
                    this.outfitManager.initializeOutfit();
                    this.renderSlots('clothing');
                    this.renderSlots('accessories');
                    this.renderOutfits();
                    toastr.info(`${this.outfitManager.character}'s outfit refreshed`);
                });
    
                this.domElement.querySelector('#bot-outfit-close')?.addEventListener('click', () => this.hide());
            }
            
            console.log("Panel shown");
            return true;
        } catch (error) {
            console.error("Error showing panel:", error);
            toastr.error("Failed to open outfit panel");
            return false;
        }
    }

    hide() {
        try {
            if (this.domElement) {
                this.domElement.style.display = 'none';
            }
            this.isVisible = false;
            console.log("Panel hidden");
        } catch (error) {
            console.error("Error hiding panel:", error);
        }
    }
}
