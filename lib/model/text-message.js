'use strict';

const Attachment = require('./attachment');
const BaseMessage = require('./base-message');

module.exports = class Message extends BaseMessage {
  constructor(data) {
    super(data);
    this.text = data.text;
    this.value = { text: data.text };
    this.parseAttachments(data.attachments);
  }

  parseAttachments(attachments) {
    this.attachments = [];
    if (!attachments || attachments.length === 0) {
      return;
    }

    attachments.forEach((attachment) => this.attachments.push(new Attachment(attachment)));
  }
};
