'use strict';

const logger = require('../logger');

function stripEmoji(emoji) {
  const noTagEmoji = emoji.replace(/:?([^:]+):?/, '$1');
  return noTagEmoji.replace(/:+skin-tone.*/, '');
}

module.exports = class Response {
  constructor(message, adapter) {
    this.adapter = adapter;
    this.message = message.message;
  }

  getChannelByName(username) {
    return this.adapter.getChannelByName(username);
  }

  getTargetId(name) {
    if (!name) {
      return this.message.channel.id;
    }

    if (name[0] === '@' || name[0] === '#') {
      name = name.slice(1, name.length);
    }

    const target = this.adapter.getDMByName(name) || this.adapter.getChannelOrGroupByName(name);
    return target && target.id;
  }

  text(text, channel) {
    logger.info(`Sending text message: ${text}`);
    const id = this.getTargetId(channel || '');
    this.adapter.text(text, id);

    return this;
  }

  attachment(attachment, channel) {
    const id = this.getTargetId(channel || '');
    this.adapter.attachment(attachment, id);

    return this;
  }

  upload(file, channel) {
    const id = this.getTargetId(channel || '');
    this.adapter.upload(file, id);

    return this;
  }

  addReaction(emoji, messageId, channel) {
    return this.reaction(emoji, messageId, channel);
  }

  reaction(emoji, messageId, channel) {
    messageId = messageId || this.message.timestamp;
    const id = this.getTargetId(channel || '');
    this.adapter.addReaction({
      emoji: stripEmoji(emoji),
      channel: id,
      timestamp: messageId
    });

    return this;
  }

  removeReaction(emoji, messageId, channel) {
    messageId = messageId || this.message.timestamp;
    const id = this.getTargetId(channel || '');
    this.adapter.removeReaction({
      emoji: stripEmoji(emoji),
      channel: id,
      timestamp: messageId
    });

    return this;
  }

  dialog(definition, triggerId) {
    this.adapter.dialog(definition, triggerId);
    return this;
  }

  send() {
    // for backwards compatibility
  }
};
