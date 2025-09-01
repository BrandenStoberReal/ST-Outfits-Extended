import { getContext } from "../../../../extensions.js";
import { extension_settings } from "../../../../extensions.js";

export class AutoOutfitSystem {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.isEnabled = false;
        this.systemPrompt = this.getDefaultPrompt();
        this.commandPattern = /outfit-system_(\w+)_(\w+)\(([^)]*)\)/g;
        this.messageHandler = null;
    }

    getDefaultPrompt() {
        return `Analyze the character's actions in the recent messages. If the character puts on, wears, removes, or changes any clothing items, output the appropriate outfit commands. Use the format: outfit-system_[action]_[slot]("[item name]").

Available actions: wear, remove, change
Available slots: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear, head-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory

Example commands:
- outfit-system_wear_headwear("Red Baseball Cap")
- outfit-system_remove_topwear()
- outfit-system_change_bottomwear("Blue Jeans")

Only output commands if clothing changes are explicitly mentioned. If no changes, output empty array.

Important: Always use the exact slot names listed above. Never invent new slot names.`;
    }

    enable() {
        if (this.isEnabled) return '[Outfit System] Auto outfit updates already enabled.';
        
        this.isEnabled = true;
        this.setupEventListener();
        return '[Outfit System] Auto outfit updates enabled.';
    }

    disable() {
        if (!this.isEnabled) return '[Outfit System] Auto outfit updates already disabled.';
        
        this.isEnabled = false;
        this.removeEventListener();
        return '[Outfit System] Auto outfit updates disabled.';
    }

    setPrompt(prompt) {
        this.systemPrompt = prompt || this.getDefaultPrompt();
        return '[Outfit System] System prompt updated.';
    }

    resetToDefaultPrompt() {
        this.systemPrompt = this.getDefaultPrompt();
        return '[Outfit System] Reset to default prompt.';
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
                prompt: `${this.systemPrompt}\n\nLast 3 messages:\n${this.getLastMessages(3)}`,
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
        const recentMessages = chat.slice(-count);
        return recentMessages.map(msg => 
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

        try {
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
        } catch (error) {
            console.error(`Error executing outfit command ${action}_${slot}:`, error);
        }
    }

    getStatus() {
        return {
            enabled: this.isEnabled,
            hasPrompt: !!this.systemPrompt,
            promptLength: this.systemPrompt?.length || 0,
            lastProcessed: new Date().toLocaleTimeString()
        };
    }
}
