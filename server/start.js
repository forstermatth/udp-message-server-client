const MessageServer = require('./index').server;

let me = new MessageServer(process.argv[0]);
me.connect(process.argv[2]);
