import {dragElementWithSave, resizeElement} from '../common/shared';
import {outfitStore} from '../stores/Store';
import {customMacroSystem} from '../services/CustomMacroService';
import {debugLog, debugLogger} from '../logging/DebugLogger';
import {CharacterInfoType, getCharacterInfoById} from '../utils/CharacterUtils';
import {immediateStore} from '../stores/DebouncedStore';
import {DataManager} from '../managers/DataManager';

interface OutfitData {
    [key: string]: string;
}

interface BotOutfit {
    timestamp: string;
    characterName: string;
    characterId: string;
    instanceId: string;
    outfit: OutfitData;
}

interface UserOutfit {
    timestamp: string;
    instanceId: string;
    outfit: OutfitData;
}

declare const toastr: any;
declare const $: any;

export class DebugPanel {
    private isVisible: boolean = false;
    private domElement: HTMLElement | null = null;
    private currentTab: string = 'instances';
    private eventListeners: any[] = [];
    private storeSubscription: (() => void) | null = null;
    private previousInstanceId: string | null = null;
    private dataManager: DataManager | null = null;

    constructor(dataManager?: DataManager) {
        if (dataManager) {
            this.dataManager = dataManager;
        }
    }

    /**
     * Renders the 'Instances' tab with instance browser functionality
     */
    renderInstancesTab(container: HTMLElement): void {
        const state = this.getState();
        const botInstances = this.getInstanceData().botInstances;
        const userInstances = this.getInstanceData().userInstances;

        let instancesHtml = '<div class="debug-instances-list">';

        // Add search input
        instancesHtml += '<div class="instance-search-container"><input type="text" id="instance-search" placeholder="Search instances..."></div>';

        // Add bot instances
        instancesHtml += '<h4>Bot Instances</h4>';
        if (Object.keys(botInstances).length === 0) {
            instancesHtml += '<p class="no-instances">No bot instances found</p>';
        } else {
            for (const [charId, charData] of Object.entries(botInstances)) {
                const charName = getCharacterInfoById(charId, CharacterInfoType.Name);

                instancesHtml += `<h5>Character: ${charName} (${charId})</h5>`;
                for (const [instId, instData] of Object.entries(charData as any)) {
                    const currentInstanceId = state.currentOutfitInstanceId;
                    const isCurrent = instId === currentInstanceId;

                    // Format bot instance data for better readability
                    const formattedBotData: BotOutfit = {
                        timestamp: (instData as any).timestamp || 'No timestamp',
                        characterName: charName,
                        characterId: charId,
                        instanceId: instId,
                        outfit: (instData as any).bot
                    };

                    instancesHtml += `
                    <div class="instance-item ${isCurrent ? 'current-instance' : ''}" data-character="${charName}" data-instance="${instId}">
                        <div class="instance-id">${instId} ${isCurrent ? ' <span class="current-marker">[CURRENT]</span>' : ''}</div>
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
        } else {
            for (const [instId, instData] of Object.entries(userInstances as any)) {
                const currentInstanceId = state.currentOutfitInstanceId;
                const isCurrent = instId === currentInstanceId;

                // Format user instance data for better readability
                const formattedUserData: UserOutfit = {
                    timestamp: (instData as any).timestamp || 'No timestamp',
                    instanceId: instId,
                    outfit: instData as any
                };

                instancesHtml += `
                    <div class="instance-item ${isCurrent ? 'current-instance' : ''}" data-character="user" data-instance="${instId}">
                        <div class="instance-id">${instId} ${isCurrent ? ' <span class="current-marker">[CURRENT]</span>' : ''}</div>
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
        const searchInput = container.querySelector('#instance-search') as HTMLInputElement;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
            const instanceItems = container.querySelectorAll('.instance-item');

            instanceItems.forEach(item => {
                const instanceId = (item as HTMLElement).dataset.instance?.toLowerCase() ?? '';
                const characterName = (item as HTMLElement).dataset.character?.toLowerCase() ?? '';
                const instanceData = (item.querySelector('.instance-data pre') as HTMLElement).textContent?.toLowerCase() ?? '';

                if (instanceId.includes(searchTerm) || characterName.includes(searchTerm) || instanceData.includes(searchTerm)) {
                    (item as HTMLElement).style.display = '';
                } else {
                    (item as HTMLElement).style.display = 'none';
                }
            });
        });

        // Add click handlers to instance items to show details
        const instanceItems = container.querySelectorAll('.instance-item');

        instanceItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Expand or collapse the instance data
                const dataElement = (e.currentTarget as HTMLElement).querySelector('.instance-data') as HTMLElement;

                if (dataElement.style.display === 'none' || !dataElement.style.display) {
                    dataElement.style.display = 'block';
                } else {
                    dataElement.style.display = 'none';
                }
            });
        });
    }

    /**
     * Renders the 'Macros' tab to showcase current instances and derivations
     */
    renderMacrosTab(container: HTMLElement): void {
        const state = this.getState();
        const botInstances = this.getInstanceData().botInstances;
        const userInstances = this.getInstanceData().userInstances;

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

            for (const [slot, value] of Object.entries(userOutfitData as any)) {
                macrosHtml += `<tr><td>{{user_${slot}}}</td><td>${value}</td><td>User Outfit Data</td></tr>`;
            }
        }

        macrosHtml += '</table>';

        // Show macro cache information
        macrosHtml += '<h5>Macro Cache Info:</h5>';
        macrosHtml += `<div>Cached entries: ${customMacroSystem.macroValueCache.size}</div>`;

        macrosHtml += '<table class="macro-cache-table">';
        macrosHtml += '<tr><th>Cache Key</th><th>Value</th><th>Timestamp</th></tr>';

        for (const [key, entry] of customMacroSystem.macroValueCache.entries()) {
            const timestamp = new Date(entry.timestamp).toISOString();

            macrosHtml += `<tr><td>${key}</td><td>${entry.value}</td><td>${timestamp}</td></tr>`;
        }

        macrosHtml += '</table>';

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
            document.getElementById('macro-test-btn')?.addEventListener('click', async () => {
                const input = (document.getElementById('macro-test-input') as HTMLTextAreaElement).value;
                const output = await customMacroSystem.replaceMacrosInText(input);

                (document.getElementById('macro-test-output') as HTMLElement).innerText = output;
            });
        }, 100);
    }

    /**
     * Creates the debug panel DOM element and sets up its basic functionality
     * @returns {HTMLElement} The created panel element
     */
    createPanel(): HTMLElement {
        if (this.domElement) {
            return this.domElement;
        }

        const panel = document.createElement('div');

        panel.id = 'outfit-debug-panel';
        panel.className = 'outfit-debug-panel';

        panel.innerHTML = `
            <div class="outfit-debug-header">
                <h3>Outfit Debug Panel</h3>
                <div class="outfit-debug-actions">
                    <span class="outfit-debug-action" id="outfit-debug-close">×</span>
                </div>
            </div>
            <div class="outfit-debug-tabs">
                <button class="outfit-debug-tab ${this.currentTab === 'instances' ? 'active' : ''}" data-tab="instances">Instances</button>
                <button class="outfit-debug-tab ${this.currentTab === 'macros' ? 'active' : ''}" data-tab="macros">Macros</button>
                <button class="outfit-debug-tab ${this.currentTab === 'pointers' ? 'active' : ''}" data-tab="pointers">Pointers</button>
                <button class="outfit-debug-tab ${this.currentTab === 'performance' ? 'active' : ''}" data-tab="performance">Performance</button>
                <button class="outfit-debug-tab ${this.currentTab === 'logs' ? 'active' : ''}" data-tab="logs">Logs</button>
                <button class="outfit-debug-tab ${this.currentTab === 'misc' ? 'active' : ''}" data-tab="misc">Misc</button>
            </div>
            <div class="outfit-debug-content" id="outfit-debug-tab-content"></div>
        `;

        document.body.appendChild(panel);

        // Set up tab switching
        const tabs = panel.querySelectorAll('.outfit-debug-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                const tabName = (event.target as HTMLElement).dataset.tab;

                if (tabName == null) return;

                this.currentTab = tabName;
                this.renderContent();

                tabs.forEach(t => t.classList.remove('active'));
                (event.target as HTMLElement).classList.add('active');
            });
        });

        return panel;
    }

    /**
     * Renders the content of the currently selected tab
     */
    renderContent(): void {
        if (!this.domElement) {
            return;
        }

        const contentArea = this.domElement.querySelector('.outfit-debug-content');

        if (!contentArea) {
            return;
        }

        contentArea.innerHTML = '';
        contentArea.setAttribute('data-tab', this.currentTab);

        const tabRenderers: { [key: string]: (container: HTMLElement) => void } = {
            instances: this.renderInstancesTab.bind(this),
            macros: this.renderMacrosTab.bind(this),
            pointers: this.renderPointersTab.bind(this),
            performance: this.renderPerformanceTab.bind(this),
            logs: this.renderLogsTab.bind(this),
            misc: this.renderMiscTab.bind(this),
        };

        const renderer = tabRenderers[this.currentTab];

        if (renderer) {
            renderer(contentArea as HTMLElement);
        }
    }

    /**
     * Renders the 'Logs' tab with logs from the DebugLogger
     */
    renderLogsTab(container: HTMLElement): void {
        const logs = debugLogger.getLogs();

        let logsHtml = '<div class="debug-logs-list">';

        if (logs.length === 0) {
            logsHtml += '<p>No logs available.</p>';
        } else {
            logsHtml += logs.map(log => {
                // Check if log.data is not null or not empty
                const hasData = log.data !== null && log.data !== undefined &&
                    ((typeof log.data === 'object' && Object.keys(log.data).length > 0) ||
                        (typeof log.data === 'string' && log.data.length > 0));

                return `
                    <div class="log-item log-${log.level.toLowerCase()}">
                        <div class="log-header" ${hasData ? 'style="cursor: pointer;"' : ''}>
                            <span class="log-timestamp">${new Date(log.timestamp).toISOString()}</span>
                            <span class="log-level">[${log.level}]</span>
                            <span class="log-message">${log.message}</span>
                            ${hasData ? '<span class="log-expand">[+]</span>' : ''}
                        </div>
                        ${hasData ? `
                            <div class="log-data" style="display: none;">
                                <pre>${JSON.stringify(log.data, null, 2)}</pre>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }

        logsHtml += '</div>';

        container.innerHTML = logsHtml;

        // Add click handlers for logs that have data
        container.querySelectorAll('.log-header').forEach(header => {
            const hasData = header.nextElementSibling && header.nextElementSibling.classList.contains('log-data');

            if (hasData) {
                header.addEventListener('click', () => {
                    const dataElement = header.nextElementSibling as HTMLElement;
                    const expandElement = header.querySelector('.log-expand') as HTMLElement;

                    if (dataElement.style.display === 'none') {
                        dataElement.style.display = 'block';
                        expandElement.textContent = '[-]';
                    } else {
                        dataElement.style.display = 'none';
                        expandElement.textContent = '[+]';
                    }
                });
            }
        });
    }

    /**
     * Renders the 'Pointers' tab
     */
    renderPointersTab(container: HTMLElement): void {
        const state = this.getState();
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
            {name: 'window.botOutfitPanel', exists: Boolean((window as any).botOutfitPanel)},
            {name: 'window.userOutfitPanel', exists: Boolean((window as any).userOutfitPanel)},
            {name: 'window.outfitTracker', exists: Boolean((window as any).outfitTracker)},
            {name: 'window.outfitTrackerInterceptor', exists: Boolean((window as any).outfitTrackerInterceptor)},
            {name: 'window.getOutfitExtensionStatus', exists: Boolean((window as any).getOutfitExtensionStatus)},
            {name: 'outfitStore', exists: Boolean(outfitStore)},
            {name: 'customMacroSystem', exists: Boolean(customMacroSystem)},
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
    renderPerformanceTab(container: HTMLElement): void {
        const state = this.getState();
        const instanceData = this.getInstanceData();

        // Calculate performance metrics
        const botInstanceCount = Object.keys(instanceData.botInstances).reduce((total, charId) => {
            return total + Object.keys(instanceData.botInstances[charId]).length;
        }, 0);

        const userInstanceCount = Object.keys(instanceData.userInstances).length;

        // Estimate storage size using the full state data for consistency
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
        } else if (botInstanceCount > 20) {
            performanceHtml += '<div class="info">ℹ️ Moderate number of bot instances</div>';
        } else {
            performanceHtml += '<div class="good">✅ Low number of bot instances</div>';
        }

        if (userInstanceCount > 10) {
            performanceHtml += '<div class="warning">⚠️ High number of user instances detected - may impact performance</div>';
        } else {
            performanceHtml += '<div class="good">✅ Reasonable number of user instances</div>';
        }

        const storageKB = new Blob([stateStr]).size / 1024;

        if (storageKB > 1000) { // More than 1MB
            performanceHtml += '<div class="warning">⚠️ Large storage size detected - consider cleanup</div>';
        } else if (storageKB > 500) { // More than 500KB
            performanceHtml += '<div class="info">ℹ️ Moderate storage size</div>';
        } else {
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
            document.getElementById('debug-run-performance-test')?.addEventListener('click', () => {
                this.runPerformanceTest();
            });
        }, 100);
    }

    /**
     * Renders the 'Misc' tab for other functions
     */
    renderMiscTab(container: HTMLElement): void {
        const state = this.getState();

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
            document.getElementById('debug-refresh-store')?.addEventListener('click', () => {
                // Re-render to show updated store state
                this.renderContent();
            });

            document.getElementById('debug-clear-cache')?.addEventListener('click', () => {
                customMacroSystem.clearCache();
                toastr.success('Macro cache cleared!', 'Debug Panel');
                this.renderContent();
            });

            document.getElementById('debug-wipe-all')?.addEventListener('click', () => {
                if (confirm('Are you sure you want to wipe all outfit data? This cannot be undone.')) {
                    if ((window as any).wipeAllOutfits) {
                        (window as any).wipeAllOutfits();
                        this.renderContent();
                    }
                }
            });

            document.getElementById('debug-export-data')?.addEventListener('click', () => {
                this.exportOutfitData();
            });

            document.getElementById('debug-import-data')?.addEventListener('click', () => {
                document.getElementById('debug-import-file')?.click();
            });

            document.getElementById('debug-import-file')?.addEventListener('change', (e) => {
                this.importOutfitData((e.target as HTMLInputElement).files?.[0]);
            });
        }, 100);
    }

    /**
     * Shows the debug panel UI
     */
    show(): void {
        // Check if debug mode is enabled
        const state = this.getState();

        if (!state.settings.debugMode) {
            debugLog('Debug mode is disabled. Not showing debug panel.', null, 'log');
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
            });
        }

        if (this.domElement) {
            dragElementWithSave(this.domElement, 'outfit-debug-panel');
            // Initialize resizing with appropriate min/max dimensions
            setTimeout(() => {
                resizeElement($(this.domElement), 'outfit-debug-panel');
            }, 10); // Small delay to ensure panel is rendered first

            this.domElement.querySelector('#outfit-debug-close')?.addEventListener('click', () => this.hide());
        }
    }

    /**
     * Runs performance tests and displays results
     */
    runPerformanceTest(): void {
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
     * Gets instance data from the new data system (DataManager) if available, otherwise falls back to the store
     * @returns {{botInstances: any, userInstances: any}} The instance data
     */
    private getInstanceData(): { botInstances: any, userInstances: any } {
        // If DataManager is available, use data from there
        if (this.dataManager) {
            const data = this.dataManager.loadOutfitData();
            return {
                botInstances: data.botInstances || {},
                userInstances: data.userInstances || {}
            };
        } else {
            // Fallback to outfit store data
            const state = outfitStore.getState();
            return {
                botInstances: state.botInstances || {},
                userInstances: state.userInstances || {}
            };
        }
    }

    /**
     * Export all outfit data to a JSON file
     */
    exportOutfitData(): void {
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
        } catch (error) {
            debugLog('Error exporting outfit data', error, 'error');
            toastr.error('Error exporting outfit data', 'Debug Panel');
        }
    }

    /**
     * Import outfit data from a JSON file
     */
    importOutfitData(file?: File): void {
        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);

                if (confirm('Are you sure you want to import this outfit data? This will replace all current data.')) {
                    // Update store state with imported data
                    outfitStore.setState(data);
                    immediateStore.saveState(); // Save to storage
                    this.renderContent();
                    toastr.success('Outfit data imported!', 'Debug Panel');
                }
            } catch (error) {
                debugLog('Error importing outfit data', error, 'error');
                toastr.error('Error importing outfit data. Check console for details.', 'Debug Panel');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Toggles the visibility of the debug panel
     */
    toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Gets the complete state, prioritizing DataManager if available
     * @returns The complete state object
     */
    private getState(): any {
        if (this.dataManager) {
            // When DataManager is available, use the combined data from both sources
            // but ensure instance data comes from DataManager for consistency
            const data = this.dataManager.load();
            const storeState = outfitStore.getState();

            // Construct a unified state that prioritizes DataManager for instance data
            // but gets other properties from the store state
            return {
                ...storeState, // Get all other properties from the store state
                ...data, // Override with DataManager data
                // Explicitly ensure instance data comes from the proper source
                botInstances: this.getInstanceData().botInstances,
                userInstances: this.getInstanceData().userInstances,
                // Also ensure current instance ID comes from store state (most accurate)
                currentOutfitInstanceId: storeState.currentOutfitInstanceId,
                currentCharacterId: storeState.currentCharacterId,
                currentChatId: storeState.currentChatId,
                settings: data.settings || storeState.settings,
                panelVisibility: storeState.panelVisibility,
                references: storeState.references
            };
        } else {
            return outfitStore.getState();
        }
    }

    /**
     * Hides the debug panel UI
     */
    hide(): void {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;

        // Unsubscribe from store changes when panel is hidden
        if (this.storeSubscription) {
            this.storeSubscription();
            this.storeSubscription = null;
        }
    }
}
