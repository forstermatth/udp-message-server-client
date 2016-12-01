/*eslint no-unused-expressions:0*/

let expect = require('chai').expect;
let MessageServer = require('../index.js').server;
let dgram = require('dgram');

describe('Integration: Server', function () {
  this.timeout(0);
  let serverOne;
  let serverTwo;
  let serverThree;

  let peers = {
    '0010': {
      ip: '127.0.0.1',
      port: 43001
    },
    '0020': {
      ip: '127.0.0.1',
      port: 43002
    },
    '0030': {
      ip: '127.0.0.1',
      port: 43003
    }
  };

  before(() => {
    serverOne = new MessageServer('0010', peers);
    serverTwo = new MessageServer('0020', peers);
    serverThree = new MessageServer('0030', peers);

    serverOne.connect(43001);
    serverTwo.connect(43002);
    serverThree.connect(43003);
  });

  after(() => {
    serverOne.close();
    serverTwo.close();
    serverThree.close();
  });

  it('all servers know about each other', done => {

    expect(serverOne.peers).to.eql(peers);
    expect(serverTwo.peers).to.eql(peers);
    expect(serverThree.peers).to.eql(peers);

    done();
  });

  it('forwards messages through the chain', done => {
    let messageOne = {
      sequence: 0,
      type: 'SEND',
      source: 'client-1',
      destination: 'client-2',
      payload: 'hi'
    };

    let messageTwo = {
      sequence: 0,
      type: 'SEND',
      source: 'client-2',
      destination: 'client-1',
      payload: 'hi'
    };

    function moveOne() {
      serverOne._parseMessage(JSON.stringify(messageOne), {ip: '127.0.0.1', port: '43010'});
      serverTwo._parseMessage(JSON.stringify(messageTwo), {ip: '127.0.0.1', port: '43020'});
    }

    function moveTwo() {
      serverOne._parseMessage(JSON.stringify(messageTwo), {ip: '127.0.0.1', port: '43010'});
      serverTwo._parseMessage(JSON.stringify(messageOne), {ip: '127.0.0.1', port: '43020'});
    }

    function checkOne() {
      expect(serverOne.messages['client-1'].length).to.equal(1);
      expect(serverOne.messages['client-2'].length).to.equal(0);
      expect(serverTwo.messages['client-2'].length).to.equal(1);
      expect(serverTwo.messages['client-1'].length).to.equal(0);

      expect(serverOne.clients['client-1'].destination).to.equal('0010');
      expect(serverOne.clients['client-2'].destination).to.equal('0020');
      expect(serverTwo.clients['client-1'].destination).to.equal('0010');
      expect(serverTwo.clients['client-2'].destination).to.equal('0020');
    }

    function checkTwo() {
      expect(serverOne.messages['client-1'].length).to.equal(0);
      expect(serverOne.messages['client-2'].length).to.equal(2);
      expect(serverTwo.messages['client-2'].length).to.equal(0);
      expect(serverTwo.messages['client-1'].length).to.equal(2);

      expect(serverOne.clients['client-1'].destination).to.equal('0020');
      expect(serverOne.clients['client-2'].destination).to.equal('0010');
      expect(serverTwo.clients['client-1'].destination).to.equal('0020');
      expect(serverTwo.clients['client-2'].destination).to.equal('0010');

      done();
    }

    moveOne();
    setTimeout(checkOne, 1000);
    setTimeout(moveTwo, 2000);
    setTimeout(checkTwo, 3000);
  });

  it('sends messages to clients', done => {
    // create a socket for client-1
    let client = dgram.createSocket({type: 'udp4'});

    client.on('message', msg => {
      msg = JSON.parse(msg);
      expect(msg.destination).to.equal('client-1');
      expect(msg.sequence).to.equal(0);
      client.close();
      done();
    });

    client.bind({port: 43010}, () => {
      let message = {
        sequence: 0,
        type: 'GET',
        source: 'client-1',
        destination: '',
        payload: ''
      };

      client.send(JSON.stringify(message), 43002, '127.0.0.1');
    });

  });

  it('messages get send to clients through forwarding', done => {
    // create a socket for client-1
    let client = dgram.createSocket({type: 'udp4'});

    client.on('message', msg => {
      msg = JSON.parse(msg);
      expect(msg.destination).to.equal('client-2');
      expect(msg.sequence).to.equal(0);
      client.close();
      done();
    });

    function getMessages() {
      let message = {
        sequence: 0,
        type: 'GET',
        source: 'client-2',
        destination: '',
        payload: ''
      };

      client.send(JSON.stringify(message), 43002, '127.0.0.1');
    }

    client.bind({port: 43020}, () => {
      getMessages();
      setTimeout(getMessages, 5000);
    });

  });

});
