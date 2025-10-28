var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { presetManager } from "../managers/PresetManager.js";
export class PresetItem {
    constructor(presetName, outfitData, instanceId, type, manager) {
        this.presetName = presetName;
        this.outfitData = outfitData;
        this.instanceId = instanceId;
        this.type = type;
        if (type === 'bot') {
            this.botOutfitManager = manager;
        }
        else {
            this.userOutfitManager = manager;
        }
    }
    getManager() {
        return this.type === 'bot' ? this.botOutfitManager : this.userOutfitManager;
    }
    render() {
        const presetElement = document.createElement('div');
        presetElement.className = 'outfit-preset';
        const isDefault = this.getManager().getDefaultPresetName(this.instanceId) === this.presetName;
        presetElement.innerHTML = `
            <div class="preset-preview"></div>
            <div class="preset-name">${isDefault ? '👑 ' : ''}${this.presetName}</div>
            <div class="preset-actions">
                <button class="load-preset">Wear</button>
                <button class="set-default-preset" ${isDefault ? 'style="display:none;"' : ''}>👑</button>
                <button class="rename-preset">Rename</button>
                <button class="delete-preset">×</button>
            </div>
        `;
        this.renderPreview(presetElement.querySelector('.preset-preview'));
        presetElement.querySelector('.load-preset').addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            const message = yield this.getManager().loadPreset(this.presetName, this.instanceId);
            if (message) {
                toastr.info(message);
            }
        }));
        presetElement.querySelector('.set-default-preset').addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            const message = yield this.getManager().setPresetAsDefault(this.presetName, this.instanceId);
            if (message) {
                toastr.info(message);
            }
        }));
        presetElement.querySelector('.rename-preset').addEventListener('click', () => {
            const newName = prompt('Enter new name for the preset:', this.presetName);
            if (newName && newName.trim() !== '') {
                presetManager.savePreset(this.instanceId, newName.trim(), this.outfitData, this.type);
                presetManager.deletePreset(this.instanceId, this.presetName, this.type);
                toastr.info(`Preset "${this.presetName}" renamed to "${newName.trim()}"`);
            }
        });
        presetElement.querySelector('.delete-preset').addEventListener('click', () => {
            if (confirm(`Delete "${this.presetName}" outfit?`)) {
                const message = this.getManager().deletePreset(this.presetName, this.instanceId);
                if (message) {
                    toastr.info(message);
                }
            }
        });
        return presetElement;
    }
    renderPreview(container) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'outfit-preview-grid';
        for (const slot in this.outfitData) {
            if (this.outfitData.hasOwnProperty(slot)) {
                const item = this.outfitData[slot];
                if (item && item !== 'None') {
                    const slotPreview = document.createElement('div');
                    slotPreview.className = 'outfit-preview-item';
                    slotPreview.textContent = item;
                    previewContainer.appendChild(slotPreview);
                }
            }
        }
        container.appendChild(previewContainer);
    }
}
