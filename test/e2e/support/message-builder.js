class MessageBuilder {
    constructor(template, botId) {
        this.template = template; 
        this.botId = botId;      
    }

    withMessage(message) {
        const newTemplate = Object.assign(this.template, {text: `<@${this.botId}> ${message}`});
        return new MessageBuilder(newTemplate, this.botId);
    }

    withBotId(botId) {
        return new MessageBuilder(Object.assign({}, this.template), botId);
    }

    withChannel(channel) {
        const newTemplate = Object.assign(this.template, {channel});
        return new MessageBuilder(newTemplate, this.botId);
    }

    build() {
        return Object.assign({}, this.template);
    }
}

const template = {
    'type': 'message',
    'user': 'UFV8PDTFG',
    'text': '',
    'client_msg_id': '11f1b56f-4640-42c9-a2ee-e64100258a94',
    'team': 'TFTRNRWPL',
    'channel': 'GG30G30MU',
    'event_ts': 1550018349.001200,
    'ts': 1550018349.001200
};

module.exports = new MessageBuilder(template, 'IDgynoidbot');