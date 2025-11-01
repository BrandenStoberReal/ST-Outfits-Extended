var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PresetItem } from './PresetItem.js';
import { dragElementWithSave, resizeElement } from '../common/shared.js';
import { formatSlotName as utilsFormatSlotName } from '../utils/utilities.js';
import { areSystemMessagesEnabled } from '../utils/SettingsUtil.js';
import { outfitStore } from '../stores/Store.js';
export class BotOutfitPanel {
    constructor(botOutfitManager, clothingSlots, accessorySlots) {
        this.botOutfitManager = botOutfitManager;
        this.clothingSlots = clothingSlots;
        this.accessorySlots = accessorySlots;
        this.isVisible = false;
        this.domElement = null;
        this.currentTab = 'clothing';
    }
    createPanel() {
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
    addEventListeners() {
        var _a, _b;
        if (!this.domElement)
            return;
        const tabs = this.domElement.querySelectorAll('.outfit-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                const tabName = event.target.dataset.tab;
                if (tabName) {
                    this.currentTab = tabName;
                    tabs.forEach(t => t.classList.remove('active'));
                    event.target.classList.add('active');
                    this.renderContent();
                }
            });
        });
        (_a = this.domElement.querySelector('#bot-outfit-refresh')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
            this.botOutfitManager.loadOutfit();
            this.renderContent();
        });
        (_b = this.domElement.querySelector('#bot-outfit-close')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => this.hide());
        const contentArea = this.domElement.querySelector('.outfit-content');
        if (contentArea) {
            contentArea.addEventListener('click', (event) => __awaiter(this, void 0, void 0, function* () {
                const target = event.target;
                if (target.classList.contains('slot-change')) {
                    const slotElement = target.closest('.outfit-slot');
                    if (slotElement) {
                        const slotName = slotElement.dataset.slot;
                        if (slotName) {
                            const result = yield this.botOutfitManager.changeOutfitItem(slotName);
                            if (result) {
                                this.updateSlot(slotName, result.newValue);
                                if (result.message && areSystemMessagesEnabled()) {
                                    this.sendSystemMessage(result.message);
                                }
                            }
                        }
                    }
                }
            }));
        }
    }
    renderContent() {
        if (!this.domElement)
            return;
        const contentArea = this.domElement.querySelector('.outfit-content');
        if (!contentArea)
            return;
        contentArea.innerHTML = '';
        switch (this.currentTab) {
            case 'clothing':
                this.renderSlots(this.clothingSlots, contentArea);
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
        const outfitData = this.botOutfitManager.getOutfitData(slots);
        outfitData.forEach((slot) => {
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
    updateSlot(slotName, newValue) {
        if (!this.domElement)
            return;
        const slotElement = this.domElement.querySelector(`.outfit-slot[data-slot="${slotName}"]`);
        if (slotElement) {
            const valueElement = slotElement.querySelector('.slot-value');
            if (valueElement) {
                valueElement.textContent = newValue;
                valueElement.title = newValue;
            }
        }
    }
    renderPresets(container) {
        const instanceId = this.botOutfitManager.getOutfitInstanceId() || 'default';
        const presets = this.botOutfitManager.getAllPresets(instanceId);
        if (Object.keys(presets).length === 0) {
            container.innerHTML = '<div>No saved outfits for this character instance.</div>';
        }
        else {
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
        saveButton.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            const presetName = prompt('Name this outfit:');
            if (presetName) {
                const message = yield this.botOutfitManager.savePreset(presetName.trim());
                if (message && areSystemMessagesEnabled()) {
                    this.sendSystemMessage(message);
                }
                this.renderContent();
            }
        }));
        container.appendChild(saveButton);
    }
    sendSystemMessage(message) {
        if (areSystemMessagesEnabled()) {
            toastr.info(message, 'Outfit System', { timeOut: 4000, extendedTimeOut: 8000 });
        }
    }
    formatSlotName(name) {
        return utilsFormatSlotName(name);
    }
    toggle() {
        if (this.isVisible) {
            this.hide();
        }
        else {
            this.show();
        }
    }
    show() {
        if (!this.domElement) {
            this.createPanel();
        }
        this.domElement.style.display = 'flex';
        this.isVisible = true;
        dragElementWithSave(this.domElement, 'bot-outfit-panel');
        resizeElement($(this.domElement), 'bot-outfit-panel');
    }
    hide() {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
    }
    applyPanelColors() {
        var _a;
        if (this.domElement) {
            const storeState = outfitStore.getState();
            const colors = (_a = storeState.panelSettings) === null || _a === void 0 ? void 0 : _a.botPanelColors;
            if (colors) {
                this.domElement.style.background = colors.primary;
                this.domElement.style.border = `1px solid ${colors.border}`;
                this.domElement.style.boxShadow = `0 8px 32px ${colors.shadow}`;
            }
        }
    }
    updateCharacter(name) {
        this.botOutfitManager.setCharacter(name);
        if (!this.domElement) {
            this.createPanel();
        }
        const header = this.domElement.querySelector('.outfit-header h3');
        if (header) {
            header.textContent = `${name}'s Outfit`;
        }
        this.renderContent();
    }
}
