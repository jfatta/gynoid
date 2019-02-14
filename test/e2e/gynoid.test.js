const MockSlack = require('./support/mock-slack');
const fs = require('fs');
const rimraf = require('rimraf');
const path = require('path');
const createNewGynoidConfig = require('./support/create-new-config-file');
const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
const waitForCondition = require('./support/wait-for-condition');

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

const expectPathToExist = (pathToCheck, done) => {
    fs.access(path.normalize(pathToCheck), (err) => {
        if (err) {
            done(err);
        } else {
            done()
        }
    })
}
describe('gynoid', () => {
    let mockSlack;
    before((done) => {
        mockSlack = new MockSlack({wsPort: 5521});
        createNewGynoidConfig(TEST_GYNOID_CONFIG_PATH)
            .then(() => {
                const startGynoid = require('../../index');
                return startGynoid();
            })
            .then(() => mockSlack.registerDroid('test'))
            .then(() => mockSlack.extendDroid('test', 'auth0/test-droid'))
            .then(done);
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
            
            expectPathToExist(gynoidDroidPath, done);
        });

        it('should install droids dependencies', (done) => {
            const gynoidDroidDependenciesPath = path.join(TEST_DROIDS_FOLDER_PATH, 'gynoid-droid/node_modules');

            expectPathToExist(gynoidDroidDependenciesPath, done);
        });
    });

    describe('droids', () => {
        describe('message parsing', () => {
            it('should match plain message to a correct method from the droids implementation', (done) => {
                mockSlack.expectMessageFromDroid('Pong!');
    
                mockSlack.sendMessageToDroid('test', 'ping');
    
                waitForCondition(() => mockSlack.allWebCallsWerePerformed(), 2000, 'test droid responded with pong message')
                    .then(done)
                    .catch(err => {
                        const errorMessage = `${err.message}. Pending calls: ${mockSlack.getPendingCalls()}`;
                        done(new Error(errorMessage));
                    });
            });
            it('should match messages with multiple parameters to a correct method from the droids implementation', (done) => {
                mockSlack.expectMessageFromDroid('Sending echo message1 message2')
                
                mockSlack.sendMessageToDroid('test', 'echo message1 message2')

                waitForCondition(() => mockSlack.allWebCallsWerePerformed(), 2000, 'test droid responded with echo message')
                    .then(done)
                    .catch(err => {
                        const errorMessage = `${err.message}. Pending calls: ${mockSlack.getPendingCalls()}`;
                        done(new Error(errorMessage));
                    });
            });

            it('should match messages for all aliases defined in droids configuration', (done) => {
                mockSlack.expectMessageFromDroid('Sending echo message1 message2')
                
                mockSlack.sendMessageToDroid('test', 'another-echo message1 message2')

                waitForCondition(() => mockSlack.allWebCallsWerePerformed(), 2000, 'test droid responded with echo message')
                    .then(done)
                    .catch(err => {
                        const errorMessage = `${err.message}. Pending calls: ${mockSlack.getPendingCalls()}`;
                        done(new Error(errorMessage));
                    });
            });
        });
    })
});