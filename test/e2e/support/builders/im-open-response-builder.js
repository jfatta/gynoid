const constants = require('../mocks/mock-slack-constants');

class IMOpenResponseBuilder {
    constructor(template) {
        this.template = template;
    }

    withChannel(channel) {
        const newTemplate = Object.assign({}, this.template, {channel: {id: channel}});
        return new IMOpenResponseBuilder(newTemplate);
    }

    build() {
        return Object.assign({}, this.template);
    }
}

const defaultTemplate = { 
    channel: {
        id: ''
    },
    ok: true
}

module.exports = new IMOpenResponseBuilder(defaultTemplate);