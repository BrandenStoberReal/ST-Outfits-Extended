/**
 * Path configuration for the Outfit Tracker Extension
 * This module centralizes path definitions to improve maintainability
 */

// Define base paths relative to this file (src/config/paths.js)
// To go up 2 levels to reach the project root: src/config/ -> src/ -> root/
export const PROJECT_ROOT = '../..';
export const UTILS_PATH = '../utils';
export const COMMON_PATH = '../common';
export const MANAGERS_PATH = '../managers';
export const PANELS_PATH = '../panels';
export const CORE_PATH = '../core';

// Specific file paths
export const STRING_PROCESSOR_PATH = '../utils/StringProcessor.js';
export const LLM_UTILITY_PATH = '../utils/LLMUtility.js';
export const SHARED_PATH = '../common/shared.js';

// Manager paths
export const BOT_OUTFIT_MANAGER_PATH = '../managers/BotOutfitManager.js';
export const USER_OUTFIT_MANAGER_PATH = '../managers/UserOutfitManager.js';

// Panel paths
export const BOT_OUTFIT_PANEL_PATH = '../panels/BotOutfitPanel.js';
export const USER_OUTFIT_PANEL_PATH = '../panels/UserOutfitPanel.js';

// Core paths
export const AUTO_OUTFIT_SYSTEM_PATH = '../core/AutoOutfitSystem.js';