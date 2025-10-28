// Function to make an element draggable with position saving
export function dragElementWithSave(element: HTMLElement, storageKey: string): void {
    if (!element) {
        return;
    }
    const $element = $(element);
    if (!$element || $element.length === 0) {
        return;
    }
    let pos3 = 0, pos4 = 0;
    let initialX = 0, initialY = 0;  // Track initial position when drag starts
    let currentX = 0, currentY = 0;  // Track current movement
    let animationFrameId: number | null = null;
    let isDragging = false;  // Track if currently dragging

    // Define functions before using them
    function elementDrag(e: MouseEvent) {
        e = e || window.event;
        e.preventDefault();

        if (!isDragging) return;

        // Calculate the mouse movement since the last drag event
        const deltaX = e.clientX - pos3;  // How much the mouse has moved since last event
        const deltaY = e.clientY - pos4;  // How much the mouse has moved since last event

        // Update positions
        pos3 = e.clientX;
        pos4 = e.clientY;

        // Update the transform values based on the mouse movement
        currentX += deltaX;
        currentY += deltaY;

        // Cancel any pending animation frame to avoid multiple updates
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        // Use requestAnimationFrame for better performance
        animationFrameId = requestAnimationFrame(() => {
            // Use CSS transform to position the element at the correct screen coordinates
            // Combine initial position with current movement to get absolute position
            $element.css({
                transform: `translate(${initialX + currentX}px, ${initialY + currentY}px)`
            });
        });
    }

    function closeDragElement() {
        // Stop moving when mouse button is released
        $(document).off('mousemove', elementDrag as any);
        $(document).off('mouseup', closeDragElement);

        isDragging = false;

        // Cancel any pending animation frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        // Calculate final position based on initial position + movement
        const finalTop = initialY + currentY;
        const finalLeft = initialX + currentX;

        // Apply transitions to both top/left and transform
        $element.css({
            'transition': 'top 0.15s ease, left 0.15s ease, transform 0.15s ease'
        });

        // Animate to final position: transform settles to 0 while element moves to final position
        $element.css({
            'top': finalTop + 'px',
            'left': finalLeft + 'px',
            'transform': 'translate(0px, 0px)'  // Reset the transform
        });

        // Update initialX and initialY to the final position for next drag
        initialX = finalLeft;
        initialY = finalTop;
        currentX = 0;
        currentY = 0;

        // Save the position to localStorage only when drag ends
        const position = {
            top: finalTop || 0,
            left: finalLeft || 0
        };

        localStorage.setItem(`outfitPanel_${storageKey}_position`, JSON.stringify(position));

        // Remove transitions after animation completes to avoid affecting future drags
        setTimeout(() => {
            $element.css({
                'transition': 'none'
            });
        }, 150); // Match the transition duration
    }

    function dragMouseDown(e: MouseEvent) {
        e = e || window.event;
        e.preventDefault();

        // Get the mouse cursor position at startup
        pos3 = e.clientX;
        pos4 = e.clientY;

        // Get the current position for reference
        // We need to account for any existing transform when starting a new drag
        const elementTop = parseInt($element.css('top')) || 0;
        const elementLeft = parseInt($element.css('left')) || 0;

        // Store initial position
        initialX = elementLeft;
        initialY = elementTop;

        // Reset current transform values to 0
        currentX = 0;
        currentY = 0;

        // Mark as dragging
        isDragging = true;

        $(document).on('mousemove', elementDrag as any);
        $(document).on('mouseup', closeDragElement);
    }

    // Try to restore previous position
    const savedPosition = localStorage.getItem(`outfitPanel_${storageKey}_position`);

    if (savedPosition) {
        const position = JSON.parse(savedPosition);

        $element.css({
            top: position.top + 'px',
            left: position.left + 'px'
        });

        // Set the initial position values to the saved position
        initialX = position.left;
        initialY = position.top;
    } else {
        // Default position if no saved position
        $element.css({
            top: '10px',
            left: '10px'
        });

        // Set the initial position values to default
        initialX = 10;
        initialY = 10;
    }

    // Set the element's style
    $element.css({
        position: 'fixed',
        cursor: 'move'
    });

    // Get the element that will be used for moving (header)
    const $header = $element.find('.panel-header, .dialogHeader, .title, .outfit-header, .outfit-debug-header, h2, h3').first();

    if ($header.length) {
        // When the header is clicked, assign the event handlers
        $header.on('mousedown', dragMouseDown as any);
    } else {
        // If no header found, allow dragging from the entire element
        $element.on('mousedown', dragMouseDown as any);
    }
}

// Function to make an element resizable with size saving
export function resizeElement(element: HTMLElement, storageKey: string, options?: {
    minWidth?: number,
    maxWidth?: number,
    minHeight?: number,
    maxHeight?: number
}): void {
    if (!element) {
        return;
    }

    const $element = $(element);
    if (!$element || $element.length === 0) {
        return;
    }

    let originalWidth: number, originalHeight: number, originalMouseX: number, originalMouseY: number;
    let isResizing = false;  // Track if currently resizing
    let animationFrameId: number | null = null;  // For optimizing updates

    // Define functions before using them
    function resizeElementHandler(e: MouseEvent) {
        e.preventDefault();

        if (!isResizing) return;

        // Calculate new dimensions
        const width = originalWidth + (e.pageX - originalMouseX);
        const height = originalHeight + (e.pageY - originalMouseY);

        // Calculate the maximum width and height based on current position to stay within viewport
        const elementRect = $element[0].getBoundingClientRect();
        const maxWidth = options?.maxWidth ?? (window.innerWidth - elementRect.left - 10); // 10px margin from right edge
        const maxHeight = options?.maxHeight ?? (window.innerHeight - elementRect.top - 10); // 10px margin from bottom edge

        // Set minimum and maximum sizes to prevent the element from becoming too small or too large
        const newWidth = Math.max(options?.minWidth ?? 200, Math.min(width, maxWidth));
        const newHeight = Math.max(options?.minHeight ?? 150, Math.min(height, maxHeight));

        // Cancel any pending animation frame to avoid multiple updates
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        // Use requestAnimationFrame for better performance
        animationFrameId = requestAnimationFrame(() => {
            $element.css({
                width: newWidth + 'px',
                height: newHeight + 'px'
            });
        });
    }

    function stopResize() {
        isResizing = false;
        
        $(document).off('mousemove.resizer');
        $(document).off('mouseup.resizer');

        // Cancel any pending animation frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        // Save the size to localStorage only when resize ends
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

    $resizeHandle.on('mousedown', function (e: JQuery.MouseDownEvent) {
        const width = $element.outerWidth();
        const height = $element.outerHeight();
        if (width === undefined || height === undefined) {
            return; // Cannot proceed if width or height is undefined
        }
        originalWidth = parseFloat(width.toString());
        originalHeight = parseFloat(height.toString());
        originalMouseX = e.pageX;
        originalMouseY = e.pageY;

        isResizing = true;

        $(document).on('mousemove.resizer', resizeElementHandler as any);
        $(document).on('mouseup.resizer', stopResize);

        e.stopPropagation();
        e.preventDefault();
    });
}

export const extension_api: any = {
    botOutfitPanel: null,
    userOutfitPanel: null,
    autoOutfitSystem: null,
    wipeAllOutfits: null,
    replaceOutfitMacrosInText: null,
    getOutfitExtensionStatus: null,
};