import { getContext } from "../../../../extensions.js";
import { extension_settings } from "../../../../extensions.js";

export class AutoOutfitSystem {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isEnabled = false;
        this.systemPrompt = ''; // Will be set by user
        this.commandPattern = /outfit-system_(\w+)_(\w+)\(([^)]*)\)/g;
    }

    enable() {
        this.isEnabled = true;
        this.setupEventListener();
        return '[Outfit System] Auto outfit updates enabled.';
    }

    disable() {
        this.isEnabled = false;
        this.removeEventListener();
        return '[Outfit System] Auto outfit updates disabled.';
    }

    setPrompt(prompt) {
        this.systemPrompt = prompt;
        return '[Outfit System] System prompt updated.';
    }

    setupEventListener() {
        const { eventSource, event_types } = getContext();
        this.messageHandler = this.handleMessage.bind(this);
        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, this.messageHandler);
    }

    removeEventListener() {
        const { eventSource, event_types } = getContext();
        if (this.messageHandler) {
            eventSource.off(event_types.CHARACTER_MESSAGE_RENDERED, this.messageHandler);
        }
    }

    async handleMessage(data) {
        if (!this.isEnabled || !this.systemPrompt) return;

        try {
            // Wait a moment before processing to ensure UI is updated
            setTimeout(async () => {
                await this.processOutfitCommands();
            }, 1000);
        } catch (error) {
            console.error('Auto outfit processing error:', error);
        }
    }

    async processOutfitCommands() {
        const { generateRaw } = getContext();
        
        if (!generateRaw) {
            console.error('generateRaw function not available');
            return;
        }

        try {
            const result = await generateRaw({
                systemPrompt: 'You are an outfit command parser. Extract valid outfit commands from the text.',
                prompt: `${this.systemPrompt}\n\nLast message: ${this.getLastMessages(3)}`,
                jsonSchema: {
                    name: 'OutfitCommands',
                    description: 'Extracted outfit commands from text',
                    strict: true,
                    value: {
                        '$schema': 'http://json-schema.org/draft-04/schema#',
                        'type': 'object',
                        'properties': {
                            'commands': {
                                'type': 'array',
                                'items': {
                                    'type': 'string'
                                }
                            }
                        },
                        'required': ['commands']
                    }
                }
            });

            const parsedResult = this.parseResult(result);
            await this.executeCommands(parsedResult.commands || []);

        } catch (error) {
            console.error('Outfit command generation failed:', error);
        }
    }

    getLastMessages(count = 3) {
        const { chat } = getContext();
        return chat.slice(-count).map(msg => 
            `${msg.is_user ? 'User' : 'AI'}: ${msg.mes}`
        ).join('\n');
    }

    parseResult(result) {
        try {
            if (typeof result === 'string' && result.trim()) {
                const parsed = JSON.parse(result);
                return Array.isArray(parsed.commands) ? { commands: parsed.commands } : { commands: [] };
            }
        } catch (error) {
            console.error('Failed to parse outfit commands:', error);
        }
        return { commands: [] };
    }

    async executeCommands(commands) {
        for (const command of commands) {
            const match = command.match(/outfit-system_(\w+)_(\w+)\(([^)]*)\)/);
            if (match) {
                const [, action, slot, value] = match;
                await this.executeCommand(action, slot, value.replace(/"/g, ''));
            }
        }
    }

    async executeCommand(action, slot, value) {
        const validSlots = [...this.outfitManager.slots];
        
        if (!validSlots.includes(slot)) {
            console.warn(`Invalid slot: ${slot}`);
            return;
        }

        switch(action) {
            case 'wear':
                await this.outfitManager.setOutfitItem(slot, value);
                break;
            case 'remove':
                await this.outfitManager.setOutfitItem(slot, 'None');
                break;
            case 'change':
                await this.outfitManager.setOutfitItem(slot, value);
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

    getStatus() {
        return {
            enabled: this.isEnabled,
            hasPrompt: !!this.systemPrompt,
            lastProcessed: new Date().toLocaleTimeString()
        };
    }
}
