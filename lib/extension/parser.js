'use strict';

const path = require('path');
const clear = require('deep-clear-require');
const Listener = require('./listener');
const parseMessage = require('../model/message');
const logger = require('../logger');

module.exports = class NoidParser {
  constructor(adapter, noid, socket) {
    this.adapter = adapter;
    this.noid = noid;
    this.events = socket;
  }

  getNoidCore(definition, rootPath) {
    const entryPoint = definition.script;
    try {
      const entryPointPath = path.join(process.cwd(), 'droids', rootPath, entryPoint);
      logger.debug(`Obtaining noid core from ${entryPointPath}`);
      clear(require.resolve(entryPointPath));
      var core = require(entryPointPath);
      logger.debug(`Core: ${core}`);
      return core;
    } catch (e) {
      throw new Error('Unable to parse definition. ' + e);
    }
  }

  parse(definitionPath, rootPath, config) {
    logger.debug(`Parsing definition located in ${rootPath}`);
    const listeners = [];
    clear(definitionPath);
    const definition = require(definitionPath);
    const core = this.getNoidCore(definition, rootPath);
    const methods = core({ config: config, noid: this.noid, events: this.events });
    definition.actions.forEach((action) => {
      var actionListeners = this.parseAction(action, methods);
      actionListeners.forEach((listener) => listeners.push(listener));
    });

    // Add default Help listener
    listeners.push(this._helpListener(rootPath));
    return { core: methods, listeners: listeners };
  }

  parseTextMessage(textMessage) {
    let mentioned = false;

    if (!textMessage) {
      textMessage = '';
    }

    let text = textMessage.replace(/<([@#!])?([^>|]+)(?:\|([^>]+))?>/g, (m, type, link, label) => {
      switch (type) {
        case '@': {
          if (label) {
            return `@${label}`;
          }

          const user = this.adapter.getUserById(link);
          if (user) {
            return `@${user.name}`;
          }

          break;
        }
        case '#': {
          if (label) {
            return `#${label}`;
          }

          const channel = this.adapter.getChannelById(link);
          if (channel) {
            return `#${channel.name}`;
          }

          break;
        }
        case '!':
          if (['channel', 'group', 'everyone'].indexOf(link) !== -1) {
            return `@${link}`;
          }

          break;
        default:
          link = link.replace('/^mailto:/', '');
          if ((label) && (link.indexOf(label) === -1)) {
            return `${label}(${link})`;
          }
          return link.replace(/https?:\/\//, '');
      }
    });

    text = text.split(' ').filter(x => x !== '').join(' ');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&amp;/g, '&');

    const botMatcher = new RegExp(`@${this.adapter.bot.name}:?`);
    if (text.match(botMatcher)) {
      mentioned = true;
      text = text.split(botMatcher).map(x => x.trim()).join(' ').trim();
    }

    return {
      text,
      mentioned
    };
  }

  parseMessage(message) {
    const msg = parseMessage(message);
    const parsedText = this.parseTextMessage(msg.text);

    msg.text = parsedText.text;
    msg.mentioned = parsedText.mentioned;
    msg.from = this.adapter.getUserById(msg.from);
    msg.channel = this.adapter.getChannelGroupOrDMById(msg.channel);
    return msg;
  }

  parseAction(action, core) {
    logger.debug(`Parsing action "${action.function}"...`);
    const fn = core[action.function];
    if (!fn) {
      logger.debug(`Missing action "${action.function}". Core definition: ${JSON.stringify(core, null, 2)}`);
      throw new Error('Unable to parse definition. Function not found');
    }

    const actionListeners = this._parseAliases(action, core);
    return actionListeners;
  }

  buildPremessageFunction(message, fn) {
    var messages = Array.isArray(message) ? message : [message];
    return !message ? fn : (req, res) => {
      res.text(messages[Math.floor(Math.random() * messages.length)]);
      fn(req, res);
    };
  }

  _parseAliases(action, core) {
    const actionListeners = [];
    const type = action.type || 'text';
    const fn = this.buildPremessageFunction(action.premessage, core[action.function]);

    action.aliases.forEach((alias) => {
      var l = new Listener({ expression: alias, type: type, handler: fn, acls: action.acls }, this.adapter);
      l.field = action.field; // Only available for Attachment Listeners
      actionListeners.push(l);
    });

    return actionListeners;
  }

  _helpListener(rootPath) {
    const helpListener = {
      expression: 'help',
      type: 'text',
      handler: require('./help')(rootPath),
      acls: { mention: true }
    };

    return new Listener(helpListener, this.adapter);
  }
};
