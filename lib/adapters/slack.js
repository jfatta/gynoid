'use strict';

const bind = require('lodash').bind;
const async = require('async');
const RtmClient = require('@slack/client').RtmClient;
const WebClient = require('@slack/client').WebClient;
const MemoryDataStore = require('@slack/client').MemoryDataStore;
const SlackEvents = require('./events-slack');
const Request = require('../extension/request');
const Response = require('../extension/response');
const fs = require('fs');

module.exports = class SlackAdapter {
  constructor(token, request) {
    this.rtm = new RtmClient(token, {
      dataStore: new MemoryDataStore()
    });

    this.webClient = new WebClient(token, {
      maxRequestConcurrency: 1
    });

    this.request = request || require('request');
    this._queue = async.queue(
      bind(this._send, this),
      1
    );
  }

  on(event, handler) {
    this.rtm.on(SlackEvents[event], handler);
  }

  _onAuthenticated(data) {
    this.bot = data.self;
  }

  start() {
    this.rtm.on(SlackEvents.AUTHENTICATED, this._onAuthenticated.bind(this));
    this.rtm.start();
  }

  disconnect() {
    this.rtm.disconnect();
  }

  getDMByName(username) {
    return this.rtm.dataStore.getDMByName(username);
  }

  getUserByName(username) {
    return this.rtm.dataStore.getUserByName(username);
  }

  getChannelOrGroupByName(channel) {
    return this.rtm.dataStore.getChannelOrGroupByName(channel);
  }

  getChannelGroupOrDMById(id) {
    return this.rtm.dataStore.getChannelGroupOrDMById(id);
  }

  getUserById(id) {
    return this.rtm.dataStore.getUserById(id);
  }

  getChannelByName(channel) {
    return this.rtm.dataStore.getChannelByName(channel);
  }

  text(text, channel, threadId) {
    const options = { as_user: true };
    if (threadId) {
      options.thread_ts = threadId;
    }

    this._queue.push((cb) => this.webClient.chat.postMessage(channel, text, options, (err) => cb(err)));
  }

  ephemeral(text, channel, userId) {
    const options = { as_user: true };

    this._queue.push((cb) => this.webClient.chat.postEphemeral(channel, text, userId, options, (err) => cb(err)));
  }

  update(channel, messageTs, text, attachments) {
    this._queue.push((cb) => this.webClient.chat.update(channel, messageTs, text, attachments, (err) => cb(err)));
  }

  attachment(attachment, channel) {
    return new Promise((resolve, reject) => {
      attachment = Array.isArray(attachment) ? attachment : [attachment];
      this.webClient.chat.postMessage(channel, '', {
        attachments: attachment,
        as_user: true
      }, (err, msg) => err ? reject(err) : resolve(msg));
    });
  }

  dialog(definition, triggerId) {
    return this.webClient.dialog.open(definition, triggerId);
  }
  addReaction(react) {
    const options = {
      channel: react.channel,
      timestamp: react.timestamp
    };

    this._queue.push((cb) => this.webClient.reactions.add(react.emoji, options, (err) => cb(err)));
  }

  removeReaction(react) {
    const options = {
      channel: react.channel,
      timestamp: react.timestamp
    };

    this._queue.push((cb) => this.webClient.reactions.remove(react.emoji, options, (err) => cb(err)));
  }

  upload(file, channel) {
    return new Promise((resolve, reject) => {
      const url = 'https://slack.com/api/files.upload';

      const r = this.request.post(url, (err, res, body) => {
        if (err) {
          return reject(err);
        }

        const data = JSON.parse(body);

        if (!data.ok) {
          return reject(new Error(data.error));
        }

        return resolve(data);
      });

      const form = r.form();

      form.append('token', this._api._token);
      form.append('channels', channel);
      form.append('filename', file.filename);
      var fileExtension = file.filename.replace(/.*\.([a-z0-9]+)$/, '$1');
      form.append('filetype', fileExtension);

      /**
       * Slack API expect one of two fields, file or content.
       * file is used when sending multipart/form-data, content
       * is used when sending urlencodedform
       * @see https://api.slack.com/methods/files.upload
       */
      if (file.content instanceof fs.ReadStream) {
        form.append('file', file.content);
      } else {
        form.append('content', file.content);
      }
    });
  }

  buildRequest(data) {
    return new Request(data);
  }

  buildResponse(message) {
    return new Response(message, this);
  }

  _send(task, cb) {
    this._queue.pause();
    task(() => {
      this._queue.resume();
      return cb();
    });
  }
};
