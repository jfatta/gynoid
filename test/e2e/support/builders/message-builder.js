const constants = require('../mocks/mock-slack-constants');

class MessageBuilder {
    constructor(template, botId, mention) {
        this.template = template; 
        this.botId = botId;
        this.mention = mention;      
    }

    withMessage(message) {
        const newTemplate = Object.assign({}, this.template, {text: message});
        return new MessageBuilder(newTemplate, this.botId, this.mention);
    }

    withBotId(botId) {
        return new MessageBuilder(Object.assign({}, this.template), botId, this.mention);
    }

    withChannel(channel) {
        const newTemplate = Object.assign({}, this.template, {channel});
        return new MessageBuilder(newTemplate, this.botId, this.mention);
    }

    withBotMention(mention) {
        return new MessageBuilder(Object.assign({}, this.template), this.botId, mention);
    }

    build() {
        const message = this.mention ? `<@${this.botId}> ${this.template.text}` : this.template.text;
        return Object.assign({}, this.template, {text: message});
    }
}

const template = {
    'type': 'message',
    'user': 'UFV8PDTFG',
    'text': '',
    'client_msg_id': '11f1b56f-4640-42c9-a2ee-e64100258a94',
    'team': 'TFTRNRWPL',
    'channel': constants.SECURITY_CHANNEL,
    'event_ts': 1550018349.001200,
    'ts': 1550018349.001200
};

module.exports = new MessageBuilder(template, 'IDgynoidbot', true);