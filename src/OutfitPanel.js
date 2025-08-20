import { getContext } from "../../../../extensions.js";

export class OutfitPanel {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isVisible = false;
        this.domElement = null;
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'outfit-panel';
        panel.className = 'outfit-panel';

        panel.innerHTML = `
            <div class="outfit-header">
                <h3>${this.outfitManager.character}'s Outfit</h3>
                <div class="outfit-actions">
                    <span class="outfit-action" id="outfit-refresh">↻</span>
                    <span class="outfit-action" id="outfit-close">×</span>
                </div>
            </div>
            <div class="outfit-slots"></div>
        `;

        document.body.appendChild(panel);
        return panel;
    }

    renderSlots() {
        if (!this.domElement) return;

        const slotsContainer = this.domElement.querySelector('.outfit-slots');
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
                if (message) {
                    this.sendSystemMessage(message);
                    this.renderSlots();
                }
            });

            slotsContainer.appendChild(slotElement);
        });
    }

    // NEW: Send system messages using the /sys command
    sendSystemMessage(message) {
        try {
            const context = getContext();
            context.sendSystemMessage(message);
            console.log("[OutfitPanel] Sent system message:", message);
        } catch (error) {
            console.error("[OutfitPanel] Failed to send system message", error);
            // Fallback to creating message manually
            const chatInput = document.getElementById('send_textarea');
            if (chatInput) {
                chatInput.value = `/sys ${message}`;
                const sendButton = document.querySelector('#send_but');
                if (sendButton) sendButton.click();
            }
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
        if (!this.domElement) {
            this.domElement = this.createPanel();
            dragElement($(this.domElement));
        }

        this.domElement.style.display = 'block';
        this.renderSlots();
        this.isVisible = true;

        // Add event listeners
        this.domElement.querySelector('#outfit-refresh').addEventListener('click', () => {
            this.outfitManager.loadOutfit();
            this.renderSlots();
        });

        this.domElement.querySelector('#outfit-close').addEventListener('click', () => this.hide());
    }

    hide() {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
    }

    // NEW: Update character name in panel
    updateCharacter(name) {
        this.outfitManager.setCharacter(name);
        if (this.domElement) {
            const header = this.domElement.querySelector('.outfit-header h3');
            if (header) header.textContent = `${name}'s Outfit`;
        }
        this.renderSlots();
    }

    render() {
        if (this.isVisible) {
            this.renderSlots();
        }
    }
}

// Dragging functionality (simplified)
function dragElement(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.find('.outfit-header')[0];

    if (header) {
        header.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element[0].style.top = (element[0].offsetTop - pos2) + "px";
        element[0].style.left = (element[0].offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
