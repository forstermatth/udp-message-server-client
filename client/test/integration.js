/*eslint no-unused-expressions:0*/

let sinon = require('sinon');
require('sinon-as-promised');
let expect = require('chai').expect;

let MessageServer = require('../../server').server;
let MessageClient = require('../index.js').client;

describe('Integration: Client', function () {
  this.timeout(0);
  let sandbox;

  before(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Client -> Server -> Client', () => {
    let clientOne;
    let clientTwo;
    let serverOne;

    before(() => {
      serverOne = new MessageServer();

      clientOne = new MessageClient({
        messageServer: '127.0.0.1:43001',
        prompt: false
      });
      clientTwo = new MessageClient({
        messageServer: '127.0.0.1:43001',
        prompt: false
      });

      serverOne.connect(43001);
      clientOne.connect(43010);
      clientTwo.connect(43020);
    });

    after(() => {
      serverOne.close();
      clientOne.close();
      clientTwo.close();
    });

    it('sends messages from one client to the next', done => {

      function sendMessages() {
        clientOne._sendMessage(clientTwo.id, 'Hello');
        clientTwo._sendMessage(clientOne.id, 'Hi!');
      }

      function getMessages() {
        clientOne._getMessages();
        clientTwo._getMessages();
      }

      function test() {
        expect(clientOne.messages.length).to.equal(1);
        expect(clientOne.messages[0].payload).to.equal('Hi!');

        expect(clientTwo.messages.length).to.equal(1);
        expect(clientTwo.messages[0].payload).to.equal('Hello');
        done();
      }

      sendMessages();
      setTimeout(getMessages, 10);
      setTimeout(test, 20);
    });
  });

  describe('Client -> Server <-> Server -> Client', () => {
    let clientOne;
    let clientTwo;
    let serverOne;
    let serverTwo;

    let peers = {
      'server-1': {
        ip: '127.0.0.1',
        port: 43001
      },
      'server-2': {
        ip: '127.0.0.1',
        port: 43002
      }
    };

    before(() => {
      serverOne = new MessageServer('server-1', peers);
      serverTwo = new MessageServer('server-2', peers);


      clientOne = new MessageClient({
        messageServer: '127.0.0.1:43001',
        prompt: false
      });
      clientTwo = new MessageClient({
        messageServer: '127.0.0.1:43002',
        prompt: false
      });

      serverOne.connect(43001);
      serverTwo.connect(43002);
      clientOne.connect(43010);
      clientTwo.connect(43020);
    });

    after(() => {
      serverOne.close();
      serverTwo.close();
      clientOne.close();
      clientTwo.close();
    });

    it('sends messages from one client to the next', done => {

      function sendMessages() {
        clientOne._sendMessage(clientTwo.id, 'Hello');
        clientTwo._sendMessage(clientOne.id, 'Hi!');
      }

      // function getMessages() {
      //   clientOne._getMessages();
      //   clientTwo._getMessages();
      // }

      function test() {
        expect(clientOne.messages.length).to.equal(1);
        expect(clientOne.messages[0].payload).to.equal('Hi!');

        expect(clientTwo.messages.length).to.equal(1);
        expect(clientTwo.messages[0].payload).to.equal('Hello');
        done();
      }

      sendMessages();
      setTimeout(test, 1000);
    });
  });

  describe('Client -> Server -> Server -> Server -> Client', () => {
    let clientOne;
    let clientTwo;
    let serverOne;
    let serverTwo;
    let serverThree;
    let serverFour;
    let serverFive;

    let peersOne = {
      'server-1': {
        ip: '127.0.0.1',
        port: 43001
      },
      'server-2': {
        ip: '127.0.0.1',
        port: 43002
      }
    };

    let peersTwo = {
      'server-1': {
        ip: '127.0.0.1',
        port: 43001
      },
      'server-2': {
        ip: '127.0.0.1',
        port: 43002
      },
      'server-3': {
        ip: '127.0.0.1',
        port: 43003
      }
    };

    let peersThree = {
      'server-2': {
        ip: '127.0.0.1',
        port: 43002
      },
      'server-3': {
        ip: '127.0.0.1',
        port: 43003
      },
      'server-4': {
        ip: '127.0.0.1',
        port: 43004
      }
    };

    let peersFour = {
      'server-3': {
        ip: '127.0.0.1',
        port: 43003
      },
      'server-4': {
        ip: '127.0.0.1',
        port: 43004
      },
      'server-5': {
        ip: '127.0.0.1',
        port: 43005
      }
    };

    let peersFive = {
      'server-4': {
        ip: '127.0.0.1',
        port: 43004
      },
      'server-5': {
        ip: '127.0.0.1',
        port: 43005
      }
    };

    before(() => {
      serverOne = new MessageServer('server-1', peersOne);
      serverTwo = new MessageServer('server-2', peersTwo);
      serverThree = new MessageServer('server-3', peersThree);
      serverFour = new MessageServer('server-4', peersFour);
      serverFive = new MessageServer('server-5', peersFive);

      clientOne = new MessageClient({
        messageServer: '127.0.0.1:43001',
        prompt: false
      });
      clientTwo = new MessageClient({
        messageServer: '127.0.0.1:43005',
        prompt: false
      });

      serverOne.connect(43001);
      serverTwo.connect(43002);
      serverThree.connect(43003);
      serverFour.connect(43004);
      serverFive.connect(43005);
      clientOne.connect(43010);
      clientTwo.connect(43020);
    });

    after(() => {
      serverOne.close();
      serverTwo.close();
      serverThree.close();
      serverFour.close();
      serverFive.close();
      clientOne.close();
      clientTwo.close();
    });

    it('sends messages from one client to the next', done => {

      function sendMessages() {
        clientOne._sendMessage(clientTwo.id, 'Hello');
        clientTwo._sendMessage(clientOne.id, 'Hi!');
      }

      function sendSecondMessages() {
        clientOne._sendMessage(clientTwo.id, '2 + 2 = 3!');
        clientTwo._sendMessage(clientOne.id, '2 + 2 = 4!');
      }

      function test() {
        expect(clientOne.messages.length).to.equal(1);
        expect(clientOne.messages[0].payload).to.equal('Hi!');

        expect(clientTwo.messages.length).to.equal(1);
        expect(clientTwo.messages[0].payload).to.equal('Hello');
      }

      function testTwo() {

        console.log(clientOne.messages);
        console.log(clientTwo.messages);

        expect(clientOne.messages.length).to.equal(2);
        expect(clientOne.messages[1].payload).to.equal('2 + 2 = 4!');

        expect(clientTwo.messages.length).to.equal(2);
        expect(clientTwo.messages[1].payload).to.equal('2 + 2 = 3!');
        done();
      }

      sendMessages();
      setTimeout(test, 4000);
      setTimeout(sendSecondMessages, 4500);
      setTimeout(testTwo, 8000);
    });
  });
});
