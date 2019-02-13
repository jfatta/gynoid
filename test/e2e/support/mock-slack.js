const nock = require('nock');
const MockWSServer = require('../support/mock-ws-server');
const _ = require('lodash');
const messageBuilder = require('./message-builder');
const RTM_JSON = require('../fixtures/rtm.start.json');

class MockSlack {
    constructor({wsPort}) {
        const rtmFixture = _.cloneDeep(RTM_JSON);
        rtmFixture.url = 'ws://localhost:' + wsPort;
        this.webApi = nock('https://slack.com/api')
            .post('/rtm.start')
            .times(1)
            .reply(200, rtmFixture);
        this.ws = new MockWSServer({port: wsPort});
    }

    sendMessageToGynoid(text) {
        const message = messageBuilder.withMessageForGynoid(text);
        this.ws.send(JSON.stringify(message));
    }
    
    closeConnection() {
        this.ws.closeConnection();
    }
}

module.exports = MockSlack;