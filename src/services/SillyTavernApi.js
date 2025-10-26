class SillyTavernApi {
    constructor() {
        if (!SillyTavernApi.instance) {
            this.context = SillyTavern.getContext();
            SillyTavernApi.instance = this;
        }
        return SillyTavernApi.instance;
    }

    getContext() {
        return this.context;
    }

    getCharacters() {
        return this.context.characters;
    }

    getChat() {
        return this.context.chat;
    }

    getUserName() {
        return this.context.name1;
    }

    getCharacterName() {
        return this.context.name2;
    }

    getOnlineStatus() {
        return this.context.onlineStatus;
    }

    getMaxContext() {
        return this.context.maxContext;
    }

    getChatMetadata() {
        return this.context.chatMetadata;
    }

    getExtensionSettings() {
        return this.context.extensionSettings;
    }

    getMainApi() {
        return this.context.mainApi;
    }

    getEventSource() {
        return this.context.eventSource;
    }

    getEventTypes() {
        return this.context.event_types;
    }
}

const instance = new SillyTavernApi();

Object.freeze(instance);

export default instance;
