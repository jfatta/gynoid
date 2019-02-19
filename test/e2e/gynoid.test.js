const fs = require('fs');
const rimraf = require('rimraf');
const path = require('path');
const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
const waitForCondition = require('./support/wait-for-condition');
const messageBuilder = require('./support/builders/message-builder');
const postMessageResponseBuilder = require('./support/builders/post-message-response-builder');
const constants = require('./support/mocks/mock-slack-constants');
const startLocalGynoid = require('./support/start-local-gynoid');

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

const expectAllWebCallsWerePerformed = (mockSlack, done, timeout, message) => {
    waitForAllWebCallsToBeFinished(mockSlack, timeout, message)
        .then(() => done())
        .catch(err => done(err));
}

const waitForAllWebCallsToBeFinished = (mockSlack, timeout, message) => {
    return waitForCondition(() => mockSlack.allWebCallsWerePerformed(), timeout, message)
        .then(() => Promise.resolve())
        .catch(err => {
            const errorMessage = `${err.message}. Pending calls: ${mockSlack.getPendingCalls()}`;
            throw new Error(errorMessage);
        });

}
const expectNoWebCallsWerePerformed = (mockSlack, done, timeout, message) => {
    waitForCondition(() => mockSlack.allWebCallsWerePerformed(), timeout, message)
        .then(() => done(new Error(`Expected no api calls. ${message}`)))
        .catch(err => {
            done();
        });
}
describe('gynoid', () => {
    let mockSlack;
    let gynoidInstance;
    before((done) => {
        startLocalGynoid({gynoidConfigPath: TEST_GYNOID_CONFIG_PATH, droidsFolderPath: TEST_DROIDS_FOLDER_PATH})
            .then((result) => {
                mockSlack = result.mockSlack;
                gynoidInstance = result.gynoidInstance;
                done();
            })
            .catch(err => done(err));
    })

    after((done) => {
        removeConfigFile(TEST_GYNOID_CONFIG_PATH)
            .then(() => removeDroids(TEST_DROIDS_FOLDER_PATH))
            .then(() => mockSlack.closeConnection())
            .then(() => done())
            .catch(err => done(err));
    })

    afterEach(() => {
        mockSlack.clearAllWebApiCalls();
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
                mockSlack.givenPostMessageFromDroidIsExpected(postMessageResponseBuilder.withText('Pong!'));
    
                const message = messageBuilder.withMessage('ping');
                mockSlack.sendMessageTo('test', message);
    
                expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with pong message');
            });

            it('should match messages with multiple parameters to a correct method from the droids implementation', (done) => {
                mockSlack.givenPostMessageFromDroidIsExpected(postMessageResponseBuilder.withText('Sending echo message1 message2'))
                
                const message = messageBuilder.withMessage('echo message1 message2');
                mockSlack.sendMessageTo('test', message)

                expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with echo message');
           });

            it('should match messages for all aliases defined in droids configuration', (done) => {
                mockSlack.givenPostMessageFromDroidIsExpected(postMessageResponseBuilder.withText('Sending echo message1 message2'))
                
                const message = messageBuilder.withMessage('another-echo message1 message2');
                mockSlack.sendMessageTo('test', message)

                expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with echo message');
            });
        });

        describe('acl', () => {
            describe('channels', () => {
                it('should reply to messages in allowed channels', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('Some dirty secret').withChannel(constants.SECURITY_CHANNEL)
                    )
                    
                    const message = messageBuilder.withMessage('secret').withChannel(constants.SECURITY_CHANNEL);
                    mockSlack.sendMessageTo('test', message)
    
                    expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with secret message');
                });
    
                it('should not reply to messages in non allowed channels', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('Some dirty secret').withChannel(constants.RANDOM_CHANNEL)
                    )
                    
                    const message = messageBuilder.withMessage('secret').withChannel(constants.RANDOM_CHANNEL);
                    mockSlack.sendMessageTo('test', message)
    
                    expectNoWebCallsWerePerformed(mockSlack, done, 1000, 'test droid was not supposed to respond with secret message');
                });
            });

            describe('dm', () => {
                it('should allow direct message if no acls are specified', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('Pong!').withChannel(constants.TESTDROID_PERSONAL_CHANNEL)
                    );
        
                    const message = messageBuilder.withMessage('ping').withChannel(constants.TESTDROID_PERSONAL_CHANNEL);
                    mockSlack.sendMessageTo('test', message);
        
                    expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with pong message');
                });
    
                it('should allow direct message if dm acl is set to true', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('Pong!').withChannel(constants.TESTDROID_PERSONAL_CHANNEL)
                    );
        
                    const message = messageBuilder.withMessage('direct ping').withChannel(constants.TESTDROID_PERSONAL_CHANNEL);
                    mockSlack.sendMessageTo('test', message);
        
                    expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with pong message');
                });
    
                it('should not allow direct message if dm acl is set to false', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('Pong!').withChannel(constants.TESTDROID_PERSONAL_CHANNEL)
                    );
        
                    const message = messageBuilder.withMessage('direct ping not allowed').withChannel(constants.TESTDROID_PERSONAL_CHANNEL);
                    mockSlack.sendMessageTo('test', message);
        
                    expectNoWebCallsWerePerformed(mockSlack, done, 1000, 'test droid was not supposed to respond to direct message');
                });
            });

            describe('explicit mention', () => {
                it('should allow explicit mention if no acls are specified', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('Pong!')
                    );
        
                    const message = messageBuilder.withMessage('ping').withBotMention(true);
                    mockSlack.sendMessageTo('test', message);
        
                    expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with pong message');
                });
                it('should allow explicit mention if explicit mention acl is set to true', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('Pong!')
                    );
        
                    const message = messageBuilder.withMessage('explicit ping').withBotMention(true);
                    mockSlack.sendMessageTo('test', message);
        
                    expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with pong message');
                });
                it('should not allow explicit mention if explicit mention acl is set to false', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('No explicit pong!')
                    );
        
                    const message = messageBuilder.withMessage('no explicit ping').withBotMention(true);
                    mockSlack.sendMessageTo('test', message);
        
                    expectNoWebCallsWerePerformed(mockSlack, done, 1000, 'test droid was not supposed to respond to explicit mention');
                });
                it('should respond, if droid is not mentioned and explicit mention is set to false', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('No explicit pong!')
                    );
        
                    const message = messageBuilder.withMessage('no explicit ping').withBotMention(false);
                    mockSlack.sendMessageTo('test', message);
        
                    expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with pong message');
                });
                it('should respond in direct messages, if droid is not mentioned and explicit mention is set to false', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('No explicit pong!').withChannel(constants.TESTDROID_PERSONAL_CHANNEL)
                    );
        
                    const message = messageBuilder.withMessage('no explicit ping')
                        .withChannel(constants.TESTDROID_PERSONAL_CHANNEL).withBotMention(false);
                    mockSlack.sendMessageTo('test', message);
        
                    expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with pong message');
                });
                it('should not allow explicit mention in direct messages, if explicit mention acl is set to false', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('No explicit pong!').withChannel(constants.TESTDROID_PERSONAL_CHANNEL)
                    );
        
                    const message = messageBuilder.withMessage('no explicit ping')
                        .withChannel(constants.TESTDROID_PERSONAL_CHANNEL).withBotMention(true);
                    mockSlack.sendMessageTo('test', message);
        
                    expectNoWebCallsWerePerformed(mockSlack, done, 1000, 'test droid was not supposed to respond to explicit mention');
                });
            });
            describe('mention', () => {
                it('should allow bot mention if no acls are specified', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('Pong!')
                    );
        
                    const message = messageBuilder.withMessage('test ping').withBotMention(false);
                    mockSlack.sendMessageTo('test', message);
        
                    expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with pong message');
                });
                it('should allow mentioning, if mention acl is set to true', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('Personal pong!')
                    );
        
                    const message = messageBuilder.withMessage('test personal ping').withBotMention(false);
                    mockSlack.sendMessageTo('test', message);
        
                    expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with pong message');                        
                });
                it('should not allow mentioning, if mention acl is set to false', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('No personal pong!')
                    );
        
                    const message = messageBuilder.withMessage('test: no personal ping').withBotMention(false);
                    mockSlack.sendMessageTo('test', message);
        
                    expectNoWebCallsWerePerformed(mockSlack, done, 1000, 'test droid was not supposed to respond to message with mention');
                });
                it('should allow messages with no mention, if mention acl is set to false', (done) => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('No personal pong!')
                    );
        
                    const message = messageBuilder.withMessage('no personal ping').withBotMention(false);
                    mockSlack.sendMessageTo('test', message);
        
                    expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'test droid responded with pong message');                        
                });
            });
        });

        describe('registration', () => {
            it('should derigester an existing droid', (done) => {
                gynoidInstance.registerDroid('newDroid')
                    .then(() => {
                        mockSlack.givenPostMessageFromDroidIsExpected(
                            postMessageResponseBuilder.withText('Droid newDroid successfully unregistered')
                        );

                        const message = messageBuilder.withMessage('unregister newDroid');
                        mockSlack.sendMessageToGynoid(message);

                        waitForAllWebCallsToBeFinished(mockSlack, 2000, 'gynoid unregistered a droid')
                            .then(() => {
                                return readConfig(TEST_GYNOID_CONFIG_PATH)
                                    .then((config) => {
                                        expect(config.droids.newDroid).to.be.undefined;
                                    });
                            })
                    })
                    .then(() => done())
                    .catch((err) => done(err));
            });

            it('should reply with an error, when deregistering non-existent droid', (done) => {
                mockSlack.givenPostMessageFromDroidIsExpected(postMessageResponseBuilder.withText('Unregistering Droid...'));
                mockSlack.givenPostMessageFromDroidIsExpected(
                    postMessageResponseBuilder.withText(
                        'Unable to unregister Droid.\n```[object Object]```'
                    )
                );

                const message = messageBuilder.withMessage('unregister non-existent');
                mockSlack.sendMessageToGynoid(message);

                expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'replied with an error');
            });
        });

        describe('extensions', () => {
            it('should remove existing extension', (done) => {
                gynoidInstance.registerDroid('extensionDroid')
                    .then(() => gynoidInstance.extendDroid('extensionDroid', 'auth0/test-droid'))
                    .then(() => {
                        mockSlack.givenPostMessageFromDroidIsExpected(
                            postMessageResponseBuilder.withText('Removing extension...')
                        );
                        mockSlack.givenPostMessageFromDroidIsExpected(
                            postMessageResponseBuilder.withText('Extension test-droid successfully removed')
                        );

                        const message = messageBuilder.withMessage('remove extension test-droid from extensionDroid');
                        mockSlack.sendMessageToGynoid(message);
                        
                        return waitForAllWebCallsToBeFinished(mockSlack, 2000, 'extension removed')
                            .then(() => {
                                return readConfig(TEST_GYNOID_CONFIG_PATH)
                                    .then((config) => {
                                        expect(config.droids.extensionDroid.extensions).to.deep.equal([]);
                                    });
                            });
                    })
                    .then(() => done())
                    .catch(err => done(err));
            });

            it('should reply with an error, if removing non-existing extension', (done) => {
                mockSlack.givenPostMessageFromDroidIsExpected(
                    postMessageResponseBuilder.withText('Removing extension...')
                );
                mockSlack.givenPostMessageFromDroidIsExpected(
                    postMessageResponseBuilder.withText('Unable to remove extension unknown-droid.\n```[object Object]```')
                );

                const message = messageBuilder.withMessage('remove extension unknown-droid from test');
                mockSlack.sendMessageToGynoid(message);
                    
                expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'replied with error');
            });

            it('should reply with an error, if removing extension for non-existing droid', (done) => {
                mockSlack.givenPostMessageFromDroidIsExpected(
                    postMessageResponseBuilder.withText('Removing extension...')
                );
                mockSlack.givenPostMessageFromDroidIsExpected(
                    postMessageResponseBuilder.withText('Unable to remove extension test-droid.\n```[object Object]```')
                );

                const message = messageBuilder.withMessage('remove extension test-droid from unknown');
                mockSlack.sendMessageToGynoid(message);
                    
                expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'replied with error');
            });

            it('should list existing extensions', (done) => {
                mockSlack.givenPostMessageFromDroidIsExpected(
                    postMessageResponseBuilder.withText('Listing extensions...')
                );
                mockSlack.givenPostMessageFromDroidIsExpected(
                    postMessageResponseBuilder.withText('Installed extensions for test: `test-droid`')
                );

                const message = messageBuilder.withMessage('list extensions for test');
                mockSlack.sendMessageToGynoid(message);
                    
                expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'replied with extensions');
            })
        });
    });
    describe('keys', () => {
        it('should add a key/value pair to droids configuration', (done) => {
            gynoidInstance.addKey('test', 'myKey', 'myValue')
                .then(() => {
                    return readConfig(TEST_GYNOID_CONFIG_PATH)
                        .then((config) => {
                            expect(config.keys.test).to.deep.equal({myKey: 'myValue'});
                            done();
                        });
                })
                .then(() => gynoidInstance.removeKey('test', 'myKey'))
                .catch((err) => done(err));
        });
        it('should remove a key/value pair from droids configuration', (done) => {                
            gynoidInstance.addKey('test', 'keyToDelete', 'myValue')
                .then(() => {
                    return readConfig(TEST_GYNOID_CONFIG_PATH)
                        .then((config) => {
                            expect(config.keys.test).to.deep.equal({keyToDelete: 'myValue'});
                        });
                })
                .then(() => gynoidInstance.removeKey('test', 'keyToDelete'))
                .then(() => {
                    return readConfig(TEST_GYNOID_CONFIG_PATH)
                    .then((config) => {
                        expect((config.keys.test || {}).keyToDelete).to.be.undefined;
                        done();
                    });                            
                })
                .catch((err) => done(err));
        });

        it('should list all keys', (done) => {
            gynoidInstance.addKey('test', 'someKey', 'someValue')
                .then(() => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText(`Configured keys:\nGITHUB_TOKEN\nGYNOID_TOKEN\nsomeKey`)
                    );
        
                    const message = messageBuilder.withMessage('list all keys');
                    mockSlack.sendMessageToGynoid(message);
        
                    return expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'gynoid responded with all keys');                            
                })
                .then(() => gynoidInstance.removeKey('test', 'someKey'))
                .catch((err) => done(err));
        });

        it('should list keys for a droid', (done) => {
            gynoidInstance.addKey('test', 'anotherKey', 'value')
                .then(() => {
                    mockSlack.givenPostMessageFromDroidIsExpected(
                        postMessageResponseBuilder.withText('Configured keys for test:\nanotherKey')
                    )

                    const message = messageBuilder.withMessage('list keys for test');
                    mockSlack.sendMessageToGynoid(message);

                    return expectAllWebCallsWerePerformed(mockSlack, done, 2000, 'gynoid responded with keys for test droid');
                })
                .then(() => gynoidInstance.removeKey('test', 'anotherKey'))
                .catch((err) => done(err));
        })
    });
});