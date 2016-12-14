const MessageClient = require('./index').client;

let me = new MessageClient({messageServer: process.argv[2]});
me.connect(process.argv[3], process.argv[4]);
