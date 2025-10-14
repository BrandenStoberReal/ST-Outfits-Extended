// Function to make an element draggable with position saving
export function dragElementWithSave(element, storageKey) {
    const $element = $(element);
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    // Try to restore previous position
    const savedPosition = localStorage.getItem(`outfitPanel_${storageKey}_position`);

    if (savedPosition) {
        const position = JSON.parse(savedPosition);

        $element.css({
            top: position.top + 'px',
            left: position.left + 'px'
        });
    }

    // Set the element's style
    $element.css({
        position: 'absolute',
        cursor: 'move'
    });

    // Get the element that will be used for moving (header)
    const $header = $element.find('.panel-header, .dialogHeader, .title, h2, h3').first();

    if ($header.length) {
        // When the header is clicked, assign the event handlers
        $header.on('mousedown', dragMouseDown);
    } else {
        // If no header found, allow dragging from the entire element
        $element.on('mousedown', dragMouseDown);
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // Get the mouse cursor position at startup
        pos3 = e.clientX;
        pos4 = e.clientY;
        $(document).on('mousemove', elementDrag);
        $(document).on('mouseup', closeDragElement);
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // Calculate the new cursor position
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Set the element's new position
        const newTop = $element[0].offsetTop - pos2;
        const newLeft = $element[0].offsetLeft - pos1;
        
        $element.css({
            top: newTop + 'px',
            left: newLeft + 'px'
        });
    }

    function closeDragElement() {
        // Stop moving when mouse button is released
        $(document).off('mousemove', elementDrag);
        $(document).off('mouseup', closeDragElement);
        
        // Save the position to localStorage
        const position = {
            top: parseInt($element.css('top')) || 0,
            left: parseInt($element.css('left')) || 0
        };

        localStorage.setItem(`outfitPanel_${storageKey}_position`, JSON.stringify(position));
    }
}

// Function to make an element resizable with size saving
export function resizeElement(element, storageKey) {
    const $element = $(element);
    let originalWidth, originalHeight, originalMouseX, originalMouseY;
    
    // Try to restore previous size
    const savedSize = localStorage.getItem(`outfitPanel_${storageKey}_size`);

    if (savedSize) {
        const size = JSON.parse(savedSize);

        $element.css({
            width: size.width + 'px',
            height: size.height + 'px'
        });
    }

    // Create a resize handle
    let $resizeHandle = $element.find('.resize-handle');

    if (!$resizeHandle.length) {
        $resizeHandle = $('<div class="resize-handle" style="position: absolute; right: 0; bottom: 0; width: 10px; height: 10px; cursor: se-resize; background: rgba(0,0,0,0.2);"></div>');
        $element.append($resizeHandle);
    }

    $resizeHandle.on('mousedown', function(e) {
        originalWidth = parseFloat($element.outerWidth());
        originalHeight = parseFloat($element.outerHeight());
        originalMouseX = e.pageX;
        originalMouseY = e.pageY;
        
        $(document).on('mousemove.resizer', resizeElementHandler);
        $(document).on('mouseup.resizer', stopResize);
        
        e.stopPropagation();
        e.preventDefault();
    });

    function resizeElementHandler(e) {
        const width = originalWidth + (e.pageX - originalMouseX);
        const height = originalHeight + (e.pageY - originalMouseY);
        
        // Set minimum and maximum sizes to prevent the element from becoming too small or too large
        const newWidth = Math.max(200, Math.min(width, window.innerWidth - 50));
        const newHeight = Math.max(150, Math.min(height, window.innerHeight - 50));
        
        $element.css({
            width: newWidth + 'px',
            height: newHeight + 'px'
        });
    }

    function stopResize() {
        $(document).off('mousemove.resizer');
        $(document).off('mouseup.resizer');
        
        // Save the size to localStorage
        const size = {
            width: parseFloat($element.outerWidth()),
            height: parseFloat($element.outerHeight())
        };

        localStorage.setItem(`outfitPanel_${storageKey}_size`, JSON.stringify(size));
    }
}

export const extension_api = {
    botOutfitPanel: null,
    userOutfitPanel: null,
    autoOutfitSystem: null,
    wipeAllOutfits: null,
    replaceOutfitMacrosInText: null,
    getOutfitExtensionStatus: null,
};