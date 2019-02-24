const constants = require('../mocks/mock-slack-constants');

class PostMessageRequestBodyBuilder {
    constructor(template) {
        this.template = template;
    }

    withText(text) {
        const newTemplate = Object.assign({}, this.template, {text});
        return new PostMessageRequestBodyBuilder(newTemplate);
    }

    withChannel(channel) {
        const newTemplate = Object.assign({}, this.template, {channel});
        return new PostMessageRequestBodyBuilder(newTemplate);
    }


    withAttachments(attachments) {
        const newTemplate = Object.assign({}, this.template, {attachments: JSON.stringify(attachments)});
        return new PostMessageRequestBodyBuilder(newTemplate);
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

module.exports = new PostMessageRequestBodyBuilder(defaultTemplate);