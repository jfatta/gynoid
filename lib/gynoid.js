'use strict';

const async = require('async');
const events = require('./adapters/events');
const Extension = require('./extension/');
const logger = require('./logger');

module.exports = class Gynoid {
  constructor(name, adapter, config) {
    this.name = name;
    this.adapter = adapter;
    this.extensions = [];
    this.config = config;
  }

  start() {
    this.adapter.on(events.AUTHENTICATED, this._onAuthenticated.bind(this));
    this.adapter.on(events.CONNECTION_FAILURE, this._onConnectionFailure.bind(this));
    this.adapter.on(events.CONNECTION_OPENED, this._onConnectionOpened.bind(this));
    this.adapter.on(events.MESSAGE, this._onMessage.bind(this));
    this.adapter.on(events.REACTION_ADDED, this._onReactionAdded.bind(this));
    this.adapter.on(events.REACTION_REMOVED, this._onReactionRemoved.bind(this));
    setTimeout(() => this.adapter.start(), 0);
    return Promise.resolve();
  }

  disconnect() {
    logger.info(`Disconnecting noid: ${this.name}`);
    this.adapter.disconnect();
    return Promise.resolve();
  }

  reload(config) {
    return new Promise((resolve, reject) => {
      const noid = this;
      const oldConfig = this.config; // In case of failure
      this.config = config;
      const reloadFunctions = this.extensions.map((e) => (cb) => {
        return noid.getExtension(e.name, e.repository)
          .then((extension) => {
            // Once extension is loaded, remove previous version and add the new one
            return noid.removeExtension(e.name)
              .then(() => this.extensions.push(extension))
          })
          .then(() => cb())
          .catch((e) => cb(e));
      });

      async.parallel(reloadFunctions, (error) => {
        if (error) {
          noid.config = oldConfig; // Restore old configuration
          return reject(error);
        }

        return resolve();
      })
    });
  }

  loadExtension(extensionName, repository) {
    return this.getExtension(extensionName, repository)
      .then((extension) => this.extensions.push(extension));
  }

  getExtension(extensionName, repository) {
    const extension = new Extension(this.adapter, extensionName, repository, this.config);
    const definitionPath = `${process.cwd()}/droids/${extensionName}/droid.json`;

    extension.parseDefinition(definitionPath, extensionName);
    return Promise.resolve(extension);
  }

  removeExtension(extensionName) {
    const extensionToRemove = this.extensions.find((extension) => extension.name === extensionName);
    if (!extensionToRemove) {
      return Promise.reject(`Unable to remove extension ${extensionName}. Not found`);
    }

    extensionToRemove.reset();
    this.extensions.splice(this.extensions.indexOf(extensionToRemove), 1);
    return Promise.resolve();
  }

  _onAuthenticated(data) {
    logger.log(`Bot user ${data.self.name} is authenticated`);
  }

  _onConnectionOpened() {
    logger.log(`Connection Opened. Bot ${this.adapter.bot.name} is ready to talk`);
  }

  _onConnectionFailure(error) {
    logger.error(`Failed to initialize connection with the adapter: ${error}`);
    if (this.connectionFailed) {
      this.connectionFailed();
    }
  }

  _onMessage(message) {
    if ((message.user || message.bot_id) === this.adapter.bot.id) {
      // Ignore own messages
      return;
    }

    logger.debug(`${this.name}: Message received - ${JSON.stringify(message, null, 2)}`);
    this.extensions.forEach((extension) => extension.onMessage(message));
  }

  _onReactionAdded(message) {
    if ((message.user || message.bot_id) === this.adapter.bot.id) {
      // Ignore own messages
      return;
    }

    logger.debug(`${this.name}: Reaction added - ${JSON.stringify(message, null, 2)}`);
    this.extensions.forEach((extension) => extension.onReactionAdded(message));
  }

  _onReactionRemoved(message) {
    if ((message.user || message.bot_id) === this.adapter.bot.id) {
      // Ignore own messages
      return;
    }

    logger.debug(`${this.name}: Reaction removed - ${JSON.stringify(message, null, 2)}`);
    this.extensions.forEach((extension) => extension.onReactionRemoved(message));
  }

  _runListeners(message, typeListeners) {
    var msg = this.parser.parseMessage(message);
    typeListeners.forEach((l) => {
      var interceptedMessage = l.intercept(msg);
      if (!interceptedMessage) {
        return; // Ignore
      }

      const request = this.adapter.buildRequest(interceptedMessage);
      const response = this.adapter.buildResponse(interceptedMessage);
      l.handler(request, response);
    });
  }
};
