//nodejs native udp datagram socket library
const dgram = require('dgram');
const dotenv = require('dotenv');
const _ = require('lodash');
const uuid = require('uuid');
const readline = require('readline');

/* Message Structure:

  sequence:
  type:
  source:
  destination:

 */

class MessageClient {

  constructor({messageServer = null, id = uuid.v4(), prompt = true} = {}) {
    dotenv.load({silent: true, path: './client/.env'});

    if (!messageServer) messageServer = process.env.MESSAGE_SERVER;

    this.server = {
      ip: messageServer.split(':')[0],
      port: messageServer.split(':')[1]
    };

    this.prompt = prompt;
    this.id = id;
    this.socket = dgram.createSocket({type: 'udp4'});
    this.messages = [];
    this.messageIndex = 0;
    this.intervals = [];

    this.socket.on('message', this._recieveMessage.bind(this));
  }

  connect(port = process.env.PORT) {
    return this.socket.bind({port}, err => {
      if (err) throw err;
      console.log(`Client ${this.id}: Connected`);

      if (this.prompt) {
        let rl = readline.createInterface(process.stdin, process.stdout);
        rl.setPrompt('> ');
        rl.prompt();

        rl.on('line', line => {
          if (line === 'close') rl.close();
          line = line.split(' ');
          let destination = line.shift();
          let message = line.join(' ');
          this._sendMessage(destination, message);

          rl.prompt();
        });

        rl.on('close', () => {
          process.exit(0);
        });
      }

      this._getMessages();
      if (this.prompt) this.intervals.push(setInterval(this._displayMessages.bind(this), 1000));
      this.intervals.push(setInterval(this._getMessages.bind(this), 250));
    });
  }

  close() {
    return this.socket.close(() => this.intervals.map(interval => clearInterval(interval)));
  }

  _displayMessages() {
    if (!this.messages.length) return;
    let sorted = _.sortBy(this.messages, ['sequence']);
    sorted.map(message => console.log(`
> ${message.source}: ${message.payload}
>`));
    this.messages = [];
  }

  _recieveMessage(msg) {
    msg = JSON.parse(msg.toString());
    if (msg.destination !== this.id) return;
    console.log(`Client ${this.id}: recieved message ${msg.sequence} from ${msg.source}`);
    this.messages.push(msg);

    let ack = {
      sequence: msg.sequence,
      type: 'ACK',
      destination: null,
      source: this.id,
      payload: null
    };

    this.socket.send(JSON.stringify(ack), this.server.port, this.server.ip);
  }

  _getMessages() {
    console.log(`Client ${this.id}: sent get request`);

    let get = {
      sequence: 0,
      type: 'GET',
      destination: this.id,
      source: this.id,
      payload: null
    };

    this.socket.send(JSON.stringify(get), this.server.port, this.server.ip);
  }

  _sendMessage(destinationClient, msg) {

    ++this.messageIndex;
    console.log(`Client ${this.id}: sent message ${this.messageIndex}`);
    let message = {
      sequence: this.messageIndex,
      type: 'SEND',
      destination: destinationClient,
      source: this.id,
      payload: msg
    };

    this.socket.send(JSON.stringify(message), this.server.port, this.server.ip);
  }

}


exports.client = MessageClient;
