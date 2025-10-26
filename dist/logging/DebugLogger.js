"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugLogger = void 0;
exports.debugLog = debugLog;
exports.forceDebugLog = forceDebugLog;
exports.getLogs = getLogs;
exports.clearLogs = clearLogs;
const Store_1 = require("../common/Store");
const logs = [];
const MAX_LOGS = 1000;
function addLogToStorage(message, data, level = 'log') {
    const timestamp = new Date().toISOString();
    logs.push({
        timestamp,
        message,
        data,
        level,
        formattedMessage: `[OutfitTracker Debug - ${timestamp}] ${message}`
    });
    if (logs.length > MAX_LOGS) {
        logs.shift();
    }
}
function debugLog(message, data, level = 'log') {
    var _a;
    const storeState = Store_1.outfitStore.getState();
    const debugMode = (_a = storeState === null || storeState === void 0 ? void 0 : storeState.settings) === null || _a === void 0 ? void 0 : _a.debugMode;
    if (debugMode) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[OutfitTracker Debug - ${timestamp}] ${message}`;
        switch (level) {
            case 'warn':
                console.warn(formattedMessage, data !== undefined ? data : '');
                break;
            case 'error':
                console.error(formattedMessage, data !== undefined ? data : '');
                break;
            case 'info':
                console.info(formattedMessage, data !== undefined ? data : '');
                break;
            case 'debug':
                console.debug(formattedMessage, data !== undefined ? data : '');
                break;
            case 'log':
            default:
                console.log(formattedMessage, data !== undefined ? data : '');
                break;
        }
        addLogToStorage(message, data, level);
    }
}
function forceDebugLog(message, data) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[OutfitTracker Debug - ${timestamp}] ${message}`;
    console.log(formattedMessage, data !== undefined ? data : '');
    addLogToStorage(message, data, 'log');
}
function getLogs() {
    return [...logs];
}
function clearLogs() {
    logs.length = 0;
}
exports.debugLogger = {
    log: debugLog,
    forceLog: forceDebugLog,
    getLogs: getLogs,
    clearLogs: clearLogs
};
