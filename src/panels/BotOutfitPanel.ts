import {PresetItem} from './PresetItem';
import {NewBotOutfitManager} from '../managers/NewBotOutfitManager';
import {dragElementWithSave, resizeElement} from '../common/shared';
import {formatSlotName as utilsFormatSlotName} from '../utils/utilities';
import {areSystemMessagesEnabled} from '../utils/SettingsUtil';
import {outfitStore} from '../stores/Store';

declare const window: any;
declare const toastr: any;
declare const $: any;

export class BotOutfitPanel {
    botOutfitManager: NewBotOutfitManager;
    clothingSlots: string[];
    accessorySlots: string[];
    isVisible: boolean;
    domElement: HTMLElement | null;
    currentTab: string;

    constructor(botOutfitManager: NewBotOutfitManager, clothingSlots: string[], accessorySlots: string[]) {
        this.botOutfitManager = botOutfitManager;
        this.clothingSlots = clothingSlots;
        this.accessorySlots = accessorySlots;
        this.isVisible = false;
        this.domElement = null;
        this.currentTab = 'clothing';
    }

    createPanel(): HTMLElement {
        if (this.domElement) {
            return this.domElement;
        }

        const panel = document.createElement('div');
        panel.id = 'bot-outfit-panel';
        panel.className = 'outfit-panel';

        const characterName = this.botOutfitManager.character || 'Unknown';

        panel.innerHTML = `
            <div class="outfit-header">
                <h3>${characterName}'s Outfit</h3>
                <div class="outfit-actions">
                    <span class="outfit-action" id="bot-outfit-refresh">↻</span>
                    <span class="outfit-action" id="bot-outfit-close">×</span>
                </div>
            </div>
            <div class="outfit-tabs">
                <button class="outfit-tab active" data-tab="clothing">Clothing</button>
                <button class="outfit-tab" data-tab="accessories">Accessories</button>
                <button class="outfit-tab" data-tab="outfits">Outfits</button>
            </div>
            <div class="outfit-content" id="bot-outfit-tab-content"></div>
        `;

        document.body.appendChild(panel);
        this.domElement = panel;

        this.addEventListeners();
        this.renderContent();

        return panel;
    }

    addEventListeners(): void {
        if (!this.domElement) return;

        const tabs = this.domElement.querySelectorAll('.outfit-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                const tabName = (event.target as HTMLElement).dataset.tab;
                if (tabName) {
                    this.currentTab = tabName;
                    tabs.forEach(t => t.classList.remove('active'));
                    (event.target as HTMLElement).classList.add('active');
                    this.renderContent();
                }
            });
        });

        this.domElement.querySelector('#bot-outfit-refresh')?.addEventListener('click', () => {
            this.botOutfitManager.loadOutfit();
            this.renderContent();
        });

        this.domElement.querySelector('#bot-outfit-close')?.addEventListener('click', () => this.hide());

        const contentArea = this.domElement.querySelector('.outfit-content');
        if (contentArea) {
            contentArea.addEventListener('click', async (event) => {
                const target = event.target as HTMLElement;
                if (target.classList.contains('slot-change')) {
                    const slotElement = target.closest('.outfit-slot') as HTMLElement;
                    if (slotElement) {
                        const slotName = slotElement.dataset.slot;
                        if (slotName) {
                            const result = await this.botOutfitManager.changeOutfitItem(slotName);
                            if (result) {
                                this.updateSlot(slotName, result.newValue);
                                if (result.message && areSystemMessagesEnabled()) {
                                    this.sendSystemMessage(result.message);
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    renderContent(): void {
        if (!this.domElement) return;

        const contentArea = this.domElement.querySelector('.outfit-content');
        if (!contentArea) return;

        contentArea.innerHTML = '';

        switch (this.currentTab) {
            case 'clothing':
                this.renderSlots(this.clothingSlots, contentArea as HTMLElement);
                break;
            case 'accessories':
                this.renderSlots(this.accessorySlots, contentArea as HTMLElement);
                break;
            case 'outfits':
                this.renderPresets(contentArea as HTMLElement);
                break;
        }
    }

    renderSlots(slots: string[], container: HTMLElement): void {
        const outfitData = this.botOutfitManager.getOutfitData(slots);

        outfitData.forEach((slot: any) => {
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

            container.appendChild(slotElement);
        });
    }

    updateSlot(slotName: string, newValue: string): void {
        if (!this.domElement) return;

        const slotElement = this.domElement.querySelector(`.outfit-slot[data-slot="${slotName}"]`);
        if (slotElement) {
            const valueElement = slotElement.querySelector('.slot-value');
            if (valueElement) {
                valueElement.textContent = newValue;
                (valueElement as HTMLElement).title = newValue;
            }
        }
    }

    renderPresets(container: HTMLElement): void {
        const instanceId = this.botOutfitManager.getOutfitInstanceId() || 'default';
        const presets = this.botOutfitManager.getAllPresets(instanceId);

        if (Object.keys(presets).length === 0) {
            container.innerHTML = '<div>No saved outfits for this character instance.</div>';
        } else {
            for (const presetName in presets) {
                if (presets.hasOwnProperty(presetName)) {
                    const presetItem = new PresetItem(presetName, presets[presetName], instanceId, 'bot', this.botOutfitManager);
                    container.appendChild(presetItem.render());
                }
            }
        }

        const saveButton = document.createElement('button');
        saveButton.className = 'save-outfit-btn';
        saveButton.textContent = 'Save Current Outfit';
        saveButton.style.marginTop = '5px';
        saveButton.addEventListener('click', async () => {
            const presetName = prompt('Name this outfit:');
            if (presetName) {
                const message = await this.botOutfitManager.savePreset(presetName.trim());
                if (message && areSystemMessagesEnabled()) {
                    this.sendSystemMessage(message);
                }
                this.renderContent();
            }
        });

        container.appendChild(saveButton);
    }

    sendSystemMessage(message: string): void {
        if (areSystemMessagesEnabled()) {
            toastr.info(message, 'Outfit System', {timeOut: 4000, extendedTimeOut: 8000});
        }
    }

    formatSlotName(name: string): string {
        return utilsFormatSlotName(name);
    }

    toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show(): void {
        if (!this.domElement) {
            this.createPanel();
        }
        this.domElement!.style.display = 'flex';
        this.isVisible = true;
        dragElementWithSave(this.domElement!, 'bot-outfit-panel');
        resizeElement($(this.domElement!), 'bot-outfit-panel');
    }

    hide(): void {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
    }

    applyPanelColors(): void {
        if (this.domElement) {
            const storeState = outfitStore.getState();
            const colors = storeState.panelSettings?.botPanelColors;

            if (colors) {
                this.domElement.style.background = colors.primary;
                this.domElement.style.border = `1px solid ${colors.border}`;
                this.domElement.style.boxShadow = `0 8px 32px ${colors.shadow}`;
            }
        }
    }

    updateCharacter(name: string): void {
        this.botOutfitManager.setCharacter(name);
        if (!this.domElement) {
            this.createPanel();
        }
        const header = this.domElement!.querySelector('.outfit-header h3');
        if (header) {
            header.textContent = `${name}'s Outfit`;
        }
        this.renderContent();
    }
}