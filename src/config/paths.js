// Define path constants for SillyTavern core modules
// Extensions are installed in public/extensions/third-party/[extension-name]/
// So core modules are located at relative paths from extension files

export const SILLY_TAVERN_PATHS = {
    // Path to extensions.js from extension files (when extension is in public/extensions/third-party/[name]/)
    EXTENSIONS: '../../scripts/extensions.js',
    
    // Path to main script.js from extension files
    SCRIPT: '../../script.js',
    
    // Path to slash commands from extension files
    SLASH_COMMANDS: {
        PARSER: '../../slash-commands/SlashCommandParser.js',
        COMMAND: '../../slash-commands/SlashCommand.js',
        ARGUMENT: '../../slash-commands/SlashCommandArgument.js'
    }
};