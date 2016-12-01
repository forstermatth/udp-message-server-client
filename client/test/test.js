/*eslint no-unused-expressions:0*/

let sinon = require('sinon');
require('sinon-as-promised');
let expect = require('chai').expect;

let MessageClient = require('../index.js').client;

describe('Client', () => {
  let client;
  let sandbox;

  beforeEach(() => {
    client = new MessageClient();

    sandbox = sinon.sandbox.create();
    sandbox.spy(console, 'log');
    sandbox.stub(client.socket, 'send');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#_displayMessages', () => {

    it('displays messages in order', () => {

      client.messages = [
        {
          source: 'guy',
          sequence: 1,
          payload: 'one'
        },
        {
          source: 'guy',
          sequence: 0,
          payload: 'zero'
        }
      ];

      client._displayMessages();
      expect(console.log.calledTwice).to.be.true;
      expect(console.log.args[0][0]).to.eql(`
> guy: zero
>`);
      expect(console.log.args[1][0]).to.eql(`
> guy: one
>`);

    });
  });

  describe('#_recieveMessage', () => {
    it('adds the message to the queue and sends acknowledge', () => {
      let message = {
        sequence: 3,
        type: 'SEND',
        source: 'guy',
        destination: client.id,
        payload: 'hello'
      };

      client._recieveMessage(JSON.stringify(message));
      expect(client.messages.length).to.equal(1);
      expect(client.socket.send.args[0][0]).to.equal(JSON.stringify({
        sequence: message.sequence,
        type: 'ACK',
        destination: null,
        source: client.id,
        payload: null
      }));
    });
  });

  describe('#_getMessages', () => {
    it('sends a get request', () => {
      client._getMessages();
      expect(client.socket.send.args[0][0]).to.equal(JSON.stringify({
        sequence: 0,
        type: 'GET',
        destination: client.id,
        source: client.id,
        payload: null
      }));
    });
  });

  describe('#_sendMessage', () => {
    it('sends a message with the destination defined', () => {

      client._sendMessage('client-2', 'hello');
      expect(client.socket.send.args[0][0]).to.equal(JSON.stringify({
        sequence: 1,
        type: 'SEND',
        destination: 'client-2',
        source: client.id,
        payload: 'hello'
      }));
    });
  });

});
