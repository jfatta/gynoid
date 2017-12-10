'use strict';

const Socket = require('socket.io-client');
const env = require('../env');
const logger = require('../logger');
const socketServerUrl = env.WS_SOCKET;

module.exports = class SocketEvents {
  constructor() {
    this.socket = Socket(socketServerUrl);
  }

  reset() {
    this.socket.removeAllListeners();
  }

  on(event, handler) {
    this.socket.on(event, (msg) => {
      try {
        handler(msg);
      } catch(e) {
        logger.error(`Unable to handle socket event "${event}" ${e}`);
      }
    });
  }

  off(event, handler) {
    this.socket.off(event, handler);
  }

  emit(event, msg) {
    if (!event) {
      throw new Error('Missing event name');
    }

    msg = msg || {};
    msg.callback_id = event;
    this.socket.emit(event, { payload: JSON.stringify(msg)});
  }
}
