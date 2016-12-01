/*eslint no-unused-expressions:0*/

let sinon = require('sinon');
require('sinon-as-promised');
let expect = require('chai').expect;

let MessageServer = require('../index.js').server;

describe('Server', () => {
  let sandbox;
  let server;

  before(() => {

  });

  beforeEach(() => {
    server = new MessageServer('0');

    sandbox = sinon.sandbox.create();
    sandbox.stub(server.socket, 'bind', ({port}, cb) => cb());
    sandbox.stub(server.socket, 'send').resolves(message => JSON.parse(message));
    sandbox.spy(server, '_parseMessage');
    sandbox.spy(server, '_shareClients');
    sandbox.spy(server, '_updateClientInfo');
    sandbox.spy(server, '_receiveClientList');
    sandbox.spy(server, '_sendClientMessages');
    sandbox.spy(server, '_receiveClientMessage');
    sandbox.spy(server, '_confirmClientMessage');
    sandbox.spy(server, '_forwardClientMessage');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#_parseMessage', () => {

    let reqInfo = {
      address: '0.0.0.0',
      port: 40
    };

    let message = {
      sequence: 0,
      type: '',
      source: 4534,
      destination: 5555,
      payload: ''
    };

    it('routes client lists to the correct function', () => {
      message.type = 'CLIENTS';
      server._parseMessage(JSON.stringify(message), reqInfo);
      expect(server._receiveClientList.called).to.be.true;
    });

    it('routes get requests to the correct function', () => {
      message.type = 'GET';
      server._parseMessage(JSON.stringify(message), reqInfo);
      expect(server._sendClientMessages.called).to.be.true;
    });
    it('routes send requests to the correct function', () => {
      message.type = 'SEND';
      server._parseMessage(JSON.stringify(message), reqInfo);
      expect(server._receiveClientMessage.called).to.be.true;
    });
    it('routes ack requests to the correct function', () => {
      message.type = 'ACK';
      server._parseMessage(JSON.stringify(message), reqInfo);
      expect(server._confirmClientMessage.called).to.be.true;
    });

  });

  describe('#_updateClientInfo', () => {

    it('updates servers local info about a client', () => {

      server.clients[55] = {
        life: 2,
        destination: 1,
        address: {
          ip: '0.0.0.0',
          port: 0
        }
      };

      let msg = {
        source: 55,
        payload: ''
      };

      let address = {
        ip: '1.0.0.0',
        port: 40
      };

      server._updateClientInfo(msg, address);
      expect(server.clients[55].life).to.equal(7);
      expect(server.clients[55].address.ip).to.equal('1.0.0.0');
    });

    it('adds a new record for new clients', () => {
      let msg = {
        source: 66,
        payload: ''
      };

      let address = {
        ip: '2.0.0.0',
        port: 40
      };

      server._updateClientInfo(msg, address);
      expect(server.clients[66].life).to.equal(5);
      expect(server.clients[66].address.ip).to.equal('2.0.0.0');
    });

  });

  describe('#_shareClients', () => {

    it('sends clients to a peer', done => {
      server.clients = {1: {life: 1, destination: server.id, address: 'clientAddress'}};
      server.peers = {
        2: {
          ip: '0.0.0.0',
          port: '0'
        }
      };

      server._shareClients();
      expect(server.socket.send.called).to.be.true;
      let args = JSON.parse(server.socket.send.args[0][0]);

      expect(args.sequence).to.eql(0);
      expect(args.destination).to.eql('2');
      expect(args.payload).to.eql(server.clients);
      done();
    });

    it('sends clients to multiple peers', done => {
      server.clients = {1: {life: 1, destination: server.id, address: 'clientAddress'}};
      server.peers = {
        4: {
          ip: '0.0.0.0',
          port: '0'
        },
        3: {
          ip: '2.2.2.2',
          port: '40'
        }
      };

      server._shareClients();
      expect(server.socket.send.called).to.be.true;
      let args = JSON.parse(server.socket.send.args[0][0]);
      let address = server.socket.send.args[0][2];

      expect(address).to.equal('2.2.2.2');
      expect(args.sequence).to.eql(0);
      expect(args.destination).to.eql('3');
      expect(args.payload).to.eql({1: {life: 0, destination: server.id, address: 'clientAddress'}});

      args = JSON.parse(server.socket.send.args[1][0]);
      address = server.socket.send.args[1][2];

      expect(address).to.equal('0.0.0.0');
      expect(args.sequence).to.eql(0);
      expect(args.destination).to.eql('4');
      expect(args.payload).to.eql({1: {life: 0, destination: server.id, address: 'clientAddress'}});

      expect(server.clients).to.eql({1: {life: 0, destination: server.id, address: 'clientAddress'}});
      done();
    });
  });

  describe('#_receiveClientList', () => {

    it('recieves a client list and saves it', done => {
      let clientMessage = {
        sequence: 0,
        type: 'CLIENTS',
        source: '4',
        destination: server.id,
        payload: {
          1342: {
            life: 0,
            address: '0.0.0.0',
            destination: '2'
          },
          3233: {
            life: 4,
            address: '1.0.0.0',
            destination: '0'
          },
          4534: {
            life: 10,
            address: '2.0.0.0',
            destination: '5'
          }
        }
      };

      server._receiveClientList(clientMessage);

      expect(server.clients[1342]).to.not.exist;
      expect(server.clients[3233]).to.exist;
      expect(server.clients[4534]).to.exist;

      expect(server.clients[4534].life).to.equal(10);
      expect(server.clients[3233].life).to.equal(4);
      done();
    });

  });

  describe('#_receiveClientMessage', () => {

    it('doesnt update client info if missing', done => {
      let msg = {
        destination: 4534,
        source: 4534
      };

      let address = {
        ip: '127.0.0.1',
        port: '40'
      };

      server._updateClientInfo(msg, address);
      server._receiveClientMessage(msg);
      expect(server._updateClientInfo.calledTwice).to.be.false;
      expect(server.messages[4534]).to.exist;
      done();
    });

    it('creates message bucket if missing', done => {
      let msg = {
        destination: 33,
        source: 44,
        payload: ''
      };

      let address = {
        ip: '127.0.0.1',
        port: '40'
      };

      server._receiveClientMessage(msg, address);
      expect(server.messages[33]).to.exist;
      done();
    });

    it('forwards a message if the server isnt the client origin', done => {

      let clientMessage = {
        sequence: 0,
        type: 'CLIENTS',
        source: '4',
        destination: server.id,
        payload: {
          1342: {
            life: 0,
            address: '0.0.0.0',
            destination: '2'
          },
          3233: {
            life: 4,
            address: '1.0.0.0',
            destination: '0'
          },
          4534: {
            life: 10,
            address: '2.0.0.0',
            destination: '5'
          }
        }
      };

      server.peers = {
        4: {
          ip: '1.1.1.1',
          port: 40
        }
      };

      server._receiveClientList(clientMessage);

      let msg = {
        destination: 4534,
        source: 3233
      };

      let address = {
        ip: '127.0.0.1',
        port: '40'
      };

      server._receiveClientMessage(msg, address);
      expect(server.messages[4534]).to.exist;
      expect(server.messages[4534].length).to.equal(0);
      expect(server._forwardClientMessage.called).to.be.true;
      done();
    });

    it('stores the message if the server is the client origin', done => {

      let clientMessage = {
        sequence: 0,
        type: 'CLIENTS',
        source: '4',
        destination: server.id,
        payload: {
          1342: {
            life: 0,
            address: '0.0.0.0',
            destination: '2'
          },
          3233: {
            life: 3,
            address: '1.0.0.0',
            destination: '0'
          },
          4534: {
            life: 10,
            address: '2.0.0.0',
            destination: '5'
          }
        }
      };

      server.peers = {
        4: {
          ip: '1.1.1.1',
          port: 40
        }
      };

      server._receiveClientList(clientMessage);

      let msg = {
        destination: 3233,
        source: 4534
      };

      let address = {
        ip: '127.0.0.1',
        port: '40'
      };

      server._updateClientInfo({source: 3233, destination: 4534}, address);
      server._receiveClientMessage(msg, address);
      expect(server.messages[3233]).to.exist;
      expect(server.messages[3233].length).to.equal(1);
      expect(server._forwardClientMessage.called).to.be.false;
      done();
    });

  });

  describe('#_sendClientMessages', () => {

    it('sends requested messages', done => {
      let msg = {
        destination: 33,
        source: 44,
        payload: 'hi'
      };

      let address = {
        ip: '127.0.0.1',
        port: '40'
      };

      server._receiveClientMessage(msg, address);

      let message = {
        sequence: 0,
        type: 'GET',
        source: 33,
        destination: '',
        payload: ''
      };

      server._sendClientMessages(message, address);
      let args = server.socket.send.args[0];
      expect(args[0]).to.equal(JSON.stringify(msg));
      expect(args[1]).to.equal('40');
      done();
    });

  });

  describe('#_confirmClientMessage', () => {

    it('removes messages from the bucket', () => {
      let msg = {
        sequence: 0,
        type: 'SEND',
        destination: 33,
        source: 44,
        payload: 'hi'
      };

      let address = {
        ip: '127.0.0.1',
        port: '40'
      };


      let get = {
        sequence: 0,
        type: 'GET',
        source: 33,
        destination: null,
        payload: null
      };


      let confirm = {
        sequence: 0,
        type: 'ACK',
        source: 33,
        destination: null,
        payload: null
      };

      server._receiveClientMessage(msg, address);
      server._sendClientMessages(get, address);
      expect(server.messages[33].length).to.equal(1);
      server._confirmClientMessage(confirm, address);
      expect(server.messages[33].length).to.equal(0);

    });
  });
});
