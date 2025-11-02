import { dragElementWithSave, resizeElement } from '../common/shared.js';
import { outfitStore } from '../common/Store.js';
import { customMacroSystem } from '../services/CustomMacroService.js';
import { debugLogger } from '../logging/DebugLogger.js';
import { CharacterInfoType, getCharacterInfoById } from '../utils/CharacterUtils.js';
import { EXTENSION_EVENTS, extensionEventBus } from '../core/events.js';
export class DebugPanel {
    constructor() {
        this.isVisible = false;
        this.domElement = null;
        this.currentTab = 'instances';
        this.eventListeners = [];
        this.storeSubscription = null;
        this.previousInstanceId = null;
        this.recordedEvents = [];
        this.isEventRecordingPaused = false;
        this.realTimeUpdateInterval = null;
        this.logUpdateInterval = null;
        // Subscribe to all extension events to record them
        Object.values(EXTENSION_EVENTS).forEach(event => {
            extensionEventBus.on(event, (data) => {
                this.recordEvent(event, data);
            });
        });
    }
    /**
     * Records an event for display in the debug panel
     */
    recordEvent(event, data) {
        // Skip recording if paused
        if (this.isEventRecordingPaused) {
            return;
        }
        // Sanitize and limit data size to prevent memory issues
        const sanitizedData = this.sanitizeEventData(data);
        this.recordedEvents.push({
            timestamp: new Date().toISOString(),
            event,
            data: sanitizedData
        });
        // Keep the list of events from growing too large
        if (this.recordedEvents.length > 200) {
            this.recordedEvents.shift();
        }
        // If the events tab is active, re-render it
        if (this.isVisible && this.currentTab === 'events') {
            this.renderContent();
        }
    }
    /**
     * Pauses or resumes event recording
     */
    setEventRecordingPaused(paused) {
        this.isEventRecordingPaused = paused;
    }
    /**
     * Creates the debug panel DOM element and sets up its basic functionality
     * @returns {HTMLElement} The created panel element
     */
    createPanel() {
        if (this.domElement) {
            return this.domElement;
        }
        const panel = document.createElement('div');
        panel.id = 'outfit-debug-panel';
        panel.className = 'outfit-debug-panel';
        panel.innerHTML = `
            <div class="outfit-debug-header">
                <h3>Outfit Debug Panel <span class="realtime-status" id="realtime-status">🔄 Live</span></h3>
                <div class="outfit-debug-actions">
                    <span class="outfit-debug-action" id="outfit-debug-close">×</span>
                </div>
            </div>
            <div class="outfit-debug-tabs">
                <button class="outfit-debug-tab ${this.currentTab === 'instances' ? 'active' : ''}" data-tab="instances">Instances <span class="realtime-indicator">🔄</span></button>
                <button class="outfit-debug-tab ${this.currentTab === 'macros' ? 'active' : ''}" data-tab="macros">Macros <span class="realtime-indicator">🔄</span></button>
                 <button class="outfit-debug-tab ${this.currentTab === 'pointers' ? 'active' : ''}" data-tab="pointers">Pointers <span class="realtime-indicator">🔄</span></button>
                 <button class="outfit-debug-tab ${this.currentTab === 'performance' ? 'active' : ''}" data-tab="performance">Performance <span class="realtime-indicator">🔄</span></button>
                 <button class="outfit-debug-tab ${this.currentTab === 'logs' ? 'active' : ''}" data-tab="logs">Logs <span class="realtime-indicator">🔄</span></button>
                 <button class="outfit-debug-tab ${this.currentTab === 'events' ? 'active' : ''}" data-tab="events">Events</button>
                 <button class="outfit-debug-tab ${this.currentTab === 'state' ? 'active' : ''}" data-tab="state">State <span class="realtime-indicator">🔄</span></button>
                 <button class="outfit-debug-tab ${this.currentTab === 'misc' ? 'active' : ''}" data-tab="misc">Misc <span class="realtime-indicator">🔄</span></button>
            </div>
            <div class="outfit-debug-content" id="outfit-debug-tab-content"></div>
        `;
        document.body.appendChild(panel);
        // Set up tab switching
        const tabs = panel.querySelectorAll('.outfit-debug-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                const tabName = event.target.dataset.tab;
                if (tabName == null)
                    return;
                this.currentTab = tabName;
                this.renderContent();
                tabs.forEach(t => t.classList.remove('active'));
                event.target.classList.add('active');
            });
        });
        return panel;
    }
    /**
     * Renders the 'Events' tab with a log of dispatched events
     */
    renderEventsTab(container) {
        let eventsHtml = `
            <div class="debug-events-header">
                <div class="events-controls">
                    <input type="text" id="event-search" placeholder="Search events..." class="event-search-input">
                    <select id="event-type-filter" class="event-filter-select">
                        <option value="all">All Events</option>
                        <option value="outfit-tracker-context-updated">Context Updated</option>
                        <option value="outfit-tracker-outfit-changed">Outfit Changed</option>
                        <option value="outfit-tracker-preset-loaded">Preset Loaded</option>
                        <option value="outfit-tracker-panel-visibility-changed">Panel Visibility</option>
                        <option value="outfit-tracker-chat-cleared">Chat Cleared</option>
                        <option value="outfit-tracker-data-loaded">Data Loaded</option>
                    </select>
                    <button id="pause-events-btn" class="menu_button">Pause</button>
                    <button id="export-events-btn" class="menu_button">Export</button>
                    <button id="clear-events-btn" class="menu_button">Clear Events</button>
                </div>
                <div class="events-stats">
                    <span class="events-count">Total: ${this.recordedEvents.length}</span>
                    <span class="events-filtered-count" style="display: none;">Filtered: 0</span>
                </div>
            </div>
            <div class="debug-events-list">
        `;
        if (this.recordedEvents.length === 0) {
            eventsHtml += '<p class="no-events">No events recorded yet.</p>';
        }
        else {
            eventsHtml += '<div class="events-container">';
            eventsHtml += this.recordedEvents.slice().reverse().map((event, index) => {
                const eventType = event.event;
                const eventClass = this.getEventClass(eventType);
                const eventIcon = this.getEventIcon(eventType);
                const formattedTime = new Date(event.timestamp).toLocaleTimeString();
                const hasData = event.data !== null && event.data !== undefined;
                return `
                    <div class="event-item ${eventClass}" data-event-type="${eventType}" data-index="${index}">
                        <div class="event-header">
                            <span class="event-icon">${eventIcon}</span>
                            <span class="event-time">${formattedTime}</span>
                            <span class="event-name">${eventType}</span>
                            <button class="event-toggle-btn" title="Toggle details">▼</button>
                        </div>
                        ${hasData ? `
                            <div class="event-details" style="display: none;">
                                <pre>${JSON.stringify(event.data, null, 2)}</pre>
                                <button class="copy-event-btn" title="Copy event data">📋</button>
                            </div>
                        ` : '<div class="event-no-data">No data</div>'}
                    </div>
                `;
            }).join('');
            eventsHtml += '</div>';
        }
        eventsHtml += '</div>';
        container.innerHTML = eventsHtml;
        // Add event listeners
        this.setupEventListeners(container);
    }
    /**
     * Shows the debug panel UI
     */
    show() {
        var _a;
        // Check if debug mode is enabled
        const state = outfitStore.getState();
        if (!state.settings.debugMode) {
            debugLogger.log('Debug mode is disabled. Not showing debug panel.');
            return;
        }
        if (!this.domElement) {
            this.domElement = this.createPanel();
        }
        // Initialize the previous instance ID to the current one when showing the panel
        this.previousInstanceId = state.currentOutfitInstanceId;
        this.renderContent();
        this.domElement.style.display = 'flex';
        this.isVisible = true;
        // Subscribe to store changes to update highlighting when current instance changes
        if (!this.storeSubscription) {
            this.storeSubscription = outfitStore.subscribe((newState) => {
                // Check if the current outfit instance ID has changed
                if (this.previousInstanceId !== newState.currentOutfitInstanceId) {
                    this.previousInstanceId = newState.currentOutfitInstanceId;
                    // Only re-render if the debug panel is visible to avoid unnecessary updates
                    if (this.isVisible && this.currentTab === 'instances') {
                        this.renderContent();
                    }
                }
                // Update other tabs that need real-time data
                this.updateRealTimeTabs(newState);
            });
        }
        // Start real-time update intervals
        this.startRealTimeUpdates();
        if (this.domElement) {
            dragElementWithSave(this.domElement, 'outfit-debug-panel');
            // Initialize resizing with appropriate min/max dimensions
            setTimeout(() => {
                resizeElement($(this.domElement), 'outfit-debug-panel');
            }, 10); // Small delay to ensure panel is rendered first
            (_a = this.domElement.querySelector('#outfit-debug-close')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => this.hide());
        }
    }
    /**
     * Hides the debug panel UI
     */
    hide() {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
        // Unsubscribe from store changes when panel is hidden
        if (this.storeSubscription) {
            this.storeSubscription();
            this.storeSubscription = null;
        }
        // Stop real-time updates
        this.stopRealTimeUpdates();
    }
    /**
     * Sanitizes event data to prevent memory issues and improve readability
     */
    sanitizeEventData(data) {
        if (data === null || data === undefined) {
            return null;
        }
        try {
            // Convert to JSON string and back to remove circular references
            const jsonString = JSON.stringify(data, (key, value) => {
                // Limit string length to prevent memory issues
                if (typeof value === 'string' && value.length > 500) {
                    return value.substring(0, 500) + '... [truncated]';
                }
                // Skip functions and complex objects that can't be serialized
                if (typeof value === 'function') {
                    return '[Function]';
                }
                return value;
            });
            return JSON.parse(jsonString);
        }
        catch (error) {
            return '[Unserializable data]';
        }
    }
    /**
     * Exports events to a JSON file
     */
    exportEvents() {
        try {
            const exportData = {
                exportTime: new Date().toISOString(),
                totalEvents: this.recordedEvents.length,
                events: this.recordedEvents
            };
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `outfit-events-export-${new Date().toISOString().slice(0, 19)}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            toastr.success('Events exported successfully!', 'Debug Panel');
        }
        catch (error) {
            debugLogger.log('Error exporting events:', error, 'error');
            toastr.error('Error exporting events', 'Debug Panel');
        }
    }
    /**
     * Starts real-time update intervals for various tabs
     */
    startRealTimeUpdates() {
        // Clear existing intervals
        this.stopRealTimeUpdates();
        // Update logs tab every 500ms
        this.logUpdateInterval = window.setInterval(() => {
            if (this.isVisible && this.currentTab === 'logs') {
                this.updateLogsTab();
            }
        }, 500);
        // Update other tabs every 2 seconds
        this.realTimeUpdateInterval = window.setInterval(() => {
            if (!this.isVisible)
                return;
            switch (this.currentTab) {
                case 'macros':
                    this.updateMacrosTab();
                    break;
                case 'pointers':
                    this.updatePointersTab();
                    break;
                case 'performance':
                    this.updatePerformanceTab();
                    break;
                case 'state':
                    this.updateStateTab();
                    break;
                case 'misc':
                    this.updateMiscTab();
                    break;
            }
        }, 2000);
    }
    /**
     * Stops real-time update intervals
     */
    stopRealTimeUpdates() {
        if (this.realTimeUpdateInterval) {
            clearInterval(this.realTimeUpdateInterval);
            this.realTimeUpdateInterval = null;
        }
        if (this.logUpdateInterval) {
            clearInterval(this.logUpdateInterval);
            this.logUpdateInterval = null;
        }
    }
    /**
     * Renders the 'Macros' tab to showcase current instances and derivations
     */
    renderMacrosTab(container) {
        const state = outfitStore.getState();
        const botInstances = state.botInstances;
        const userInstances = state.userInstances;
        let macrosHtml = '<div class="debug-macros-list">';
        // Show macro information
        macrosHtml += '<h4>Current Macro Values</h4>';
        macrosHtml += '<div class="macro-info">';
        // Get current character and user names
        const currentCharName = customMacroSystem.getCurrentCharName();
        const currentUserName = customMacroSystem.getCurrentUserName();
        macrosHtml += `<div><strong>Current Character:</strong> ${currentCharName}</div>`;
        macrosHtml += `<div><strong>Current User:</strong> ${currentUserName}</div>`;
        macrosHtml += `<div><strong>Current Instance ID:</strong> ${state.currentOutfitInstanceId || 'None'}</div>`;
        // Show some example macro values
        macrosHtml += '<h5>Example Macro Values:</h5>';
        macrosHtml += '<table class="macro-values-table">';
        macrosHtml += '<tr><th>Macro</th><th>Value</th><th>Source</th></tr>';
        // Get current character's outfit data if available
        const currentCharacterId = state.currentCharacterId;
        const currentInstanceId = state.currentOutfitInstanceId;
        if (currentCharacterId && currentInstanceId && botInstances[currentCharacterId] && botInstances[currentCharacterId][currentInstanceId]) {
            const botOutfitData = botInstances[currentCharacterId][currentInstanceId].bot;
            for (const [slot, value] of Object.entries(botOutfitData)) {
                macrosHtml += `<tr><td>{{char_${slot}}}</td><td>${value}</td><td>Bot Outfit Data</td></tr>`;
            }
        }
        // Get current user's outfit data if available
        if (currentInstanceId && userInstances[currentInstanceId]) {
            const userOutfitData = userInstances[currentInstanceId];
            for (const [slot, value] of Object.entries(userOutfitData)) {
                macrosHtml += `<tr><td>{{user_${slot}}}</td><td>${value}</td><td>User Outfit Data</td></tr>`;
            }
        }
        macrosHtml += '</table>';
        // Show macro cache information
        macrosHtml += '<h5>Macro Cache Info:</h5>';
        macrosHtml += `<div class="macro-cache-info">Cached entries: ${customMacroSystem.macroValueCache.size} <small>(Updated: ${new Date().toLocaleTimeString()})</small></div>`;
        macrosHtml += '<table class="macro-cache-table">';
        macrosHtml += '<thead><tr><th>Cache Key</th><th>Value</th><th>Timestamp</th></tr></thead>';
        macrosHtml += '<tbody>';
        for (const [key, entry] of customMacroSystem.macroValueCache.entries()) {
            const timestamp = new Date(entry.timestamp).toISOString();
            macrosHtml += `<tr><td>${key}</td><td>${entry.value}</td><td>${timestamp}</td></tr>`;
        }
        macrosHtml += '</tbody></table>';
        // Add more detailed macro processing information
        macrosHtml += '<h5>Detailed Macro Processing Info:</h5>';
        macrosHtml += '<div class="macro-processing-info">';
        macrosHtml += `<div><strong>Current Chat ID:</strong> ${state.currentChatId || 'None'}</div>`;
        macrosHtml += `<div><strong>Current Character:</strong> ${currentCharName}</div>`;
        macrosHtml += '</div>';
        macrosHtml += '</div></div>';
        // Add macro testing section
        macrosHtml += '<h5>Test Macro Processing</h5>';
        macrosHtml += '<div class="macro-testing-area">';
        macrosHtml += '<textarea id="macro-test-input" placeholder="Enter text with macros to test..."></textarea>';
        macrosHtml += '<button id="macro-test-btn" class="menu_button">Process Macros</button>';
        macrosHtml += '<div id="macro-test-output"></div>';
        macrosHtml += '</div>';
        container.innerHTML = macrosHtml;
        // Add event listener for macro testing
        setTimeout(() => {
            var _a;
            (_a = document.getElementById('macro-test-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                const input = document.getElementById('macro-test-input').value;
                const output = customMacroSystem.replaceMacrosInText(input);
                document.getElementById('macro-test-output').innerText = output;
            });
        }, 100);
    }
    /**
     * Updates tabs that need real-time data based on store changes
     */
    updateRealTimeTabs(newState) {
        if (!this.isVisible)
            return;
        // Note: Real-time updates are handled by intervals in startRealTimeUpdates()
        // This method is kept for future use if needed
    }
    /**
     * Updates logs tab with new log entries
     */
    updateLogsTab() {
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'logs')
            return;
        // Check if content has been rendered
        const logList = contentArea.querySelector('.debug-logs-list');
        if (!logList)
            return;
        const logs = debugLogger.getLogs();
        const logItems = contentArea.querySelectorAll('.log-item');
        // Only update if there are new logs
        if (logs.length > logItems.length) {
            this.renderLogsTab(contentArea);
        }
    }
    /**
     * Updates macros tab with current macro values
     */
    updateMacrosTab() {
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'macros')
            return;
        // Check if content has been rendered
        const cacheInfo = contentArea.querySelector('.macro-cache-info');
        const cacheTable = contentArea.querySelector('.macro-cache-table');
        if (!cacheInfo || !cacheTable)
            return;
        // Update macro cache info
        const updateTime = new Date().toLocaleTimeString();
        cacheInfo.innerHTML = `Cached entries: ${customMacroSystem.macroValueCache.size} <small>(Updated: ${updateTime})</small>`;
        // Update macro cache table
        const tbody = cacheTable.querySelector('tbody');
        if (tbody) {
            let tbodyHtml = '';
            for (const [key, entry] of customMacroSystem.macroValueCache.entries()) {
                const timestamp = new Date(entry.timestamp).toISOString();
                tbodyHtml += `<tr><td>${key}</td><td>${entry.value}</td><td>${timestamp}</td></tr>`;
            }
            tbody.innerHTML = tbodyHtml;
        }
    }
    /**
     * Renders the content of the currently selected tab
     */
    renderContent() {
        if (!this.domElement) {
            return;
        }
        const contentArea = this.domElement.querySelector('.outfit-debug-content');
        if (!contentArea) {
            return;
        }
        contentArea.innerHTML = '';
        contentArea.setAttribute('data-tab', this.currentTab);
        const tabRenderers = {
            instances: this.renderInstancesTab.bind(this),
            macros: this.renderMacrosTab.bind(this),
            pointers: this.renderPointersTab.bind(this),
            performance: this.renderPerformanceTab.bind(this),
            logs: this.renderLogsTab.bind(this),
            events: this.renderEventsTab.bind(this),
            state: this.renderStateTab.bind(this),
            misc: this.renderMiscTab.bind(this),
        };
        const renderer = tabRenderers[this.currentTab];
        if (renderer) {
            renderer(contentArea);
        }
    }
    /**
     * Renders the 'Logs' tab with logs from the DebugLogger
     */
    renderLogsTab(container) {
        const logs = debugLogger.getLogs();
        let logsHtml = `
            <div class="debug-logs-header">
                <input type="text" id="log-search" placeholder="Search logs...">
                <select id="log-level-filter">
                    <option value="all">All Levels</option>
                    <option value="info">Info</option>
                    <option value="warn">Warn</option>
                    <option value="error">Error</option>
                </select>
                <button id="clear-logs-btn" class="menu_button">Clear Logs</button>
            </div>
            <div class="debug-logs-list">
        `;
        if (logs.length === 0) {
            logsHtml += '<p>No logs available.</p>';
        }
        else {
            logsHtml += logs.map(log => {
                const hasData = log.data !== null && log.data !== undefined;
                const logItemClasses = `log-item log-${log.level.toLowerCase()}`;
                const logItemAttributes = `data-level="${log.level.toLowerCase()}" data-message="${log.message.toLowerCase()}"`;
                if (hasData) {
                    return `
                        <div class="${logItemClasses}" ${logItemAttributes}>
                            <details>
                                <summary>
                                    <span class="log-timestamp">${new Date(log.timestamp).toISOString()}</span>
                                    <span class="log-level">[${log.level}]</span>
                                    <span class="log-message">${log.message}</span>
                                </summary>
                                <div class="log-data">
                                    <pre>${JSON.stringify(log.data, null, 2)}</pre>
                                </div>
                            </details>
                        </div>
                    `;
                }
                else {
                    return `
                        <div class="${logItemClasses}" ${logItemAttributes}>
                            <span class="log-timestamp">${new Date(log.timestamp).toISOString()}</span>
                            <span class="log-level">[${log.level}]</span>
                            <span class="log-message">${log.message}</span>
                        </div>
                    `;
                }
            }).join('');
        }
        logsHtml += '</div>';
        container.innerHTML = logsHtml;
        const searchInput = container.querySelector('#log-search');
        const levelFilter = container.querySelector('#log-level-filter');
        const clearBtn = container.querySelector('#clear-logs-btn');
        const filterLogs = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const selectedLevel = levelFilter.value;
            const logItems = container.querySelectorAll('.log-item');
            logItems.forEach(item => {
                const level = item.dataset.level;
                const message = item.dataset.message;
                const isLevelMatch = selectedLevel === 'all' || level === selectedLevel;
                const isSearchMatch = message === null || message === void 0 ? void 0 : message.includes(searchTerm);
                if (isLevelMatch && isSearchMatch) {
                    item.style.display = '';
                }
                else {
                    item.style.display = 'none';
                }
            });
        };
        searchInput.addEventListener('input', filterLogs);
        levelFilter.addEventListener('change', filterLogs);
        clearBtn.addEventListener('click', () => {
            debugLogger.clearLogs();
            this.renderContent();
            toastr.success('Logs cleared!', 'Debug Panel');
        });
    }
    /**
     * Renders the 'Instances' tab with instance browser functionality
     */
    renderInstancesTab(container) {
        const state = outfitStore.getState();
        const botInstances = state.botInstances;
        const userInstances = state.userInstances;
        let instancesHtml = '<div class="debug-instances-list">';
        // Add search input
        instancesHtml += '<div class="instance-search-container"><input type="text" id="instance-search" placeholder="Search instances..."></div>';
        // Add bot instances
        instancesHtml += '<h4>Bot Instances</h4>';
        if (Object.keys(botInstances).length === 0) {
            instancesHtml += '<p class="no-instances">No bot instances found</p>';
        }
        else {
            for (const [charId, charData] of Object.entries(botInstances)) {
                const charName = getCharacterInfoById(charId, CharacterInfoType.Name);
                instancesHtml += `<h5>Character: ${charName} (${charId})</h5>`;
                for (const [instId, instData] of Object.entries(charData)) {
                    const currentInstanceId = state.currentOutfitInstanceId;
                    const isCurrent = instId === currentInstanceId;
                    // Format bot instance data for better readability
                    const formattedBotData = {
                        timestamp: instData.timestamp || 'No timestamp',
                        characterName: charName,
                        characterId: charId,
                        instanceId: instId,
                        outfit: instData.bot
                    };
                    instancesHtml += `
                     <div class="instance-item ${isCurrent ? 'current-instance' : ''}" data-character="${charName}" data-instance="${instId}" data-type="bot">
                         <div class="instance-id">
                             <span>${instId} ${isCurrent ? ' <span class="current-marker">[CURRENT]</span>' : ''}</span>
                             <div class="instance-actions">
                                 <button class="copy-instance-btn" title="Copy to Clipboard">📋</button>
                                 <button class="delete-instance-btn" title="Delete Instance">🗑️</button>
                             </div>
                         </div>
                         <div class="instance-data">
                             <pre>${JSON.stringify(formattedBotData, null, 2)}</pre>
                         </div>
                     </div>
                    `;
                }
            }
        }
        // Add user instances
        instancesHtml += '<h4>User Instances</h4>';
        if (Object.keys(userInstances).length === 0) {
            instancesHtml += '<p class="no-instances">No user instances found</p>';
        }
        else {
            for (const [instId, instData] of Object.entries(userInstances)) {
                const currentInstanceId = state.currentOutfitInstanceId;
                const isCurrent = instId === currentInstanceId;
                // Format user instance data for better readability
                const formattedUserData = {
                    timestamp: instData.timestamp || 'No timestamp',
                    instanceId: instId,
                    outfit: instData
                };
                instancesHtml += `
                     <div class="instance-item ${isCurrent ? 'current-instance' : ''}" data-character="user" data-instance="${instId}" data-type="user">
                         <div class="instance-id">
                             <span>${instId} ${isCurrent ? ' <span class="current-marker">[CURRENT]</span>' : ''}</span>
                             <div class="instance-actions">
                                 <button class="copy-instance-btn" title="Copy to Clipboard">📋</button>
                                 <button class="delete-instance-btn" title="Delete Instance">🗑️</button>
                             </div>
                         </div>
                         <div class="instance-data">
                             <pre>${JSON.stringify(formattedUserData, null, 2)}</pre>
                         </div>
                     </div>
                `;
            }
        }
        instancesHtml += '</div>';
        container.innerHTML = instancesHtml;
        // Add event listener for search
        const searchInput = container.querySelector('#instance-search');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const instanceItems = container.querySelectorAll('.instance-item');
            instanceItems.forEach(item => {
                var _a, _b, _c, _d, _e, _f;
                const instanceId = (_b = (_a = item.dataset.instance) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '';
                const characterName = (_d = (_c = item.dataset.character) === null || _c === void 0 ? void 0 : _c.toLowerCase()) !== null && _d !== void 0 ? _d : '';
                const instanceData = (_f = (_e = item.querySelector('.instance-data pre').textContent) === null || _e === void 0 ? void 0 : _e.toLowerCase()) !== null && _f !== void 0 ? _f : '';
                if (instanceId.includes(searchTerm) || characterName.includes(searchTerm) || instanceData.includes(searchTerm)) {
                    item.style.display = '';
                }
                else {
                    item.style.display = 'none';
                }
            });
        });
        // Add click handlers to instance items to show details
        const instanceItems = container.querySelectorAll('.instance-item');
        instanceItems.forEach(item => {
            const instanceIdElement = item.querySelector('.instance-id');
            if (instanceIdElement) {
                instanceIdElement.addEventListener('click', (e) => {
                    // Stop propagation to prevent the buttons from triggering this
                    if (e.target.tagName === 'BUTTON') {
                        return;
                    }
                    // Expand or collapse the instance data
                    const dataElement = item.querySelector('.instance-data');
                    if (dataElement.style.display === 'none' || !dataElement.style.display) {
                        dataElement.style.display = 'block';
                    }
                    else {
                        dataElement.style.display = 'none';
                    }
                });
            }
            // Add event listener for copy button
            const copyBtn = item.querySelector('.copy-instance-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dataElement = item.querySelector('.instance-data pre');
                    navigator.clipboard.writeText(dataElement.innerText);
                    toastr.success('Instance data copied to clipboard!', 'Debug Panel');
                });
            }
            // Add event listener for delete button
            const deleteBtn = item.querySelector('.delete-instance-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const instanceId = item.dataset.instance;
                    const instanceType = item.dataset.type;
                    const characterId = item.dataset.character;
                    if (instanceId && instanceType) {
                        if (confirm(`Are you sure you want to delete instance ${instanceId}?`)) {
                            outfitStore.deleteInstance(instanceId, instanceType, characterId !== 'user' ? characterId : undefined);
                            this.renderContent();
                            toastr.success(`Instance ${instanceId} deleted!`, 'Debug Panel');
                        }
                    }
                });
            }
        });
    }
    /**
     * Updates pointers tab with current reference status
     */
    updatePointersTab() {
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'pointers')
            return;
        // Check if content has been rendered
        const pointerInfo = contentArea.querySelector('.pointer-info');
        if (!pointerInfo)
            return;
        const state = outfitStore.getState();
        const references = state.references;
        // Update global references
        let refsHtml = '<h4>Global References</h4>';
        for (const [key, value] of Object.entries(references)) {
            refsHtml += `<div><strong>${key}:</strong> ${value ? 'Available' : 'Not Set'}</div>`;
        }
        // Update global API references
        const globalRefs = [
            { name: 'window.botOutfitPanel', exists: Boolean(window.botOutfitPanel) },
            { name: 'window.userOutfitPanel', exists: Boolean(window.userOutfitPanel) },
            { name: 'window.outfitTracker', exists: Boolean(window.outfitTracker) },
            { name: 'window.outfitTrackerInterceptor', exists: Boolean(window.outfitTrackerInterceptor) },
            { name: 'window.getOutfitExtensionStatus', exists: Boolean(window.getOutfitExtensionStatus) },
            { name: 'outfitStore', exists: Boolean(outfitStore) },
            { name: 'customMacroSystem', exists: Boolean(customMacroSystem) },
        ];
        refsHtml += '<h5>Extension API References:</h5>';
        refsHtml += '<table class="pointer-values-table">';
        refsHtml += '<tr><th>Reference</th><th>Status</th></tr>';
        for (const ref of globalRefs) {
            refsHtml += `<tr><td>${ref.name}</td><td>${ref.exists ? 'Available' : 'Not Available'}</td></tr>`;
        }
        refsHtml += '</table>';
        pointerInfo.innerHTML = refsHtml;
    }
    /**
     * Renders the 'Pointers' tab
     */
    renderPointersTab(container) {
        const state = outfitStore.getState();
        const references = state.references;
        let pointersHtml = '<div class="debug-pointers-list">';
        pointersHtml += '<h4>Global References</h4>';
        pointersHtml += '<div class="pointer-info">';
        // Show available references
        for (const [key, value] of Object.entries(references)) {
            pointersHtml += `<div><strong>${key}:</strong> ${value ? 'Available' : 'Not Set'}</div>`;
        }
        // Show global API references
        pointersHtml += '<h5>Extension API References:</h5>';
        pointersHtml += '<table class="pointer-values-table">';
        pointersHtml += '<tr><th>Reference</th><th>Status</th></tr>';
        // Check various global references
        const globalRefs = [
            { name: 'window.botOutfitPanel', exists: Boolean(window.botOutfitPanel) },
            { name: 'window.userOutfitPanel', exists: Boolean(window.userOutfitPanel) },
            { name: 'window.outfitTracker', exists: Boolean(window.outfitTracker) },
            { name: 'window.outfitTrackerInterceptor', exists: Boolean(window.outfitTrackerInterceptor) },
            { name: 'window.getOutfitExtensionStatus', exists: Boolean(window.getOutfitExtensionStatus) },
            { name: 'outfitStore', exists: Boolean(outfitStore) },
            { name: 'customMacroSystem', exists: Boolean(customMacroSystem) },
        ];
        for (const ref of globalRefs) {
            pointersHtml += `<tr><td>${ref.name}</td><td>${ref.exists ? 'Available' : 'Not Available'}</td></tr>`;
        }
        pointersHtml += '</table>';
        pointersHtml += '</div></div>';
        container.innerHTML = pointersHtml;
    }
    /**
     * Renders the 'Performance' tab with performance metrics
     */
    renderPerformanceTab(container) {
        const state = outfitStore.getState();
        // Calculate performance metrics
        const botInstanceCount = Object.keys(state.botInstances).reduce((total, charId) => {
            return total + Object.keys(state.botInstances[charId]).length;
        }, 0);
        const userInstanceCount = Object.keys(state.userInstances).length;
        // Estimate storage size
        const stateStr = JSON.stringify(state);
        const estimatedStorageSize = `${(new Blob([stateStr]).size / 1024).toFixed(2)} KB`;
        let performanceHtml = '<div class="debug-performance-content">';
        performanceHtml += '<h4>Performance Metrics</h4>';
        performanceHtml += '<div class="performance-info">';
        // General metrics
        performanceHtml += `<div><strong>Total Bot Instances:</strong> ${botInstanceCount}</div>`;
        performanceHtml += `<div><strong>Total User Instances:</strong> ${userInstanceCount}</div>`;
        performanceHtml += `<div><strong>Total Outfit Slots:</strong> ${(botInstanceCount + userInstanceCount) * 19}</div>`;
        performanceHtml += `<div><strong>Estimated Storage Size:</strong> ${estimatedStorageSize}</div>`;
        // Macro performance
        performanceHtml += '<h5>Macro System Performance:</h5>';
        performanceHtml += `<div><strong>Current Cache Size:</strong> ${customMacroSystem.macroValueCache.size} items</div>`;
        // Performance indicators
        performanceHtml += '<h5>Performance Indicators:</h5>';
        performanceHtml += '<div class="performance-indicators">';
        // Check for potentially large data
        if (botInstanceCount > 50) {
            performanceHtml += '<div class="warning">⚠️ High number of bot instances detected - may impact performance</div>';
        }
        else if (botInstanceCount > 20) {
            performanceHtml += '<div class="info">ℹ️ Moderate number of bot instances</div>';
        }
        else {
            performanceHtml += '<div class="good">✅ Low number of bot instances</div>';
        }
        if (userInstanceCount > 10) {
            performanceHtml += '<div class="warning">⚠️ High number of user instances detected - may impact performance</div>';
        }
        else {
            performanceHtml += '<div class="good">✅ Reasonable number of user instances</div>';
        }
        const storageKB = new Blob([stateStr]).size / 1024;
        if (storageKB > 1000) { // More than 1MB
            performanceHtml += '<div class="warning">⚠️ Large storage size detected - consider cleanup</div>';
        }
        else if (storageKB > 500) { // More than 500KB
            performanceHtml += '<div class="info">ℹ️ Moderate storage size</div>';
        }
        else {
            performanceHtml += '<div class="good">✅ Reasonable storage size</div>';
        }
        performanceHtml += '</div>';
        // Add performance testing section
        performanceHtml += '<h5>Performance Testing:</h5>';
        performanceHtml += '<div class="performance-testing">';
        performanceHtml += '<button id="debug-run-performance-test" class="menu_button">Run Performance Test</button>';
        performanceHtml += '<div id="performance-test-results"></div>';
        performanceHtml += '</div>';
        performanceHtml += '</div></div>';
        container.innerHTML = performanceHtml;
        // Add event listener for performance testing
        setTimeout(() => {
            var _a;
            (_a = document.getElementById('debug-run-performance-test')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                this.runPerformanceTest();
            });
        }, 100);
    }
    /**
     * Runs performance tests and displays results
     */
    runPerformanceTest() {
        const resultsDiv = document.getElementById('performance-test-results');
        if (!resultsDiv) {
            return;
        }
        resultsDiv.innerHTML = '<p>Running performance tests...</p>';
        // Test macro resolution performance
        const startTime = performance.now();
        // Perform several macro resolutions to test performance
        for (let i = 0; i < 100; i++) {
            // Try to resolve a common macro pattern using the correct method
            customMacroSystem.getCurrentSlotValue('char', 'headwear');
            customMacroSystem.getCurrentSlotValue('user', 'topwear');
        }
        const endTime = performance.now();
        const macroTestTime = endTime - startTime;
        // Test store access performance
        const storeStartTime = performance.now();
        for (let i = 0; i < 1000; i++) {
            outfitStore.getState();
        }
        const storeEndTime = performance.now();
        const storeTestTime = storeEndTime - storeStartTime;
        // Display results
        resultsDiv.innerHTML = `
            <h6>Test Results:</h6>
            <ul>
                <li>Macro resolution test (100 iterations): ${macroTestTime.toFixed(2)}ms</li>
                <li>Store access test (1000 iterations): ${storeTestTime.toFixed(2)}ms</li>
                <li>Avg macro resolution: ${(macroTestTime / 100).toFixed(4)}ms</li>
                <li>Avg store access: ${(storeTestTime / 1000).toFixed(4)}ms</li>
            </ul>
        `;
    }
    /**
     * Updates performance tab with current metrics
     */
    updatePerformanceTab() {
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'performance')
            return;
        // Check if content has been rendered
        const perfInfo = contentArea.querySelector('.performance-info');
        if (!perfInfo)
            return;
        const state = outfitStore.getState();
        // Calculate performance metrics
        const botInstanceCount = Object.keys(state.botInstances).reduce((total, charId) => {
            return total + Object.keys(state.botInstances[charId]).length;
        }, 0);
        const userInstanceCount = Object.keys(state.userInstances).length;
        const stateStr = JSON.stringify(state);
        const estimatedStorageSize = `${(new Blob([stateStr]).size / 1024).toFixed(2)} KB`;
        const updateTime = new Date().toLocaleTimeString();
        // Update performance info
        let infoHtml = `<div><strong>Total Bot Instances:</strong> ${botInstanceCount}</div>`;
        infoHtml += `<div><strong>Total User Instances:</strong> ${userInstanceCount}</div>`;
        infoHtml += `<div><strong>Total Outfit Slots:</strong> ${(botInstanceCount + userInstanceCount) * 19}</div>`;
        infoHtml += `<div><strong>Estimated Storage Size:</strong> ${estimatedStorageSize}</div>`;
        infoHtml += `<div><strong>Current Cache Size:</strong> ${customMacroSystem.macroValueCache.size} items</div>`;
        infoHtml += `<div><small>Last updated: ${updateTime}</small></div>`;
        // Update performance indicators
        infoHtml += '<h5>Performance Indicators:</h5>';
        infoHtml += '<div class="performance-indicators">';
        if (botInstanceCount > 50) {
            infoHtml += '<div class="warning">⚠️ High number of bot instances detected</div>';
        }
        else if (botInstanceCount > 20) {
            infoHtml += '<div class="info">ℹ️ Moderate number of bot instances</div>';
        }
        else {
            infoHtml += '<div class="good">✅ Low number of bot instances</div>';
        }
        if (userInstanceCount > 10) {
            infoHtml += '<div class="warning">⚠️ High number of user instances detected</div>';
        }
        else {
            infoHtml += '<div class="good">✅ Reasonable number of user instances</div>';
        }
        const storageKB = new Blob([stateStr]).size / 1024;
        if (storageKB > 1000) {
            infoHtml += '<div class="warning">⚠️ Large storage size detected</div>';
        }
        else if (storageKB > 500) {
            infoHtml += '<div class="info">ℹ️ Moderate storage size</div>';
        }
        else {
            infoHtml += '<div class="good">✅ Reasonable storage size</div>';
        }
        infoHtml += '</div>';
        perfInfo.innerHTML = infoHtml;
    }
    /**
     * Updates state tab with current store state
     */
    updateStateTab() {
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'state')
            return;
        // Check if content has been rendered
        const stateInfo = contentArea.querySelector('.state-info');
        if (!stateInfo)
            return;
        const state = outfitStore.getState();
        const preElement = stateInfo.querySelector('pre');
        if (preElement) {
            preElement.textContent = JSON.stringify(state, null, 2);
        }
    }
    /**
     * Updates misc tab with current information
     */
    updateMiscTab() {
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'misc')
            return;
        // Check if content has been rendered
        const storeInfo = contentArea.querySelector('.store-info');
        if (!storeInfo)
            return;
        const state = outfitStore.getState();
        const currentCharName = state.currentCharacterId ? getCharacterInfoById(state.currentCharacterId, CharacterInfoType.Name) : 'None';
        let infoHtml = `<div><strong>Current Character:</strong> ${currentCharName}</div>`;
        infoHtml += `<div><strong>Current Chat ID:</strong> ${state.currentChatId || 'None'}</div>`;
        infoHtml += `<div><strong>Current Outfit Instance ID:</strong> ${state.currentOutfitInstanceId || 'None'}</div>`;
        infoHtml += `<div><strong>Bot Panels Visible:</strong> ${state.panelVisibility.bot ? 'Yes' : 'No'}</div>`;
        infoHtml += `<div><strong>User Panels Visible:</strong> ${state.panelVisibility.user ? 'Yes' : 'No'}</div>`;
        infoHtml += '<h5>Settings:</h5>';
        infoHtml += '<pre>' + JSON.stringify(state.settings, null, 2) + '</pre>';
        storeInfo.innerHTML = infoHtml;
    }
    /**
     * Gets CSS class for event type
     */
    getEventClass(eventType) {
        const classMap = {
            'outfit-tracker-context-updated': 'event-context',
            'outfit-tracker-outfit-changed': 'event-outfit',
            'outfit-tracker-preset-loaded': 'event-preset',
            'outfit-tracker-panel-visibility-changed': 'event-panel',
            'outfit-tracker-chat-cleared': 'event-chat',
            'outfit-tracker-data-loaded': 'event-data'
        };
        return classMap[eventType] || 'event-generic';
    }
    /**
     * Renders the 'State' tab with the current store state
     */
    renderStateTab(container) {
        const state = outfitStore.getState();
        let stateHtml = '<div class="debug-state-content">';
        stateHtml += '<h4>Current Store State</h4>';
        stateHtml += '<button id="copy-state-btn" class="menu_button">Copy to Clipboard</button>';
        stateHtml += '<div class="state-info">';
        stateHtml += '<pre>' + JSON.stringify(state, null, 2) + '</pre>';
        stateHtml += '</div>';
        stateHtml += '</div>';
        container.innerHTML = stateHtml;
        setTimeout(() => {
            var _a;
            (_a = document.getElementById('copy-state-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                navigator.clipboard.writeText(JSON.stringify(state, null, 2));
                toastr.success('State copied to clipboard!', 'Debug Panel');
            });
        }, 100);
    }
    /**
     * Renders the 'Misc' tab for other functions
     */
    renderMiscTab(container) {
        const state = outfitStore.getState();
        let miscHtml = '<div class="debug-misc-content">';
        miscHtml += '<h4>Store State Information</h4>';
        miscHtml += '<div class="store-info">';
        // Show key store properties
        const currentCharName = state.currentCharacterId ? getCharacterInfoById(state.currentCharacterId, CharacterInfoType.Name) : 'None';
        miscHtml += `<div><strong>Current Character:</strong> ${currentCharName}</div>`;
        miscHtml += `<div><strong>Current Chat ID:</strong> ${state.currentChatId || 'None'}</div>`;
        miscHtml += `<div><strong>Current Outfit Instance ID:</strong> ${state.currentOutfitInstanceId || 'None'}</div>`;
        miscHtml += `<div><strong>Bot Panels Visible:</strong> ${state.panelVisibility.bot ? 'Yes' : 'No'}</div>`;
        miscHtml += `<div><strong>User Panels Visible:</strong> ${state.panelVisibility.user ? 'Yes' : 'No'}</div>`;
        miscHtml += '<h5>Settings:</h5>';
        miscHtml += '<pre>' + JSON.stringify(state.settings, null, 2) + '</pre>';
        miscHtml += '</div>';
        // Add buttons for various debug functions
        miscHtml += '<h4>Debug Functions</h4>';
        miscHtml += '<div class="debug-functions">';
        miscHtml += '<button id="debug-refresh-store" class="menu_button">Refresh Store State</button>';
        miscHtml += '<button id="debug-clear-cache" class="menu_button">Clear Macro Cache</button>';
        miscHtml += '<button id="debug-wipe-all" class="menu_button danger-button">WIPE ALL DATA</button>';
        miscHtml += '<button id="debug-export-data" class="menu_button">Export All Data</button>';
        miscHtml += '<button id="debug-import-data" class="menu_button">Import Data</button>';
        miscHtml += '<input type="file" id="debug-import-file" style="display: none;" accept=".json">';
        miscHtml += '</div>';
        // Add event listeners for debug functions
        container.innerHTML = miscHtml;
        // Add button event listeners after content is inserted
        setTimeout(() => {
            var _a, _b, _c, _d, _e, _f;
            (_a = document.getElementById('debug-refresh-store')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                // Re-render to show updated store state
                this.renderContent();
            });
            (_b = document.getElementById('debug-clear-cache')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
                customMacroSystem.clearCache();
                toastr.success('Macro cache cleared!', 'Debug Panel');
                this.renderContent();
            });
            (_c = document.getElementById('debug-wipe-all')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
                if (confirm('Are you sure you want to wipe all outfit data? This cannot be undone.')) {
                    if (window.wipeAllOutfits) {
                        window.wipeAllOutfits();
                        this.renderContent();
                    }
                }
            });
            (_d = document.getElementById('debug-export-data')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
                this.exportOutfitData();
            });
            (_e = document.getElementById('debug-import-data')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => {
                var _a;
                (_a = document.getElementById('debug-import-file')) === null || _a === void 0 ? void 0 : _a.click();
            });
            (_f = document.getElementById('debug-import-file')) === null || _f === void 0 ? void 0 : _f.addEventListener('change', (e) => {
                var _a;
                this.importOutfitData((_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]);
            });
        }, 100);
    }
    /**
     * Export all outfit data to a JSON file
     */
    exportOutfitData() {
        try {
            const state = outfitStore.getState();
            const dataStr = JSON.stringify(state, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `outfit-data-export-${new Date().toISOString().slice(0, 19)}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            toastr.success('Outfit data exported!', 'Debug Panel');
        }
        catch (error) {
            debugLogger.log('Error exporting outfit data:', error, 'error');
            toastr.error('Error exporting outfit data', 'Debug Panel');
        }
    }
    /**
     * Import outfit data from a JSON file
     */
    importOutfitData(file) {
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            var _a;
            try {
                const data = JSON.parse((_a = e.target) === null || _a === void 0 ? void 0 : _a.result);
                if (confirm('Are you sure you want to import this outfit data? This will replace all current data.')) {
                    // Update store state with imported data
                    outfitStore.setState(data);
                    outfitStore.saveState(); // Save to storage
                    this.renderContent();
                    toastr.success('Outfit data imported!', 'Debug Panel');
                }
            }
            catch (error) {
                debugLogger.log('Error importing outfit data:', error, 'error');
                toastr.error('Error importing outfit data. Check console for details.', 'Debug Panel');
            }
        };
        reader.readAsText(file);
    }
    /**
     * Toggles the visibility of the debug panel
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        }
        else {
            this.show();
        }
    }
    /**
     * Gets icon for event type
     */
    getEventIcon(eventType) {
        const iconMap = {
            'outfit-tracker-context-updated': '🔄',
            'outfit-tracker-outfit-changed': '👔',
            'outfit-tracker-preset-loaded': '📁',
            'outfit-tracker-panel-visibility-changed': '👁️',
            'outfit-tracker-chat-cleared': '🗑️',
            'outfit-tracker-data-loaded': '💾'
        };
        return iconMap[eventType] || '📡';
    }
    /**
     * Sets up event listeners for the events tab
     */
    setupEventListeners(container) {
        let isPaused = false;
        // Search functionality
        const searchInput = container.querySelector('#event-search');
        const typeFilter = container.querySelector('#event-type-filter');
        const pauseBtn = container.querySelector('#pause-events-btn');
        const clearBtn = container.querySelector('#clear-events-btn');
        const exportBtn = container.querySelector('#export-events-btn');
        const totalCount = container.querySelector('.events-count');
        const filteredCount = container.querySelector('.events-filtered-count');
        const filterEvents = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const selectedType = typeFilter.value;
            const eventItems = container.querySelectorAll('.event-item');
            let visibleCount = 0;
            eventItems.forEach(item => {
                var _a, _b, _c, _d;
                const eventType = item.dataset.eventType || '';
                const eventName = ((_b = (_a = item.querySelector('.event-name')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
                const eventData = ((_d = (_c = item.querySelector('.event-details pre')) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.toLowerCase()) || '';
                const typeMatch = selectedType === 'all' || eventType === selectedType;
                const searchMatch = searchTerm === '' ||
                    eventName.includes(searchTerm) ||
                    eventData.includes(searchTerm);
                if (typeMatch && searchMatch) {
                    item.style.display = '';
                    visibleCount++;
                }
                else {
                    item.style.display = 'none';
                }
            });
            // Update filtered count
            if (searchTerm || selectedType !== 'all') {
                filteredCount.style.display = 'inline';
                filteredCount.textContent = `Filtered: ${visibleCount}`;
            }
            else {
                filteredCount.style.display = 'none';
            }
        };
        searchInput.addEventListener('input', filterEvents);
        typeFilter.addEventListener('change', filterEvents);
        // Pause/Resume functionality
        pauseBtn.addEventListener('click', () => {
            this.isEventRecordingPaused = !this.isEventRecordingPaused;
            isPaused = this.isEventRecordingPaused;
            pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
            pauseBtn.classList.toggle('paused', isPaused);
            if (isPaused) {
                toastr.info('Event recording paused', 'Debug Panel');
            }
            else {
                toastr.info('Event recording resumed', 'Debug Panel');
            }
        });
        // Export events
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportEvents();
            });
        }
        // Clear events
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all events?')) {
                this.recordedEvents = [];
                this.renderContent();
                toastr.success('Event log cleared!', 'Debug Panel');
            }
        });
        // Event item interactions
        const eventItems = container.querySelectorAll('.event-item');
        eventItems.forEach(item => {
            const toggleBtn = item.querySelector('.event-toggle-btn');
            const details = item.querySelector('.event-details');
            if (toggleBtn && details) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isVisible = details.style.display !== 'none';
                    details.style.display = isVisible ? 'none' : 'block';
                    toggleBtn.textContent = isVisible ? '▼' : '▲';
                });
            }
            // Copy event data button
            const copyBtn = item.querySelector('.copy-event-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dataElement = item.querySelector('.event-details pre');
                    if (dataElement) {
                        navigator.clipboard.writeText(dataElement.textContent || '');
                        toastr.success('Event data copied to clipboard!', 'Debug Panel');
                    }
                });
            }
            // Click to expand/collapse
            item.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON')
                    return;
                const details = item.querySelector('.event-details');
                const toggleBtn = item.querySelector('.event-toggle-btn');
                if (details) {
                    const isVisible = details.style.display !== 'none';
                    details.style.display = isVisible ? 'none' : 'block';
                    if (toggleBtn) {
                        toggleBtn.textContent = isVisible ? '▼' : '▲';
                    }
                }
            });
        });
    }
}
