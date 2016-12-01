//nodejs native udp datagram socket library
const dgram = require('dgram');
const dotenv = require('dotenv');
const _ = require('lodash');
const uuid = require('uuid');

/*

  Message Structure:

  {
    sequence:
    type:
    source:
    destination:
    payload:
  }


  Client Record Structure:

  {
    clientId: {
      destination: serverID,
      address: clientAddress,
      life: 0
    }
  }

  Peer Structure:

  id: {
    ip:
    port:
  }
}

 */

class MessageServer {

  constructor(id = uuid.v4(), peers = null) {
    dotenv.load({silent: true, path: './server/.env'});
    this.SHARE_DELAY = process.env.SHARE_DELAY;

    this.id = id;
    this.peers = peers;
    this.socket = dgram.createSocket({type: 'udp4'});
    this.clients = {};
    this.messages = {};
    this.intervals = [];

    if (!this.peers) this.peers = process.env.PEERS;
    this.socket.on('message', this._parseMessage.bind(this));
  }

  connect(port = process.env.PORT) {
    return this.socket.bind({port}, err => {
      if (err) throw err;
      console.log(`Server ${this.id}: Connected`);

      this.intervals.push(setInterval(this._shareClients.bind(this), this.SHARE_DELAY));
    });
  }

  close() {
    return this.socket.close(() => this.intervals.map(interval => clearInterval(interval)));
  }

  // Route message to proper handler
  _parseMessage(msg, reqInfo) {
    msg = JSON.parse(msg.toString());

    let address = {
      address: reqInfo.ip,
      port: reqInfo.port
    };

    switch (msg.type) {
      case 'CLIENTS': return this._receiveClientList(msg);
      case 'FORWARD': return this._receiveClientMessage(msg);
      case 'BUCKET': return this._receiveMessageBucket(msg);
      case 'SEND': return this._receiveClientMessage(msg, address);
      case 'GET': return this._sendClientMessages(msg, address);
      case 'ACK': return this._confirmClientMessage(msg, address);
      default: return null;
    }
  }

  _updateClientInfo(msg, address = {}) {
    if (!msg.source) return;
    let client = this.clients[msg.source];
    console.log(`Server ${this.id}: Updated client info ${msg.source}`);

    if (client) {
      if (client.life < 0) client.life = 0;
      client.life += 5;
    } else {
      client = {
        life: 5
      };
    }

    client.destination = this.id;
    client.address = address;

    this.clients[msg.source] = client;
  }

  // send client list to peers
  _shareClients() {
    if (_.isEmpty(this.peers)) return;
    console.log(`${this.id}: Sharing Clients`);
    this.clients = _.mapValues(this.clients, client => {
      if (client.life >= 0) client.life--;
      return client;
    });

    let message = {
      sequence: 0,
      type: 'CLIENTS',
      source: this.id,
      destination: null,
      payload: this.clients
    };

    _.mapValues(this.peers, (peer, id) => {
      if (id === this.id) return;
      message.destination = id;
      return this.socket.send(JSON.stringify(message), peer.port, peer.ip);
    });
  }

  _receiveClientList(msg) {
    console.log(`Server ${this.id}: Recieved client info from ${msg.source}`);

    // add clients and known server to client list
    // overwrites any known client / server pairs
    let server = msg.source;
    let newClientInfo = msg.payload;
    this.clients = _.reduce(newClientInfo, (currentClients, clientRecord, id) => {
      // Client info is too stale
      if (clientRecord.life <= 0) return currentClients;
      // We know about this client already, whos info is more recent?
      if (currentClients[id] && currentClients[id].life >= clientRecord.life) return currentClients;

      // Setup our knowledge of the client
      clientRecord.destination = server;
      currentClients[id] = clientRecord;
      return currentClients;
    }, this.clients);

    this._moveBuckets();
  }

  _moveBuckets() {
    _.mapValues(this.messages, (bucket, key) => {
      let clientInfo = this.clients[key];
      if (!clientInfo) return;
      if (!bucket.length) return;
      if (clientInfo.destination === this.id) return;
      let destination = this.peers[clientInfo.destination];

      let message = {
        sequence: 0,
        type: 'BUCKET',
        source: this.id,
        destination: clientInfo.destination,
        payload: {
          clientId: key,
          bucket
        }
      };

      this.messages[key] = [];
      return this.socket.send(JSON.stringify(message), destination.port, destination.ip);
    });
  }

  _receiveMessageBucket(msg) {
    let clientId = msg.payload.clientId;
    let bucket = msg.payload.bucket;

    if (!this.messages[clientId]) this.messages[clientId] = [];
    this.messages[clientId] = this.messages[clientId].concat(bucket);
  }

  _sendClientMessages(msg, address = {}) {
    console.log(`Server ${this.id}: sending client messages to ${msg.source}`);

    this._updateClientInfo(msg, address);
    let clientId = msg.source;

    if (!this.messages[clientId]) return;
    //sort bucket?
    this.messages[clientId].map(message => this.socket.send(JSON.stringify(message), address.port, address.ip));
  }

  _forwardClientMessage(msg, targetPeer) {
    console.log(`Server ${this.id} forwarding message to ${targetPeer.port}`);
    msg.type = 'FORWARD';
    return this.socket.send(JSON.stringify(msg), targetPeer.port, targetPeer.ip);
  }

  _receiveClientMessage(msg, address = null) {
    console.log(`Server ${this.id}: Recieved client message from ${msg.source}`);

    if (address) this._updateClientInfo(msg, address);
    let destinationClient = msg.destination;
    let clientInfo = this.clients[destinationClient];
    // initialize message bucket
    if (!this.messages[destinationClient]) this.messages[destinationClient] = [];

    // Forward the message to a more relevant server
    if (clientInfo && clientInfo.destination !== this.id) {
      let targetPeer = this.peers[clientInfo.destination];
      return this._forwardClientMessage(msg, targetPeer);
    }

    this.messages[destinationClient].push(msg);
  }

  _confirmClientMessage(msg, address = {}) {
    console.log(`Server ${this.id}: Confirmed client receipt from ${msg.source}`);

    this._updateClientInfo(msg, address);
    let messages = this.messages[msg.source];
    _.remove(messages, message => message.sequence === msg.sequence);
    this.messages[msg.source] = messages;
  }

}

exports.server = MessageServer;
