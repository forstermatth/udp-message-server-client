const MessageClient = require('./index').client;

let me = new MessageClient(process.argv[0]);
me.connect(process.argv[1]);
