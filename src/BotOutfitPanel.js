import { extension_settings } from "../../../../extensions.js";
import { dragElement } from './shared.js';

export class BotOutfitPanel {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isVisible = false;
        this.domElement = null;
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
                <div class="slot-value">${slot.value}</div>
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

    sendSystemMessage(message) {
        try {
            const chatInput = document.getElementById('send_textarea');
            if (!chatInput) return;
            chatInput.value = `/sys compact=true ${message}`;
            
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                bubbles: true
            });
            chatInput.dispatchEvent(event);
        } catch (error) {
            console.error("Failed to send system message:", error);
        }
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
            
            this.domElement.querySelector('#bot-outfit-refresh')?.addEventListener('click', () => {
                this.outfitManager.loadOutfit();
                this.renderSlots();
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
