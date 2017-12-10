'use strict';

const env = require('./env');
const Configuration = require('./configuration');
const Extender = require('./extender');
const buildNoid = require('./factory');
const logger = require('./logger');
const gitUrls = ['https:', 'git@github', 'git@gitlab.auth0.com'];

class Cluster {
  /**
   * Instantiates a new Gynoid Cluster
   * @param {?Configuration} configuration The configuration object to initialize the cluster
   * @param {?Extender} extender The extender class to use when extending new functionality to a gynoid
   */
  constructor(configuration, extender) {
    this.configuration = configuration || new Configuration(env.GYNOID_CONFIG_PATH); // Gynoid definitions
    this.extender = extender || new Extender(this.configuration.data.keys['GITHUB_TOKEN']);
    /** @type {object} */
    this.gynoids = {}; // Actual Gynoid objects
  }

  /**
   * Initializes gynoid droids from the configuration registry
   */
  startFromRegistry() {
    for (var gynoid in this.configuration.data.gynoids) {
      this.startGynoid(this.configuration.data.gynoids[gynoid])
        .catch((e) => logger.error(e));
    }
  }

  /**
   * Starts a Gynoid bot user
   * @param {Object} definition The definition object from a droid.json metadata
   * @returns {Promise}
   */
  startGynoid(definition) {
    if (this.gynoids[definition.name]) {
      const error = 'Unable to initialize gynoid. Gynoid ID already exists';
      logger.error(error);
      return Promise.reject(error);
    }

    try {
      const gynoidConfiguration = this.configuration.data.gynoids[definition.name] || {};
      const noid = buildNoid(definition, gynoidConfiguration.keys);
      this.configuration.data.gynoids[definition.name] = definition;
      this.configuration.save();
      this.gynoids[definition.name] = noid;
      noid.start();
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Disconnects and removes a gynoid droid
   * @param {string} id The gynoid identifier
   * @returns {Promise}
   */
  disconnectGynoid(id) {
    try {
      const noidToDisconnect = this._getGynoid(id);
      return noidToDisconnect.disconnect();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Reloads a gynoid by reloading all definitions
   * @param {string} id The gynoid identifier
   * @returns {Promise}
   */
  reloadGynoid(id) {
    try {
      const gynoid = this._getGynoid(id);
      return gynoid.reload(this.configuration.data.gynoids[id].keys);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Disconnects the Gynoid adapter and removes it from the cluster and configuration
   * @param {string} id The gynoid identifier
   * @returns {Promise}
   */
  removeGynoid(id) {
    this.disconnectGynoid(id);
    delete this.gynoids[id];
    delete this.configuration.data.gynoids[id];
    this.configuration.save();
    return Promise.resolve();
  }

  /**
   * Installs an extension from a GitHub repository
   * @param {string} repository The repository where the extension is located
   * @param {string} gynoidId The gynoid identifier
   * @returns {Promise}
   */
  installExtension(repository, gynoidId) {
    const gynoid = this._getGynoid(gynoidId);
    const repo = this._getRepository(repository);

    const start = gynoid.extensions.find(e => e.name === repo.name) ? this.removeExtension(repo.name, gynoidId) : Promise.resolve();

    return start
      .then(() => this.extender.clone(repo.url, repo.name))
      .then(() => this.extender.installDependencies(repo.name))
      .then(() => {
        gynoid.loadExtension(repo.name, repo.url);
        this.configuration.data.gynoids[gynoidId].extensions.push({ name: repo.name, repository: repo.url });
        this.configuration.save();
      });
  }

  /**
   * Removes an installed extension from the selected gynoid
   * @param {string} extensionName The name of the installed extension
   * @param {string} gynoidId The gynoid identifier
   * @returns {Promise}
   */
  removeExtension(extensionName, gynoidId) {
    const gynoid = this._getGynoid(gynoidId);
    logger.info(`Current gynoid ${gynoidId} extensions: ${JSON.stringify(this.configuration.data.gynoids[gynoidId].extensions)}`);
    const extension = this.configuration.data.gynoids[gynoidId].extensions.find((e) => e.name === extensionName);
    if (!extension) {
      const error = `Unable to remove extension ${extensionName} from ${gynoidId}`;
      logger.error(error)
      return Promise.reject(error);
    }

    gynoid.removeExtension(extensionName);
    const extensionIndex = this.configuration.data.gynoids[gynoidId].extensions.indexOf(extension);
    this.configuration.data.gynoids[gynoidId].extensions.splice(extensionIndex, 1);
    this.configuration.save();
    return Promise.resolve();
  }

  /**
   * Adds a configuration setting to the selected gynoid
   * @param {string} gynoidId The gynoid identifier
   * @param {string} key The setting key name
   * @param {string} value The setting value
   */
  addKey(gynoidId, key, value) {
    this.configuration.addKey(gynoidId, key, value);
  }

  /**
   * Removes a configuration setting from the selected gynoid
   * @param {string} gynoidId The gynoid identifier
   * @param {string} key
   */
  removeKey(gynoidId, key) {
    this.configuration.removeKey(gynoidId, key);
  }

  /**
   * Lists all configuration keys from the selected gynoid
   * @param {string} gynoidId The gynoid identifier
   * @returns {Array.<object>} The configuration keys
   */
  listKeys(gynoidId) {
    return this.configuration.listKeys(gynoidId);
  }

  /**
   * Returns a gynoid object
   * @param {string} gynoidId The gynoid identifier
   * @returns {Gynoid} The gynoid object
   */
  _getGynoid(gynoidId) {
    const gynoid = this.gynoids[gynoidId];
    if (!gynoid) {
      const error = `Unable to install extension. Bot not found: ${gynoidId}`;
      logger.error(error);
      throw new Error(error);
    }

    return gynoid;
  }

  /**
   * Constructs the repository URL
   * @param {string} repository The repository name
   * @returns {Object} The repository object
   */
  _getRepository(repository) {
    try {
      const isGitUrl = gitUrls.find((url) => repository.startsWith(url));
      const parts = repository.split('/');

      return {
        name: parts[parts.length - 1].split('#')[0], // Discards branch or tag name
        organization: parts[parts.length - 2],
        url: isGitUrl ? repository : 'https://github.com/' + repository
      };
    } catch (e) {
      const error = 'Unable to parse repository URL';
      logger.error(error);
      throw new Error(error);
    }
  }
}

const cluster = new Cluster();
module.exports = cluster;
