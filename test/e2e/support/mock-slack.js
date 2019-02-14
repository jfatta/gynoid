const nock = require('nock');
const MockWSServer = require('../support/mock-ws-server');
const _ = require('lodash');
const waitForCondition = require('./wait-for-condition');
const messageBuilder = require('./message-builder');
const RTM_JSON = require('../fixtures/rtm.start.json');

class MockSlack {
    constructor({wsPort}) {
        this.wsPort = wsPort;
        const rtmFixture = _.cloneDeep(RTM_JSON);
        rtmFixture.self.id = `IDgynoidbot`;
        rtmFixture.self.name = 'gynoidbot';
        rtmFixture.url = 'ws://localhost:' + this.wsPort;
        this.webApi = nock('https://slack.com/api')
            .post('/rtm.start')
            .times(1)
            .reply(200, rtmFixture);
        this.sockets = {
            gynoidbot: new MockWSServer({port: wsPort})
        };
    }

    sendMessageToGynoid(text) {
        this.sendMessageToDroid('gynoidbot',text);
    }

    sendMessageToDroid(droidName, text) {
        const message = messageBuilder.withBotId(`ID${droidName}`).withMessage(text).build();
        this.sockets[droidName].sendMessage(JSON.stringify(message));
    }

    givenPostMessageFromDroidIsConfigured(message) {
        this.webApi
            .post('/chat.postMessage', { 
                as_user: 'true',
                channel: 'GG30G30MU',
                text: message,
                token: /.*/
            })
            .times(1)
            .reply(200, { ok: true})
    }

    registerDroid(droidName) {
        const port = this.wsPort + 1

        const rtmFixture = _.cloneDeep(RTM_JSON);
        rtmFixture.self.id = `ID${droidName}`;
        rtmFixture.self.name = droidName;
        rtmFixture.url = `ws://localhost:${port}`;

        this.sockets[droidName] = new MockWSServer({port})
        this.webApi.post('/rtm.start')
            .times(1)
            .reply(200, rtmFixture);
        this.givenPostMessageFromDroidIsConfigured('Registering Droid...');
        this.givenPostMessageFromDroidIsConfigured(`Droid ${droidName} successfully registered`);

        this.sendMessageToGynoid(`register ${droidName} using xoxb-mock-token`);

        return waitForCondition(() => this.allWebCallsWerePerformed(), 2000, 'installing droid')
    }

    extendDroid(droidName, extensionName) {
        this.givenPostMessageFromDroidIsConfigured('Extending Droid...');
        this.givenPostMessageFromDroidIsConfigured(`Droid ${droidName} successfully extended`);
        this.givenPostMessageFromDroidIsConfigured(`Droid ${droidName} successfully reloaded`);

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
}

module.exports = MockSlack;