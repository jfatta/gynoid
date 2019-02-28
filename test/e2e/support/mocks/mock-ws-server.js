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
    if (this.clientConnection) {
      this.clientConnection.send(message);
    }
  }

  closeConnection() {
    if (this.clientConnection) {
      this.clientConnection.close();
    }
  }
}

module.exports = MockWSServer;
