const constants = require('../mocks/mock-slack-constants');

class PostMessageResponseBuilder {
    constructor(template) {
        this.template = template;
    }

    withText(text) {
        const newTemplate = Object.assign({}, this.template, {text});
        return new PostMessageResponseBuilder(newTemplate);
    }

    withChannel(channel) {
        const newTemplate = Object.assign({}, this.template, {channel});
        return new PostMessageResponseBuilder(newTemplate);
    }

    build() {
        return Object.assign({}, this.template);
    }
}

const defaultTemplate = { 
    as_user: 'true',
    channel: constants.SECURITY_CHANNEL,
    text: '',
    token: /.*/
}

module.exports = new PostMessageResponseBuilder(defaultTemplate);