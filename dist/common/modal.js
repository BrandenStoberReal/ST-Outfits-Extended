export function createModal(promptText, defaultValue = '') {
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
        const input = modal.querySelector('#modal-input');
        const closeModal = (value) => {
            document.body.removeChild(modalOverlay);
            resolve(value);
        };
        okButton === null || okButton === void 0 ? void 0 : okButton.addEventListener('click', () => closeModal(input.value));
        cancelButton === null || cancelButton === void 0 ? void 0 : cancelButton.addEventListener('click', () => closeModal(null));
    });
}
