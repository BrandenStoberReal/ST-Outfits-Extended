// Function to make an element draggable with position saving
export function dragElementWithSave(element, storageKey) {
    if (!element) {
        return;
    }
    const $element = $(element);
    if (!$element || $element.length === 0) {
        return;
    }
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let animationFrameId = null;
    // Define functions before using them
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // Calculate the new cursor position
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Update position variables without immediately updating DOM
        const newTop = $element[0].offsetTop - pos2;
        const newLeft = $element[0].offsetLeft - pos1;
        // Use requestAnimationFrame to optimize DOM updates
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(() => {
            // Use transform for better performance instead of changing top/left
            $element.css({
                transform: `translate(${newLeft}px, ${newTop}px)`,
                // Temporarily disable transitions during drag for better performance
                'transition': 'none'
            });
        });
    }
    function closeDragElement() {
        // Stop moving when mouse button is released
        $(document).off('mousemove', elementDrag);
        $(document).off('mouseup', closeDragElement);
        // Clear any pending animation frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // Calculate final position based on current transform
        const matrix = new DOMMatrix(getComputedStyle($element[0]).transform);
        const currentLeft = matrix.m41;
        const currentTop = matrix.m42;
        // Save the final position to localStorage
        const position = {
            top: currentTop,
            left: currentLeft
        };
        localStorage.setItem(`outfitPanel_${storageKey}_position`, JSON.stringify(position));
        // Re-enable transitions after drag ends
        $element.css({
            'transition': ''
        });
    }
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // Get the mouse cursor position at startup
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Capture initial position from transform if it exists
        const matrix = new DOMMatrix(getComputedStyle($element[0]).transform);
        pos3 = e.clientX;
        pos4 = e.clientY;
        $(document).on('mousemove', elementDrag);
        $(document).on('mouseup', closeDragElement);
    }
    // Try to restore previous position
    const savedPosition = localStorage.getItem(`outfitPanel_${storageKey}_position`);
    if (savedPosition) {
        const position = JSON.parse(savedPosition);
        // Apply initial position using transform
        $element.css({
            transform: `translate(${position.left}px, ${position.top}px)`
        });
    }
    // Set the element's style
    $element.css({
        position: 'fixed', // Use fixed positioning for better performance
        cursor: 'move'
    });
    // Get the element that will be used for moving (header)
    const $header = $element.find('.panel-header, .dialogHeader, .title, .outfit-header, .outfit-debug-header, h2, h3').first();
    if ($header.length) {
        // When the header is clicked, assign the event handlers
        $header.on('mousedown', dragMouseDown);
    }
    else {
        // If no header found, allow dragging from the entire element
        $element.on('mousedown', dragMouseDown);
    }
}
// Function to make an element resizable with size saving
export function resizeElement(element, storageKey, options) {
    if (!element) {
        return;
    }
    const $element = $(element);
    if (!$element || $element.length === 0) {
        return;
    }
    let originalWidth, originalHeight, originalMouseX, originalMouseY;
    // Define functions before using them
    function resizeElementHandler(e) {
        var _a, _b, _c, _d;
        const width = originalWidth + (e.pageX - originalMouseX);
        const height = originalHeight + (e.pageY - originalMouseY);
        // Calculate the maximum width and height based on current position to stay within viewport
        const elementRect = $element[0].getBoundingClientRect();
        const maxWidth = (_a = options === null || options === void 0 ? void 0 : options.maxWidth) !== null && _a !== void 0 ? _a : (window.innerWidth - elementRect.left - 10); // 10px margin from right edge
        const maxHeight = (_b = options === null || options === void 0 ? void 0 : options.maxHeight) !== null && _b !== void 0 ? _b : (window.innerHeight - elementRect.top - 10); // 10px margin from bottom edge
        // Set minimum and maximum sizes to prevent the element from becoming too small or too large
        const newWidth = Math.max((_c = options === null || options === void 0 ? void 0 : options.minWidth) !== null && _c !== void 0 ? _c : 200, Math.min(width, maxWidth));
        const newHeight = Math.max((_d = options === null || options === void 0 ? void 0 : options.minHeight) !== null && _d !== void 0 ? _d : 150, Math.min(height, maxHeight));
        $element.css({
            width: newWidth + 'px',
            height: newHeight + 'px'
        });
    }
    function stopResize() {
        $(document).off('mousemove.resizer');
        $(document).off('mouseup.resizer');
        // Save the size to localStorage
        if (typeof $ !== 'undefined' && typeof $.fn.outerWidth === 'function' && typeof $.fn.outerHeight === 'function') {
            const width = $element.outerWidth();
            const height = $element.outerHeight();
            if (width !== undefined && height !== undefined) {
                const size = {
                    width: parseFloat(width.toString()),
                    height: parseFloat(height.toString())
                };
                localStorage.setItem(`outfitPanel_${storageKey}_size`, JSON.stringify(size));
            }
        }
    }
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
    $resizeHandle.on('mousedown', function (e) {
        const width = $element.outerWidth();
        const height = $element.outerHeight();
        if (width === undefined || height === undefined) {
            return; // Cannot proceed if width or height is undefined
        }
        originalWidth = parseFloat(width.toString());
        originalHeight = parseFloat(height.toString());
        originalMouseX = e.pageX;
        originalMouseY = e.pageY;
        $(document).on('mousemove.resizer', resizeElementHandler);
        $(document).on('mouseup.resizer', stopResize);
        e.stopPropagation();
        e.preventDefault();
    });
}
export const extension_api = {
    botOutfitPanel: null,
    userOutfitPanel: null,
    autoOutfitSystem: null,
    wipeAllOutfits: null,
    replaceOutfitMacrosInText: null,
    getOutfitExtensionStatus: null,
};
