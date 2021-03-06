const nock = require('nock');
const MockWSServer = require('./mock-ws-server');
const _ = require('lodash');
const waitForCondition = require('../wait-for-condition');
const messageBuilder = require('../builders/message-builder');
const postMessageRequestBodyBuilder = require('../builders/post-message-request-body-builder');
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

    sendMessageToGynoid(messageBuilder) {
        this.sendMessageTo('gynoidbot', messageBuilder);
    }

    sendMessageToAllSockets(message) {
        Object.keys(this.sockets).forEach((socket) => {
            this.sockets[socket].sendMessage(JSON.stringify(message));
        });
    }

    givenFilesUploadIsExpected(formData) {
        this.webApi
          .post('/files.upload', function(body) {
              return Object.keys(formData).every((formParameter) => {
                return body.includes(`name="${formParameter}"`) && body.includes(formData[formParameter]);
              });
          })
          .times(1)
          .reply(200, {ok: true});
    }
    givenPostMessageFromDroidIsExpected(requestBodyBuilder) {
        this.webApi
            .post('/chat.postMessage', requestBodyBuilder.build())
            .times(1)
            .reply(200, { ok: true})
    }

    givenIMOpenCallFromDroidIsExpected(requestBodyBuilder, responseBodyBuilder) {
        this.webApi
            .post('/im.open', requestBodyBuilder.build())
            .times(1)
            .reply(200, responseBodyBuilder.build());
    }

    setupDroidRegistration(droidName) {
        this.wsPort = this.wsPort + 1;

        const rtmFixture = defaultRTMFixtureBuilder
            .withId(`ID${droidName}`)
            .withName(droidName)
            .withUrl('ws://localhost:' + this.wsPort)
            .build();
        this.sockets[droidName] = new MockWSServer({port: this.wsPort})
        this.webApi.post('/rtm.start')
            .times(1)
            .reply(200, rtmFixture);
        this.givenPostMessageFromDroidIsExpected(postMessageRequestBodyBuilder.withText('Registering Droid...'));
        this.givenPostMessageFromDroidIsExpected(postMessageRequestBodyBuilder.withText(`Droid ${droidName} successfully registered`));
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

    removeWS(socketName) {
        if (this.sockets.hasOwnProperty(socketName)) {
            delete this.sockets[socketName];
        }
    }

    clearAllWebApiCalls() {
        nock.cleanAll();
    }
}

module.exports = MockSlack;