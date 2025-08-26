import { getContext } from "../../../../extensions.js";
import { extension_settings } from "../../../../extensions.js";
import { dragElement } from './shared.js';

export class BotOutfitPanel {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isVisible = false;
        this.domElement = null;
        this.initialized = false; // New initialization flag
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'bot-outfit-panel';
        panel.className = 'outfit-panel';

        if (!this.domElement) {
            panel.innerHTML = `
                <div class="outfit-header">
                    <h3>${this.outfitManager.character}'s Outfit</h3>
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

            document.body.appendChild(panel);
        }
        return panel;
    }

    setupTabs() {
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
                if (tabName === 'clothing') {
                    this.renderSlots('clothing');
                } 
                else if (tabName === 'accessories') {
                    this.renderSlots('accessories');
                }
                else if (tabName === 'outfits') {
                    this.renderOutfits();
                }
            });
        });
    }

    renderSlots(slotType) {
        const container = this.domElement.querySelector(`.${slotType} .outfit-slots`);
        if (!container) return;
        
        container.innerHTML = '';
        
        // Filter slots by type
        const slots = slotType === 'clothing' ? 
            this.outfitManager.clothingSlots : 
            this.outfitManager.accessorySlots;
        
        slots.forEach(slot => {
            const slotElement = document.createElement('div');
            slotElement.className = 'outfit-slot';
            slotElement.dataset.slot = slot;
            slotElement.innerHTML = `
                <div class="slot-label">${this.formatSlotName(slot)}</div>
                <div class="slot-value" title="${this.outfitManager.currentValues[slot]}">${this.outfitManager.currentValues[slot]}</div>
                <div class="slot-actions">
                    <button class="slot-change">Change</button>
                </div>
            `;
            
            slotElement.querySelector('.slot-change').addEventListener('click', async () => {
                const message = await this.outfitManager.changeOutfitItem(slot);
                if (message && extension_settings.outfit_tracker.enableSysMessages) {
                    this.sendSystemMessage(message);
                }
                this.renderSlots(slotType); // Refresh this tab
            });
            
            container.appendChild(slotElement);
        });
    }

    renderOutfits() {
        const container = this.domElement.querySelector('.outfits .outfits-container');
        if (!container) return;
        
        container.innerHTML = '';
        const presetNames = this.outfitManager.getPresetNames();
        
        if (presetNames.length === 0) {
            container.innerHTML = '<p>No outfits saved yet. Click "Save Current Outfit" below.</p>';
            return;
        }
        
        presetNames.forEach(name => {
            const presetItem = document.createElement('div');
            presetItem.className = 'outfit-preset-item';
            presetItem.innerHTML = `
                <div class="outfit-preset-name">${name}</div>
                <div class="outfit-preset-actions">
                    <button class="preset-wear-btn">Wear</button>
                    <button class="preset-delete-btn">×</button>
                </div>
            `;
            
            presetItem.querySelector('.preset-wear-btn').addEventListener('click', async () => {
                const result = this.outfitManager.loadPreset(name);
                if (!result) return;
                
                if (extension_settings.outfit_tracker.enableSysMessages) {
                    const message = result.message;
                    this.sendSystemMessage(message);
                }
                
                // Refresh all tabs
                this.renderSlots('clothing');
                this.renderSlots('accessories');
            });
            
            presetItem.querySelector('.preset-delete-btn').addEventListener('click', () => {
                if (confirm(`Delete outfit "${name}"?`)) {
                    if (this.outfitManager.deletePreset(name)) {
                        this.renderOutfits();
                        toastr.success(`"${name}" outfit deleted`);
                    }
                }
            });
            
            container.appendChild(presetItem);
        });
        
        // Setup save button
        this.domElement.querySelector('#save-bot-outfit').addEventListener('click', () => {
            const name = prompt('Name for this outfit preset:');
            if (!name) return;
            
            const message = this.outfitManager.savePreset(name);
            toastr.success(message);
            this.renderOutfits();
        });
    }

    // Fix system message sending
    sendSystemMessage(message) {
        setTimeout(() => {
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
        }, 100);
    }

    formatSlotName(name) {
        return name
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^./, str => str.toUpperCase())
            .replace('underwear', 'Underwear');
    }

    toggle() {
        this.isVisible ? this.hide() : this.show();
    }

    show() {
        // Only initialize once
        if (!this.initialized) {
            this.domElement = this.createPanel();
            this.setupTabs();
            this.initialized = true;
        }
        
        this.domElement.style.display = 'block';
        this.renderSlots('clothing');
        this.isVisible = true;

        if (this.domElement) {
            dragElement($(this.domElement));
            
            this.domElement.querySelector('#bot-outfit-refresh')?.addEventListener('click', () => {
                this.outfitManager.initializeOutfit();
                this.renderSlots('clothing');
                this.renderSlots('accessories');
                this.renderOutfits();
                toastr.info("Outfit refreshed");
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
        this.renderSlots();
    }
}
