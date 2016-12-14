const MessageServer = require('./index').server;

let me = new MessageServer(process.argv[2]);
me.connect(process.argv[3]);
