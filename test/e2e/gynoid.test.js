const MockSlack = require('./support/mock-slack');
const fs = require('fs');
const rimraf = require('rimraf');
const path = require('path');
const createNewGynoidConfig = require('./support/create-new-config-file');
const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
const expect = chai.expect;
chai.use(chaiAsPromised);

const TEST_GYNOID_CONFIG_PATH = './test/e2e/fixtures/gynoid.config.json';
const TEST_DROIDS_FOLDER_PATH = './test/e2e/fixtures/droids';

const removeConfigFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.unlink(path.normalize(filePath), () => resolve());
    })
}

const removeDroids = (filePath) => {
    return new Promise((resolve, reject) => {
        rimraf(path.normalize(filePath), (err) => {
            if (err) {
                reject(err)
            } else {
                resolve();
            }
        });
    });
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
    let mockSlack;
    before((done) => {
        createNewGynoidConfig(TEST_GYNOID_CONFIG_PATH)
            .then(() => {
                return new MockSlack({wsPort: 5521});
            })
            .then((slack) => {
                mockSlack = slack
                const startGynoid = require('../../index');
                return startGynoid();
            })
            .then(() => done());
    })

    after((done) => {
        removeConfigFile(TEST_GYNOID_CONFIG_PATH)
            .then(() => removeDroids(TEST_DROIDS_FOLDER_PATH))
            .then(() => mockSlack.closeConnection())
            .then(() => done());
    })

    describe('start up', () => {
        it('should register gynoid droid', (done) => {
            readConfig(TEST_GYNOID_CONFIG_PATH)
                .then((config) => {
                    expect(config.droids).to.have.property('gynoid');
                    expect(config.droids.gynoid.token).to.be.a('string');
                    done();
                })
                .catch((err) => done(err));
        });
        
        it('should extend gynoid droid with its extension', (done) => {
            readConfig(TEST_GYNOID_CONFIG_PATH)
                .then((config) => {
                    expect(config.droids.gynoid.extensions).to.deep.equal(["gynoid-droid"]);
                    done();
                })
                .catch((err) => done(err));
        });

        it('should clone gynoid-droid code', (done) => {
            const gynoidDroidPath = path.join(TEST_DROIDS_FOLDER_PATH, 'gynoid-droid');
            fs.access(path.normalize(gynoidDroidPath), (err) => {
                if (err) {
                    done(err);
                } else {
                    done()
                }
            })
        });
    });

    describe('droids', () => {
        it('should match plain message to a correct method from the droids implementation', (done) => {
            mockSlack.expectMessageFromDroid('Ping Droid...');
            const scope = mockSlack.expectMessageFromDroid('`Hey Pong!`');

            mockSlack.sendMessageToGynoid('ping');

            setTimeout(() => {
                console.log(scope.isDone());
                console.log(scope.pendingMocks());
                done();
            }, 3000);
        });
    })
});