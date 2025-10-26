"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ExtensionCore_1 = require("./core/ExtensionCore");
const DebugLogger_1 = require("./logging/DebugLogger");
console.log('[OutfitTracker] Starting extension loading...');
(0, DebugLogger_1.debugLog)('Starting extension loading...', null, 'info');
$(document).ready(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, ExtensionCore_1.initializeExtension)();
        console.log('[OutfitTracker] Extension loaded successfully');
        (0, DebugLogger_1.debugLog)('Extension loaded successfully', null, 'info');
    }
    catch (error) {
        console.error('[OutfitTracker] Initialization failed', error);
        (0, DebugLogger_1.debugLog)('Extension initialization failed', error, 'error');
    }
}));
