const createApiSlackMock = require('./support/api-slack-mock');
const fs = require('fs');
const path = require('path');

const createNewGynoidConfig = require('./support/create-new-config-file');
const TEST_GYNOID_CONFIG_PATH = './test/e2e/fixtures/gynoid.config.json';

const removeConfigFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.unlink(path.normalize(filePath), () => resolve());
    })
}

const startGynoid = () => {
    return require('../../server');
}

const readConfig = (configPath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(configPath), (err, data) => {
            if (err) {
                reject(err);
            } else {
                const config = JSON.parse(data);
                resolve(config);
            }
        })
    })
}
describe('gynoid', () => {
    let instance;
    before((done) => {
        createNewGynoidConfig(TEST_GYNOID_CONFIG_PATH)
            .then(() => {
                return createApiSlackMock();
            })
            .then(() => {
                return startGynoid();
            })
            .then(() => done());
    })

    after((done) => {
        removeConfigFile(TEST_GYNOID_CONFIG_PATH).then(() => done()).catch((err) => console.log(err));
    })

    describe('register droid', () => {
        it('should install gynoid droid on start up', (done) => {
            // readConfig(TEST_GYNOID_CONFIG_PATH)
            //     .then((config) => {
            //         console.log(config);
            //         done();
            //     })
            done();
        });
    });
});