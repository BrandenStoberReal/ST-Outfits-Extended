import {OutfitData} from "../stores/Store";
import {presetManager} from "../managers/PresetManager";

declare const toastr: any;

export class PresetItem {
    presetName: string;
    outfitData: OutfitData;
    instanceId: string;
    type: 'bot' | 'user';
    botOutfitManager: any;
    userOutfitManager: any;

    constructor(presetName: string, outfitData: OutfitData, instanceId: string, type: 'bot' | 'user', manager: any) {
        this.presetName = presetName;
        this.outfitData = outfitData;
        this.instanceId = instanceId;
        this.type = type;
        if (type === 'bot') {
            this.botOutfitManager = manager;
        } else {
            this.userOutfitManager = manager;
        }
    }

    getManager(): any {
        return this.type === 'bot' ? this.botOutfitManager : this.userOutfitManager;
    }

    render(): HTMLElement {
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

        this.renderPreview(presetElement.querySelector('.preset-preview') as HTMLElement);

        presetElement.querySelector('.load-preset')!.addEventListener('click', async () => {
            const message = await this.getManager().loadPreset(this.presetName, this.instanceId);
            if (message) {
                toastr.info(message);
            }
        });

        presetElement.querySelector('.set-default-preset')!.addEventListener('click', async () => {
            const message = await this.getManager().setPresetAsDefault(this.presetName, this.instanceId);
            if (message) {
                toastr.info(message);
            }
        });

        presetElement.querySelector('.rename-preset')!.addEventListener('click', async () => {
            const newName = prompt('Enter new name for the preset:', this.presetName);
            if (newName && newName.trim() !== '') {
                // First save the preset with the new name
                await presetManager.savePreset(this.instanceId, newName.trim(), this.outfitData, this.type);

                // Then delete the old preset to prevent race conditions
                await presetManager.deletePreset(this.instanceId, this.presetName, this.type);

                // Update this preset item's name for consistency
                this.presetName = newName.trim();
                
                toastr.info(`Preset "${this.presetName}" renamed to "${newName.trim()}"`);
            }
        });

        presetElement.querySelector('.delete-preset')!.addEventListener('click', () => {
            if (confirm(`Delete "${this.presetName}" outfit?`)) {
                const message = this.getManager().deletePreset(this.presetName, this.instanceId);
                if (message) {
                    toastr.info(message);
                }
            }
        });

        return presetElement;
    }

    renderPreview(container: HTMLElement): void {
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
