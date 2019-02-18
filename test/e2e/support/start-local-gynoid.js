

const MockSlack = require('./mocks/mock-slack');
const GynoidInstance = require('./gynoid-instance');
const createNewGynoidConfig = require('./create-new-config-file');

const startLocalGynoid = ({gynoidConfigPath, droidsFolderPath}) => {
    const mockSlack = new MockSlack({wsPort: 5521});
    const gynoidInstance = new GynoidInstance(mockSlack);
    return createNewGynoidConfig(gynoidConfigPath)
        .then(() => {
            process.env.GYNOID_CONFIG_PATH = gynoidConfigPath;
            process.env.GYNOID_INSTALL_PATH = droidsFolderPath;
            const startGynoid = require('../../../index');
            return startGynoid();
        })
        .then(() => gynoidInstance.registerDroid('test'))
        .then(() => gynoidInstance.extendDroid('test', 'auth0/test-droid'))
        .then(() => {
            return {
                mockSlack,
                gynoidInstance
            }
        });

}

module.exports = startLocalGynoid;