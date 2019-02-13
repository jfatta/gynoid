const inherits = require('util');
const ws = require('ws');

class MockWSServer extends ws.Server {
  constructor(opts) {
    super(opts);
    this.on('connection', function handleMockWSServerConnection(newWs) {
      this.clientConnection = newWs;
    });
  }

  sendMessage(message) {
    this.clientConnection.send(JSON.stringify(message));
  }

  closeConnection() {
    this.clientConnection.close();
  }
}

module.exports = MockWSServer;
