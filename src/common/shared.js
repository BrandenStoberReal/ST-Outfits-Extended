export function dragElement(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.find('.outfit-header')[0];

    if (header) {header.onmousedown = dragMouseDown;}

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element[0].style.top = (element[0].offsetTop - pos2) + 'px';
        element[0].style.left = (element[0].offsetLeft - pos1) + 'px';
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

export function resizeElement(element, panelId, options = {}) {
    // Default options
    const opts = {
        resizable: true,
        minWidth: 250,
        minHeight: 200,
        maxWidth: 600,
        maxHeight: 800,
        ...options
    };

    if (!opts.resizable) {return;}

    // Try to load saved state, and apply defaults if nothing is saved
    const savedState = loadPanelState(panelId);
    
    // Set default dimensions and position if no saved state exists
    if (!savedState) {
        element[0].style.width = '300px';
        element[0].style.height = 'auto'; // Let it adjust to content initially
        
        // Set default position based on panel ID
        if (panelId.includes('bot')) {
            element[0].style.top = '100px';
            element[0].style.left = 'auto';
            element[0].style.right = '20px';
        } else {
            element[0].style.top = '100px';
            element[0].style.left = 'auto';
            element[0].style.right = '350px'; // Position user panel to the left of bot panel
        }
    } else {
        // Apply saved dimensions if they exist
        if (savedState.width) {
            element[0].style.width = savedState.width + 'px';
        } else {
            element[0].style.width = '300px';
        }
        
        if (savedState.height) {
            element[0].style.height = savedState.height + 'px';
        } else {
            element[0].style.height = 'auto';
        }
        
        // Apply saved position if it exists, otherwise use defaults
        if (savedState.top !== undefined && savedState.left !== undefined) {
            element[0].style.top = savedState.top + 'px';
            element[0].style.left = savedState.left + 'px';
        } else {
            // Set default position based on panel ID
            if (panelId.includes('bot')) {
                element[0].style.top = '100px';
                element[0].style.left = 'auto';
                element[0].style.right = '20px';
            } else {
                element[0].style.top = '100px';
                element[0].style.left = 'auto';
                element[0].style.right = '350px'; // Position user panel to the left of bot panel
            }
        }
    }

    // Add resize handle to the bottom-right corner
    const resizeHandle = document.createElement('div');

    resizeHandle.className = 'resize-handle';
    resizeHandle.innerHTML = '...';
    element[0].appendChild(resizeHandle);

    let startX, startY, startWidth, startHeight;

    function resizeMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(document.defaultView.getComputedStyle(element[0]).width, 10) || 300;
        startHeight = parseInt(document.defaultView.getComputedStyle(element[0]).height, 10) || 200;
        
        document.onmousemove = doResize;
        document.onmouseup = stopResize;
    }

    function doResize(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const width = startWidth + (e.clientX - startX);
        const height = startHeight + (e.clientY - startY);

        element[0].style.width = Math.min(opts.maxWidth, Math.max(opts.minWidth, width)) + 'px';
        element[0].style.height = Math.min(opts.maxHeight, Math.max(opts.minHeight, height)) + 'px';
    }

    function stopResize() {
        // Save dimensions when resizing stops
        const currentWidth = parseInt(document.defaultView.getComputedStyle(element[0]).width, 10);
        const currentHeight = parseInt(document.defaultView.getComputedStyle(element[0]).height, 10);
        const currentTop = parseInt(element[0].style.top) || null;
        const currentLeft = parseInt(element[0].style.left) || null;
        
        savePanelState(panelId, currentWidth, currentHeight, currentTop, currentLeft);
        
        document.onmouseup = null;
        document.onmousemove = null;
    }

    resizeHandle.addEventListener('mousedown', resizeMouseDown);
}

export function savePanelState(panelId, width, height, top, left) {
    if (!window.extension_settings || !window.extension_settings.outfit_tracker) {
        // Initialize settings if they don't exist
        if (!window.extension_settings) {
            window.extension_settings = {};
        }
        window.extension_settings.outfit_tracker = {
            botPanelState: {},
            userPanelState: {}
        };
    }
    
    const state = { width, height, top, left };
    
    // Determine which panel we're saving for
    if (panelId.includes('bot')) {
        window.extension_settings.outfit_tracker.botPanelState = state;
    } else {
        window.extension_settings.outfit_tracker.userPanelState = state;
    }
}

export function loadPanelState(panelId) {
    if (!window.extension_settings || !window.extension_settings.outfit_tracker) {
        return null;
    }
    
    // Determine which panel we're loading for
    if (panelId.includes('bot')) {
        return window.extension_settings.outfit_tracker.botPanelState;
    } 
    return window.extension_settings.outfit_tracker.userPanelState;
    
}

// Enhanced dragElement function to save position when dragging stops
export function dragElementWithSave(element, panelId) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.find('.outfit-header')[0];

    if (header) {header.onmousedown = dragMouseDown;}

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element[0].style.top = (element[0].offsetTop - pos2) + 'px';
        element[0].style.left = (element[0].offsetLeft - pos1) + 'px';
    }

    function closeDragElement() {
        // Save the new position after dragging stops
        const currentTop = element[0].style.top ? parseInt(element[0].style.top) : null;
        const currentLeft = element[0].style.left ? parseInt(element[0].style.left) : null;
        
        // We need to get current dimensions as well to save the complete state
        const currentWidth = parseInt(document.defaultView.getComputedStyle(element[0]).width, 10) || null;
        const currentHeight = parseInt(document.defaultView.getComputedStyle(element[0]).height, 10) || null;
        
        if (currentTop !== null && currentLeft !== null) {
            savePanelState(panelId, currentWidth, currentHeight, currentTop, currentLeft);
        }
        
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
