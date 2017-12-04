'use strict';

module.exports = class Request {
  constructor(data) {
    this.message = data.message;
    this.from = this.message.from;
    if (this.from) {
      this.from.name = this.from.profile && this.from.profile.display_name;
    }

    this.to = this.message.channel;
    this.channel = this.to;
    this.params = data.params;
    delete data.params;
  }
};
