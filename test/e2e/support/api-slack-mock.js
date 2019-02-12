const nock = require('nock');
const _ = require('lodash');
var RTM_JSON = require('../fixtures/rtm.start.json');

const createApiSlackMock = () => {
    var rtmFixture = _.cloneDeep(RTM_JSON);
    rtmFixture.url = 'ws://localhost:' + 5221;
    nock('https://slack.com/api')
        .post('/rtm.start')
        .times(1)
        .reply(200, rtmFixture);
}

module.exports = createApiSlackMock;