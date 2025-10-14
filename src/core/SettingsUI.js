export function createSettingsUI(AutoOutfitSystem, autoOutfitSystem) {
    const MODULE_NAME = 'outfit_tracker';
    const hasAutoSystem = AutoOutfitSystem.name !== 'DummyAutoOutfitSystem';
    const autoSettingsHtml = hasAutoSystem ? `
        <div class="flex-container setting-row">
            <label for="outfit-auto-system">Enable auto outfit updates</label>
            <input type="checkbox" id="outfit-auto-system"
                    ${window.extension_settings[MODULE_NAME].autoOutfitSystem ? 'checked' : ''}>
        </div>
        <div class="flex-container setting-row">
            <label for="outfit-connection-profile">Connection Profile (Optional):</label>
            <select id="outfit-connection-profile" class="option">
                <option value="">Default Connection</option>
                <option value="openrouter" ${window.extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                <option value="ooba" ${window.extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'ooba' ? 'selected' : ''}>Oobabooga</option>
                <option value="openai" ${window.extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'openai' ? 'selected' : ''}>OpenAI</option>
                <option value="claude" ${window.extension_settings[MODULE_NAME].autoOutfitConnectionProfile === 'claude' ? 'selected' : ''}>Claude</option>
            </select>
        </div>
        <div class="flex-container setting-row">
            <label for="outfit-prompt-input">System Prompt:</label>
            <textarea id="outfit-prompt-input" placeholder="Enter system prompt for auto outfit detection">${window.extension_settings[MODULE_NAME].autoOutfitPrompt || ''}</textarea>
        </div>
        <div class="flex-container">
            <button id="outfit-prompt-reset-btn" class="menu_button">Reset to Default Prompt</button>
            <button id="outfit-prompt-view-btn" class="menu_button">View Current Prompt</button>
        </div>
    ` : `
        <div class="flex-container setting-row">
            <label>Auto Outfit System: <span class="error-text">Not Available</span></label>
        </div>
    `;

    const settingsHtml = `
    <div class="outfit-extension-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Outfit Tracker Settings</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <!-- Status Indicators Section -->
                <div class="setting-group">
                    <h4>Extension Status</h4>
                    <div class="status-indicators">
                        <div class="status-row">
                            <span class="status-label">Core Extension:</span>
                            <span id="status-core" class="status-indicator status-loading">Loading...</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Auto Outfit System:</span>
                            <span id="status-auto-outfit" class="status-indicator status-loading">Loading...</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Character Panel:</span>
                            <span id="status-bot-panel" class="status-indicator status-loading">Loading...</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">User Panel:</span>
                            <span id="status-user-panel" class="status-indicator status-loading">Loading...</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Event System:</span>
                            <span id="status-events" class="status-indicator status-loading">Loading...</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Outfit Managers:</span>
                            <span id="status-managers" class="status-indicator status-loading">Loading...</span>
                        </div>
                    </div>
                </div>
                
                <div class="setting-group">
                    <h4>General Settings</h4>
                    
                    <div class="flex-container setting-row">
                        <label for="outfit-sys-toggle">Enable system messages</label>
                        <input type="checkbox" id="outfit-sys-toggle"
                               ${window.extension_settings[MODULE_NAME].enableSysMessages ? 'checked' : ''}>
                    </div>
                    
                    <div class="flex-container setting-row">
                        <label for="outfit-auto-bot">Auto-open character panel</label>
                        <input type="checkbox" id="outfit-auto-bot"
                               ${window.extension_settings[MODULE_NAME].autoOpenBot ? 'checked' : ''}>
                    </div>
                    
                    <div class="flex-container setting-row">
                        <label for="outfit-auto-user">Auto-open user panel</label>
                        <input type="checkbox" id="outfit-auto-user"
                               ${window.extension_settings[MODULE_NAME].autoOpenUser ? 'checked' : ''}>
                    </div>
                    
                    <div class="flex-container setting-row">
                        <label for="quote-color-picker">Quote Highlight Color:</label>
                        <div class="color-input-wrapper">
                            <input type="color" id="quote-color-picker" value="${window.extension_settings[MODULE_NAME].quoteColor || '#FFA500'}">
                            <input type="text" id="quote-color-input" value="${window.extension_settings[MODULE_NAME].quoteColor || '#FFA500'}">
                        </div>
                    </div>
                </div>
                
                <!-- Panel Colors Customization Section -->
                <div class="setting-group">
                    <h4>Panel Colors</h4>
                    
                    <!-- Bot Panel Colors -->
                    <div class="panel-color-section">
                        <h5 class="color-section-title">Character Panel</h5>
                        
                        <div class="color-setting-row">
                            <label for="bot-panel-primary-color" class="color-label">Primary Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="bot-panel-primary-color-picker" value="#6a4fc1">
                                <input type="text" id="bot-panel-primary-color" value="${window.extension_settings[MODULE_NAME]?.botPanelColors?.primary || 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)'}">
                                <button id="bot-panel-primary-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <label for="bot-panel-border-color" class="color-label">Border Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="bot-panel-border-color-picker" value="${window.extension_settings[MODULE_NAME]?.botPanelColors?.border || '#8a7fdb'}">
                                <input type="text" id="bot-panel-border-color" value="${window.extension_settings[MODULE_NAME]?.botPanelColors?.border || '#8a7fdb'}">
                                <button id="bot-panel-border-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <label for="bot-panel-shadow-color" class="color-label">Shadow Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="bot-panel-shadow-color-picker" value="#6a4fc1">
                                <input type="text" id="bot-panel-shadow-color" value="${window.extension_settings[MODULE_NAME]?.botPanelColors?.shadow || 'rgba(106, 79, 193, 0.4)'}">
                                <button id="bot-panel-shadow-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- User Panel Colors -->
                    <div class="panel-color-section">
                        <h5 class="color-section-title">User Panel</h5>
                        
                        <div class="color-setting-row">
                            <label for="user-panel-primary-color" class="color-label">Primary Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="user-panel-primary-color-picker" value="#1a78d1">
                                <input type="text" id="user-panel-primary-color" value="${window.extension_settings[MODULE_NAME]?.userPanelColors?.primary || 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)'}">
                                <button id="user-panel-primary-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <label for="user-panel-border-color" class="color-label">Border Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="user-panel-border-color-picker" value="${window.extension_settings[MODULE_NAME]?.userPanelColors?.border || '#5da6f0'}">
                                <input type="text" id="user-panel-border-color" value="${window.extension_settings[MODULE_NAME]?.userPanelColors?.border || '#5da6f0'}">
                                <button id="user-panel-border-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <label for="user-panel-shadow-color" class="color-label">Shadow Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="user-panel-shadow-color-picker" value="#1a78d1">
                                <input type="text" id="user-panel-shadow-color" value="${window.extension_settings[MODULE_NAME]?.userPanelColors?.shadow || 'rgba(26, 120, 209, 0.4)'}">
                                <button id="user-panel-shadow-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                    </div>
                    
                    <button id="apply-panel-colors" class="menu_button">Apply Panel Colors</button>
                </div>
                <div class="setting-group">
                    <h4>${hasAutoSystem ? 'Auto Outfit Settings' : 'Advanced Settings'}</h4>
                    ${autoSettingsHtml}
                </div>
                
                <div class="setting-group">
                    <h4>Data Management</h4>
                    <div class="flex-container">
                        <button id="outfit-wipe-all-btn" class="menu_button warning-button">Wipe All Outfits</button>
                    </div>
                    <p class="setting-description">This will permanently delete all saved outfit information for all characters and users. This action cannot be undone.</p>
                </div>
            </div>
        </div>
    </div>
    `;

    $('#extensions_settings').append(settingsHtml);

    // Update status indicators after settings are loaded
    function updateStatusIndicators() {
        if (typeof window.getOutfitExtensionStatus === 'function') {
            const status = window.getOutfitExtensionStatus();
            
            // Update core extension status
            if (status.core) {
                $('#status-core').removeClass('status-loading').addClass('status-active').text('Active');
            } else {
                $('#status-core').removeClass('status-loading').addClass('status-inactive').text('Inactive');
            }
            
            // Update auto outfit system status
            if (status.autoOutfit) {
                if (status.autoOutfit.enabled) {
                    $('#status-auto-outfit').removeClass('status-loading').addClass('status-active').text('Active');
                } else {
                    $('#status-auto-outfit').removeClass('status-loading').addClass('status-inactive').text('Inactive');
                }
            } else {
                $('#status-auto-outfit').removeClass('status-loading').addClass('status-inactive').text('Not Available');
            }
            
            // Update bot panel status
            if (status.botPanel) {
                if (status.botPanel.isVisible) {
                    $('#status-bot-panel').removeClass('status-loading').addClass('status-active').text('Visible');
                } else {
                    $('#status-bot-panel').removeClass('status-loading').addClass('status-inactive').text('Hidden');
                }
            } else {
                $('#status-bot-panel').removeClass('status-loading').addClass('status-inactive').text('Not Loaded');
            }
            
            // Update user panel status
            if (status.userPanel) {
                if (status.userPanel.isVisible) {
                    $('#status-user-panel').removeClass('status-loading').addClass('status-active').text('Visible');
                } else {
                    $('#status-user-panel').removeClass('status-loading').addClass('status-inactive').text('Hidden');
                }
            } else {
                $('#status-user-panel').removeClass('status-loading').addClass('status-inactive').text('Not Loaded');
            }
            
            // Update event system status
            if (status.events) {
                $('#status-events').removeClass('status-loading').addClass('status-active').text('Active');
            } else {
                $('#status-events').removeClass('status-loading').addClass('status-warning').text('Limited');
            }
            
            // Update outfit managers status
            if (status.managers) {
                $('#status-managers').removeClass('status-loading').addClass('status-active').text('Active');
            } else {
                $('#status-managers').removeClass('status-loading').addClass('status-inactive').text('Inactive');
            }
        } else {
            // Fallback to direct checking
            try {
                // Check if the extension is properly loaded
                if (window.outfitTracker && window.extension_settings?.outfit_tracker) {
                    $('#status-core').removeClass('status-loading').addClass('status-active').text('Active');
                } else {
                    $('#status-core').removeClass('status-loading').addClass('status-inactive').text('Inactive');
                }
                
                // Check if auto outfit system is available and enabled
                if (window.outfitTracker?.autoOutfitSystem) {
                    const autoOutfitSystem = window.outfitTracker.autoOutfitSystem;
                    const autoOutfitStatus = typeof autoOutfitSystem.getStatus === 'function' 
                        ? autoOutfitSystem.getStatus() 
                        : null;

                    if (autoOutfitStatus && autoOutfitStatus.enabled) {
                        $('#status-auto-outfit').removeClass('status-loading').addClass('status-active').text('Active');
                    } else if (autoOutfitStatus) {
                        $('#status-auto-outfit').removeClass('status-loading').addClass('status-inactive').text('Inactive');
                    } else {
                        $('#status-auto-outfit').removeClass('status-loading').addClass('status-inactive').text('Not Available');
                    }
                } else {
                    $('#status-auto-outfit').removeClass('status-loading').addClass('status-inactive').text('Not Available');
                }
                
                // Check bot panel status
                if (window.outfitTracker?.botOutfitPanel) {
                    if (window.outfitTracker.botOutfitPanel.isVisible) {
                        $('#status-bot-panel').removeClass('status-loading').addClass('status-active').text('Visible');
                    } else {
                        $('#status-bot-panel').removeClass('status-loading').addClass('status-inactive').text('Hidden');
                    }
                } else {
                    $('#status-bot-panel').removeClass('status-loading').addClass('status-inactive').text('Not Loaded');
                }
                
                // Check user panel status
                if (window.outfitTracker?.userOutfitPanel) {
                    if (window.outfitTracker.userOutfitPanel.isVisible) {
                        $('#status-user-panel').removeClass('status-loading').addClass('status-active').text('Visible');
                    } else {
                        $('#status-user-panel').removeClass('status-loading').addClass('status-inactive').text('Hidden');
                    }
                } else {
                    $('#status-user-panel').removeClass('status-loading').addClass('status-inactive').text('Not Loaded');
                }
                
                // Check event system status (check if event listeners were set up)
                const context = window.getContext ? window.getContext() : null;

                if (context && context.eventSource) {
                    $('#status-events').removeClass('status-loading').addClass('status-active').text('Active');
                } else {
                    $('#status-events').removeClass('status-loading').addClass('status-warning').text('Limited');
                }
                
                // Check outfit managers status
                if (window.outfitTracker?.botOutfitPanel?.outfitManager && 
                    window.outfitTracker?.userOutfitPanel?.outfitManager) {
                    $('#status-managers').removeClass('status-loading').addClass('status-active').text('Active');
                } else {
                    $('#status-managers').removeClass('status-loading').addClass('status-inactive').text('Inactive');
                }
            } catch (error) {
                console.error('[OutfitTracker] Error in fallback status check:', error);
                
                // Set all statuses to error state
                $('#status-core').removeClass('status-loading').addClass('status-error').text('Error');
                $('#status-auto-outfit').removeClass('status-loading').addClass('status-error').text('Error');
                $('#status-bot-panel').removeClass('status-loading').addClass('status-error').text('Error');
                $('#status-user-panel').removeClass('status-loading').addClass('status-error').text('Error');
                $('#status-events').removeClass('status-loading').addClass('status-error').text('Error');
                $('#status-managers').removeClass('status-loading').addClass('status-error').text('Error');
            }
        }
    }

    // Update status indicators when the drawer is opened
    $('.inline-drawer-toggle').on('click', function() {
        setTimeout(updateStatusIndicators, 100); // Small delay to ensure UI is fully loaded
    });

    // Function to update status indicators periodically
    function periodicallyUpdateStatusIndicators() {
        updateStatusIndicators();
        setTimeout(periodicallyUpdateStatusIndicators, 10000); // Update every 10 seconds
    }

    // Start periodic updates after a short delay
    setTimeout(periodicallyUpdateStatusIndicators, 2000);

    // Helper function to convert hex color to rgba
    function hexToRgba(hex, opacity) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;

        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

        return result ?
            `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})` :
            'rgba(0, 0, 0, 0.4)'; // default fallback
    }

    // Update status indicators when panel visibility changes
    // We need to hook into panel show/hide methods to update status immediately
    if (window.botOutfitPanel) {
        const originalBotShow = window.botOutfitPanel.show;
        const originalBotHide = window.botOutfitPanel.hide;

        window.botOutfitPanel.show = function() {
            originalBotShow.call(this);
            // Update status after the panel is shown
            setTimeout(() => {
                if (window.botOutfitPanel) {
                    $('#status-bot-panel').removeClass('status-loading status-inactive').addClass('status-active').text('Visible');
                }
            }, 100);
        };

        window.botOutfitPanel.hide = function() {
            originalBotHide.call(this);
            // Update status after the panel is hidden
            setTimeout(() => {
                if (window.botOutfitPanel) {
                    $('#status-bot-panel').removeClass('status-loading status-active').addClass('status-inactive').text('Hidden');
                }
            }, 100);
        };
    }

    if (window.userOutfitPanel) {
        const originalUserShow = window.userOutfitPanel.show;
        const originalUserHide = window.userOutfitPanel.hide;

        window.userOutfitPanel.show = function() {
            originalUserShow.call(this);
            // Update status after the panel is shown
            setTimeout(() => {
                if (window.userOutfitPanel) {
                    $('#status-user-panel').removeClass('status-loading status-inactive').addClass('status-active').text('Visible');
                }
            }, 100);
        };

        window.userOutfitPanel.hide = function() {
            originalUserHide.call(this);
            // Update status after the panel is hidden
            setTimeout(() => {
                if (window.userOutfitPanel) {
                    $('#status-user-panel').removeClass('status-loading status-active').addClass('status-inactive').text('Hidden');
                }
            }, 100);
        };
    }

    // Helper function to extract hex color from gradient string
    function extractHexFromGradient(gradientStr) {
        // Match hex color in gradient string
        const match = gradientStr.match(/#([a-fA-F0-9]{6})/);

        return match ? match[0] : '#6a4fc1'; // Default color if not found
    }

    // Function to update the color pickers based on text input values
    function updateColorPickersFromText() {
        // Update bot panel color pickers
        const botPrimaryText = $('#bot-panel-primary-color').val();

        if (botPrimaryText.startsWith('linear-gradient')) {
            $('#bot-panel-primary-color-picker').val(extractHexFromGradient(botPrimaryText));
        } else {
            $('#bot-panel-primary-color-picker').val(botPrimaryText);
        }

        const botBorderText = $('#bot-panel-border-color').val();

        $('#bot-panel-border-color-picker').val(extractHexFromGradient(botBorderText) || botBorderText);

        const botShadowText = $('#bot-panel-shadow-color').val();
        // Extract hex from rgba if possible
        const rgbaMatch = botShadowText.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,s*[\d.]+)?\)/);

        if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
            const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
            const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');

            $('#bot-panel-shadow-color-picker').val(`#${r}${g}${b}`);
        } else {
            $('#bot-panel-shadow-color-picker').val(extractHexFromGradient(botShadowText) || botShadowText);
        }

        // Update user panel color pickers
        const userPrimaryText = $('#user-panel-primary-color').val();

        if (userPrimaryText.startsWith('linear-gradient')) {
            $('#user-panel-primary-color-picker').val(extractHexFromGradient(userPrimaryText));
        } else {
            $('#user-panel-primary-color-picker').val(userPrimaryText);
        }

        const userBorderText = $('#user-panel-border-color').val();

        $('#user-panel-border-color-picker').val(extractHexFromGradient(userBorderText) || userBorderText);

        const userShadowText = $('#user-panel-shadow-color').val();
        // Extract hex from rgba if possible
        const userRgbaMatch = userShadowText.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,s*[\d.]+)?\)/);

        if (userRgbaMatch) {
            const r = parseInt(userRgbaMatch[1]).toString(16).padStart(2, '0');
            const g = parseInt(userRgbaMatch[2]).toString(16).padStart(2, '0');
            const b = parseInt(userRgbaMatch[3]).toString(16).padStart(2, '0');

            $('#user-panel-shadow-color-picker').val(`#${r}${g}${b}`);
        } else {
            $('#user-panel-shadow-color-picker').val(extractHexFromGradient(userShadowText) || userShadowText);
        }
    }

    // Helper function to convert rgb/rgba to hex
    function rgbToHex(rgb) {
        const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);

        if (!match) {return '#000000';} // Return black for invalid input
        
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        
        return `#${r}${g}${b}`;
    }

    // Function to update settings and apply colors
    function updateColorSettingsAndApply() {
        // Update the extension settings with new color values
        window.extension_settings[MODULE_NAME].botPanelColors = {
            primary: $('#bot-panel-primary-color').val(),
            border: $('#bot-panel-border-color').val(),
            shadow: $('#bot-panel-shadow-color').val()
        };

        window.extension_settings[MODULE_NAME].userPanelColors = {
            primary: $('#user-panel-primary-color').val(),
            border: $('#user-panel-border-color').val(),
            shadow: $('#user-panel-shadow-color').val()
        };

        window.saveSettingsDebounced();

        // Apply the new colors to the panels
        if (window.botOutfitPanel && window.botOutfitPanel.applyPanelColors) {
            window.botOutfitPanel.applyPanelColors();
        }
        if (window.userOutfitPanel && window.userOutfitPanel.applyPanelColors) {
            window.userOutfitPanel.applyPanelColors();
        }

        // Show a confirmation message
        toastr.success('Panel colors updated successfully!', 'Outfit Colors');
    }

    // Custom toggle switch styling
    $(document).on('change', '#outfit-sys-toggle, #outfit-auto-bot, #outfit-auto-user', function() {
        window.extension_settings[MODULE_NAME].enableSysMessages = $('#outfit-sys-toggle').prop('checked');
        window.extension_settings[MODULE_NAME].autoOpenBot = $('#outfit-auto-bot').prop('checked');
        window.extension_settings[MODULE_NAME].autoOpenUser = $('#outfit-auto-user').prop('checked');
        window.saveSettingsDebounced();
    });

    // Update quote color when settings change
    $(document).on('change input', '#quote-color-input', function() {
        window.extension_settings[MODULE_NAME].quoteColor = $(this).val();
        window.saveSettingsDebounced();
        registerQuotesColorExtension(window.extension_settings[MODULE_NAME].quoteColor);
    });

    // Update quote color picker when color picker changes
    $('#quote-color-picker').on('input', function() {
        const hexColor = $(this).val();

        $('#quote-color-input').val(hexColor);
        window.extension_settings[MODULE_NAME].quoteColor = hexColor;
        window.saveSettingsDebounced();
        registerQuotesColorExtension(window.extension_settings[MODULE_NAME].quoteColor);
    });

    // Update quote color text when picker changes
    $('#quote-color-input').on('input', function() {
        const colorValue = $(this).val();

        $('#quote-color-picker').val(colorValue);
        window.extension_settings[MODULE_NAME].quoteColor = colorValue;
        window.saveSettingsDebounced();
        registerQuotesColorExtension(window.extension_settings[MODULE_NAME].quoteColor);
    });

    // Update panel colors when settings change
    $(document).on('input', '#bot-panel-primary-color, #bot-panel-border-color, #bot-panel-shadow-color, #user-panel-primary-color, #user-panel-border-color, #user-panel-shadow-color', function() {
        updateColorSettingsAndApply();
    });

    // Color customization event listeners
    $('#apply-panel-colors').on('click', function() {
        updateColorSettingsAndApply();

        // Visual feedback for button click
        const originalText = $(this).text();

        $(this).text('Applied!').css('background', 'linear-gradient(135deg, #5a8d5a, #4a7d4a)');

        setTimeout(() => {
            $(this).text(originalText).css('background', 'linear-gradient(135deg, #4a5bb8 0%, #3a4ba8 100%)');
        }, 2000);
    });

    // Update text inputs when color pickers change
    $('#bot-panel-primary-color-picker').on('input', function() {
        // Extract hex color from the picker and update the text field
        const hexColor = $(this).val();

        $('#bot-panel-primary-color').val(`linear-gradient(135deg, ${hexColor} 0%, #5a49d0 50%, #4a43c0 100%)`);
    });

    $('#bot-panel-border-color-picker').on('input', function() {
        const hexColor = $(this).val();

        $('#bot-panel-border-color').val(hexColor);
    });

    $('#bot-panel-shadow-color-picker').on('input', function() {
        const hexColor = $(this).val();
        // Convert hex to rgba for shadow (with opacity)
        const rgba = hexToRgba(hexColor, 0.4);

        $('#bot-panel-shadow-color').val(rgba);
    });

    $('#user-panel-primary-color-picker').on('input', function() {
        const hexColor = $(this).val();

        $('#user-panel-primary-color').val(`linear-gradient(135deg, ${hexColor} 0%, #2a68c1 50%, #1a58b1 100%)`);
    });

    $('#user-panel-border-color-picker').on('input', function() {
        const hexColor = $(this).val();

        $('#user-panel-border-color').val(hexColor);
    });

    $('#user-panel-shadow-color-picker').on('input', function() {
        const hexColor = $(this).val();
        // Convert hex to rgba for shadow (with opacity)
        const rgba = hexToRgba(hexColor, 0.4);

        $('#user-panel-shadow-color').val(rgba);
    });

    // Update color pickers when text inputs change (in case users type in values)
    $(document).on('input', '#bot-panel-primary-color, #bot-panel-border-color, #bot-panel-shadow-color, #user-panel-primary-color, #user-panel-border-color, #user-panel-shadow-color', function() {
        updateColorPickersFromText();
    });

    // Add hover effects to the apply button
    $('#apply-panel-colors').hover(
        function() { // Mouse enter
            $(this).css('background', 'linear-gradient(135deg, #5a6bc8 0%, #4a5ba8 100%)');
        },
        function() { // Mouse leave
            $(this).css('background', 'linear-gradient(135deg, #4a5bb8 0%, #3a4ba8 100%)');
        }
    );

    // Store original default values for comparison
    const originalDefaults = {
        bot: {
            primary: 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)',
            border: '#8a7fdb',
            shadow: 'rgba(106, 79, 193, 0.4)'
        },
        user: {
            primary: 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)',
            border: '#5da6f0',
            shadow: 'rgba(26, 120, 209, 0.4)'
        }
    };

    // Function to check if a field has been modified from its default
    function isFieldModified(fieldId, defaultValue) {
        const currentValue = $(`#${fieldId}`).val();

        return currentValue !== defaultValue;
    }

    // Helper function to toggle reset button visibility
    function toggleResetButton(buttonId, show) {
        const button = $(`#${buttonId}`);

        if (show) {
            button.show();
        } else {
            button.hide();
        }
    }
    
    // Function to update reset button visibility
    function updateResetButtonVisibility() {
        // Bot panel
        toggleResetButton('bot-panel-primary-reset', isFieldModified('bot-panel-primary-color', originalDefaults.bot.primary));
        toggleResetButton('bot-panel-border-reset', isFieldModified('bot-panel-border-color', originalDefaults.bot.border));
        toggleResetButton('bot-panel-shadow-reset', isFieldModified('bot-panel-shadow-color', originalDefaults.bot.shadow));

        // User panel
        toggleResetButton('user-panel-primary-reset', isFieldModified('user-panel-primary-color', originalDefaults.user.primary));
        toggleResetButton('user-panel-border-reset', isFieldModified('user-panel-border-color', originalDefaults.user.border));
        toggleResetButton('user-panel-shadow-reset', isFieldModified('user-panel-shadow-color', originalDefaults.user.shadow));
    }

    // Attach input event listeners to text fields to check for modifications
    $('#bot-panel-primary-color, #bot-panel-border-color, #bot-panel-shadow-color, #user-panel-primary-color, #user-panel-border-color, #user-panel-shadow-color').on('input', function() {
        updateResetButtonVisibility();
    });

    // Initialize reset button visibility after UI is created
    setTimeout(updateResetButtonVisibility, 200);

    // Reset button event handlers
    $('#bot-panel-primary-reset').on('click', function() {
        $('#bot-panel-primary-color').val(originalDefaults.bot.primary);
        $('#bot-panel-primary-color-picker').val(extractHexFromGradient(originalDefaults.bot.primary));
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    $('#bot-panel-border-reset').on('click', function() {
        $('#bot-panel-border-color').val(originalDefaults.bot.border);
        $('#bot-panel-border-color-picker').val(originalDefaults.bot.border);
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    $('#bot-panel-shadow-reset').on('click', function() {
        $('#bot-panel-shadow-color').val(originalDefaults.bot.shadow);
        $('#bot-panel-shadow-color-picker').val(extractHexFromGradient(originalDefaults.bot.shadow));
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    $('#user-panel-primary-reset').on('click', function() {
        $('#user-panel-primary-color').val(originalDefaults.user.primary);
        $('#user-panel-primary-color-picker').val(extractHexFromGradient(originalDefaults.user.primary));
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    $('#user-panel-border-reset').on('click', function() {
        $('#user-panel-border-color').val(originalDefaults.user.border);
        $('#user-panel-border-color-picker').val(originalDefaults.user.border);
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    $('#user-panel-shadow-reset').on('click', function() {
        $('#user-panel-shadow-color').val(originalDefaults.user.shadow);
        $('#user-panel-shadow-color-picker').val(extractHexFromGradient(originalDefaults.user.shadow));
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    // Initialize color pickers with current values when the settings UI loads
    setTimeout(updateColorPickersFromText, 100);

    // Only add auto system event listeners if it loaded successfully
    if (hasAutoSystem) {
        $('#outfit-auto-system').on('input', function() {
            window.extension_settings[MODULE_NAME].autoOutfitSystem = $(this).prop('checked');
            if ($(this).prop('checked')) {
                autoOutfitSystem.enable();
            } else {
                autoOutfitSystem.disable();
            }
            window.saveSettingsDebounced();
        });

        $('#outfit-connection-profile').on('change', function() {
            const profile = $(this).val() || null;

            window.extension_settings[MODULE_NAME].autoOutfitConnectionProfile = profile;
            if (autoOutfitSystem.setConnectionProfile) {
                autoOutfitSystem.setConnectionProfile(profile);
            }
            window.saveSettingsDebounced();
        });

        $('#outfit-prompt-input').on('change', function() {
            window.extension_settings[MODULE_NAME].autoOutfitPrompt = $(this).val();
            autoOutfitSystem.setPrompt($(this).val());
            window.saveSettingsDebounced();
        });

        $('#outfit-prompt-reset-btn').on('click', function() {
            const message = autoOutfitSystem.resetToDefaultPrompt();

            $('#outfit-prompt-input').val(autoOutfitSystem.systemPrompt);
            window.extension_settings[MODULE_NAME].autoOutfitPrompt = autoOutfitSystem.systemPrompt;
            window.saveSettingsDebounced();

            if (window.extension_settings.outfit_tracker?.enableSysMessages) {
                window.botOutfitPanel.sendSystemMessage(message);
            } else {
                toastr.info(message);
            }
        });

        $('#outfit-prompt-view-btn').on('click', function() {
            const status = autoOutfitSystem.getStatus();
            const preview = autoOutfitSystem.systemPrompt.length > 100
                ? autoOutfitSystem.systemPrompt.substring(0, 100) + '...'
                : autoOutfitSystem.systemPrompt;

            toastr.info(`Prompt preview: ${preview}

Full length: ${status.promptLength} characters`, 'Current System Prompt', {
                timeOut: 15000,
                extendedTimeOut: 30000
            });
        });
    }
    
    // Add event listener for the wipe all outfits button
    $('#outfit-wipe-all-btn').on('click', function() {
        // Show confirmation dialog
        if (confirm('Are you sure you want to permanently delete ALL saved outfit information for all characters and users? This action cannot be undone.')) {
            // Call the wipe function after confirmation
            if (typeof window.wipeAllOutfits === 'function') {
                window.wipeAllOutfits();
            }
        }
    });
}