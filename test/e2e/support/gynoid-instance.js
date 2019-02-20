const waitForCondition = require('./wait-for-condition');
const messageBuilder = require('./builders/message-builder');
const postMessageRequestBodyBuilder = require('./builders/post-message-request-body-builder');
const defaultRTMFixtureBuilder = require('./builders/rtm-builder');

class GynoidInstance {
    constructor(mockSlack) {
        this.mockSlack = mockSlack;
    }

    registerDroid(droidName) {
        this.mockSlack.setupDroidRegistration(droidName);
        this.mockSlack.sendMessageToGynoid(messageBuilder.withMessage(`register ${droidName} using xoxb-mock-token`));
        return waitForCondition(() => this.mockSlack.allWebCallsWerePerformed(), 180000, 'registering droid')
    }

    extendDroid(droidName, extensionName) {
        this.mockSlack.givenPostMessageFromDroidIsExpected(postMessageRequestBodyBuilder.withText('Extending Droid...'));
        this.mockSlack.givenPostMessageFromDroidIsExpected(postMessageRequestBodyBuilder.withText(`Droid ${droidName} successfully extended`));
        this.mockSlack.givenPostMessageFromDroidIsExpected(postMessageRequestBodyBuilder.withText(`Droid ${droidName} successfully reloaded`));

        this.mockSlack.sendMessageToGynoid(messageBuilder.withMessage(`extend ${droidName} from ${extensionName}`));

        return waitForCondition(() => this.mockSlack.allWebCallsWerePerformed(), 180000, 'installing droid')
    }

    addKey(droid, key, value) {
        this.mockSlack.givenPostMessageFromDroidIsExpected(postMessageRequestBodyBuilder.withText('Key added'));
        this.mockSlack.sendMessageToGynoid(messageBuilder.withMessage(`add key ${key} ${value} to ${droid}`));
        return waitForCondition(() => this.mockSlack.allWebCallsWerePerformed(), 2000, 'key was added')
    }

    removeKey(droid, key) {
        this.mockSlack.givenPostMessageFromDroidIsExpected(postMessageRequestBodyBuilder.withText('Key was removed'));
        this.mockSlack.sendMessageToGynoid(messageBuilder.withMessage(`remove key ${key} from ${droid}`));
        return waitForCondition(() => this.mockSlack.allWebCallsWerePerformed(), 20000, 'key was added')
    }
}

module.exports = GynoidInstance;