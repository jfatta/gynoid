'use strict';

module.exports = class ACLs {
  constructor(acls) {
    this.acls = acls || {};

    // Defaults
    this.acls.acceptsDm = this.acls.hasOwnProperty('dm') ? this.acls.acceptsDm : true;
    this.acls.requiresMention = this.acls.hasOwnProperty('requiresMention') ? this.acls.requiresMention : false;
  }

  validFrom(message) {
    return !this.acls.users || this.acls.users.indexOf(message.from.id) >= 0;
  }

  validChannel(message) {
    return !this.acls.channels || this.acls.channels.indexOf(message.channel.name) >= 0;
  }

  validChannelOrDM(message) {
    if (!message.channel.is_im) {
      return this.validChannel(message);
    }

    return this.acls.acceptsDm;
  }

  validMention(message) {
    return !this.acls.requiresMention || message.mentioned;
  }

  isValid(message) {
    return this.validFrom(message) && this.validChannelOrDM(message) && this.validMention(message);
  }
};
