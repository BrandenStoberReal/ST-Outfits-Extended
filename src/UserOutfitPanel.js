import { getContext } from "../../../../extensions.js";
import { extension_settings } from "../../../../extensions.js";
import { dragElement } from './shared.js';

export class UserOutfitPanel {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isVisible = false;
        this.domElement = null;
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'user-outfit-panel';
        panel.className = 'outfit-panel';

        if (!this.domElement) {
            panel.innerHTML = `
                <div class="outfit-header">
                    <h3>Your Outfit</h3>
                    <div class="outfit-actions">
                        <span class="outfit-action" id="user-outfit-refresh">↻</span>
                        <span class="outfit-action" id="user-outfit-close">×</span>
                    </div>
                </div>
                <div class="outfit-slots"></div>
            `;

            document.body.appendChild(panel);
        }
        return panel;
    }

    renderSlots() {
        if (!this.domElement) return;
        const slotsContainer = this.domElement.querySelector('.outfit-slots');
        if (!slotsContainer) return;
        
        slotsContainer.innerHTML = '';
        const outfitData = this.outfitManager.getOutfitData();
    
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
                if (message && extension_settings.outfit_tracker?.enableSysMessages) {
                    this.sendSystemMessage(message);
                }
                this.renderSlots();
            });
    
            slotsContainer.appendChild(slotElement);
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
        this.domElement = this.createPanel();
        this.domElement.style.display = 'block';
        this.renderSlots();
        this.isVisible = true;

        if (this.domElement) {
            dragElement($(this.domElement));
            
            // Add initialization when refreshing
            this.domElement.querySelector('#user-outfit-refresh')?.addEventListener('click', () => {
                this.outfitManager.initializeOutfit();
                this.renderSlots();
            });

            this.domElement.querySelector('#user-outfit-close')?.addEventListener('click', () => this.hide());
        }
    }

    hide() {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
    }
}
