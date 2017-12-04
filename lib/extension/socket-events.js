'use strict';

const Socket = require('socket.io-client');
const env = require('../env');
const socketServerUrl = env.WS_SOCKET;

module.exports = class SocketEvents {
  constructor() {
    this.socket = Socket(socketServerUrl);
  }

  on(event, handler) {
    this.socket.on(event, handler);
  }

  emit(event, msg) {
    if (!event) {
      throw new Error('Missing event name');
    }

    msg = msg || {};
    msg.callback_id = event;
    this.socket.emit('slack_event', { payload: JSON.stringify(msg)});
  }
}
