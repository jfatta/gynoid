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
        const message = messageBuilder.withMessageForGynoid(text).build();
        this.ws.sendMessage(JSON.stringify(message));
    }

    expectMessageFromDroid(message) {
        return this.webApi
            .post('/chat.postMessage', { 
                as_user: 'true',
                channel: 'GG30G30MU',
                text: message,
                token: 'mock-slack-token' 
            })
            .times(1)
            .reply(200, { ok: true})
    }

    allWebCallsWerePerformed() {
        return Promise.resolve(this.webApi.isDone());
    }

    getPendingCalls() {
        return this.webApi.pendingMocks();
    }

    closeConnection() {
        this.ws.closeConnection();
    }
}

module.exports = MockSlack;