export function createModal(promptText: string, defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';

        modal.innerHTML = `
            <div class="modal-header">${promptText}</div>
            <div class="modal-body">
                <input type="text" id="modal-input" value="${defaultValue}">
            </div>
            <div class="modal-footer">
                <button id="modal-ok">OK</button>
                <button id="modal-cancel">Cancel</button>
            </div>
        `;

        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        const okButton = modal.querySelector('#modal-ok');
        const cancelButton = modal.querySelector('#modal-cancel');
        const input = modal.querySelector('#modal-input') as HTMLInputElement;

        const closeModal = (value: string | null) => {
            document.body.removeChild(modalOverlay);
            resolve(value);
        };

        okButton?.addEventListener('click', () => closeModal(input.value));
        cancelButton?.addEventListener('click', () => closeModal(null));
    });
}
