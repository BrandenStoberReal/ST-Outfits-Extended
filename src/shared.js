export function dragElement(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.find('.outfit-header')[0];

    if (header) header.onmousedown = dragMouseDown;

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
        element[0].style.top = (element[0].offsetTop - pos2) + "px";
        element[0].style.left = (element[0].offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

export function resizeElement(element, options = {}) {
    // Default options
    const opts = {
        resizable: true,
        minWidth: 200,
        minHeight: 150,
        maxWidth: 800,
        maxHeight: 600,
        ...options
    };

    if (!opts.resizable) return;

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
        startWidth = parseInt(document.defaultView.getComputedStyle(element[0]).width, 10);
        startHeight = parseInt(document.defaultView.getComputedStyle(element[0]).height, 10);
        
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
        document.onmousemove = null;
        document.onmouseup = null;
    }

    resizeHandle.addEventListener('mousedown', resizeMouseDown);
}
