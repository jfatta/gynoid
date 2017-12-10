'use strict';

module.exports = class ACLs {
  constructor(acls) {
    this.acls = acls || {};

    // Defaults
    this.acls.dm = this.acls.hasOwnProperty('dm') ? this.acls.dm : true;
    this.acls.explicitMention = this.acls.hasOwnProperty('explicitMention') ? this.acls.explicitMention : false;
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

    return this.acls.dm;
  }

  validMention(message) {
    if (message.channel.is_im) {
      return this.acls.dm;
    }

    return !this.acls.explicitMention || message.mentioned;
  }

  isValid(message) {
    return this.validFrom(message) && this.validChannelOrDM(message) && this.validMention(message);
  }
};
