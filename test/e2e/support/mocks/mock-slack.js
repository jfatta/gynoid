const nock = require('nock');
const MockWSServer = require('./mock-ws-server');
const _ = require('lodash');
const waitForCondition = require('../wait-for-condition');
const messageBuilder = require('../builders/message-builder');
const postMessageResponseBuilder = require('../builders/post-message-response-builder');
const defaultRTMFixtureBuilder = require('../builders/rtm-builder');

class MockSlack {
    constructor({wsPort}) {
        this.wsPort = wsPort;
        const rtmFixture = defaultRTMFixtureBuilder
            .withId('IDgynoidbot')
            .withName('gynoidbot')
            .withUrl('ws://localhost:' + this.wsPort)
            .build();
        this.webApi = nock('https://slack.com/api')
            .post('/rtm.start')
            .times(1)
            .reply(200, rtmFixture);
        this.sockets = {
            gynoidbot: new MockWSServer({port: wsPort})
        };
    }

    sendMessageTo(droidName, messageBuilder) {
        const message = messageBuilder.withBotId(`ID${droidName}`).build();
        this.sockets[droidName].sendMessage(JSON.stringify(message));
    }

    sendMessageToGynoid(text) {
        this.sendMessageTo('gynoidbot', messageBuilder.withMessage(text));
    }

    givenPostMessageFromDroidIsExpected(messageBuilder) {
        this.webApi
            .post('/chat.postMessage', messageBuilder.build())
            .times(1)
            .reply(200, { ok: true})
    }

    registerDroid(droidName) {
        const port = this.wsPort + 1

        const rtmFixture = defaultRTMFixtureBuilder
            .withId(`ID${droidName}`)
            .withName(droidName)
            .withUrl('ws://localhost:' + port)
            .build();
        this.sockets[droidName] = new MockWSServer({port})
        this.webApi.post('/rtm.start')
            .times(1)
            .reply(200, rtmFixture);
        this.givenPostMessageFromDroidIsExpected(postMessageResponseBuilder.withText('Registering Droid...'));
        this.givenPostMessageFromDroidIsExpected(postMessageResponseBuilder.withText(`Droid ${droidName} successfully registered`));

        this.sendMessageToGynoid(`register ${droidName} using xoxb-mock-token`);

        return waitForCondition(() => this.allWebCallsWerePerformed(), 180000, 'registering droid')
    }

    extendDroid(droidName, extensionName) {
        this.givenPostMessageFromDroidIsExpected(postMessageResponseBuilder.withText('Extending Droid...'));
        this.givenPostMessageFromDroidIsExpected(postMessageResponseBuilder.withText(`Droid ${droidName} successfully extended`));
        this.givenPostMessageFromDroidIsExpected(postMessageResponseBuilder.withText(`Droid ${droidName} successfully reloaded`));

        this.sendMessageToGynoid(`extend ${droidName} from ${extensionName}`);

        return waitForCondition(() => this.allWebCallsWerePerformed(), 180000, 'installing droid')
    }

    allWebCallsWerePerformed() {
        return Promise.resolve(this.webApi.isDone());
    }

    getPendingCalls() {
        return this.webApi.pendingMocks();
    }

    closeConnection() {
        Object.keys(this.sockets).forEach((botWS) => {
            this.sockets[botWS].closeConnection();
        })
    }

    clearAllWebApiCalls() {
        nock.cleanAll();
    }
}

module.exports = MockSlack;