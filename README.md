# Message Server and Client

> Distance Vector routing with the ability to reroute messages to more
> relevant servers when clients move.

__Matt Forster__  
001044201  
__Daya Guar__  
2016-11-30

### Requirements

-   Nodejs + NPM: `wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.32.1/install.sh | bash`

### Install and run

1.  `npm install`: _install package dependencies_
2.  `npm run start:server -- <server id> <server port>` _start a server_
3.  `npm run start:client -- <server address> <client port>` _start a client_

To define peers for a server when starting from the cli, add the peer object to it's environment file under `PEERS`.

### Run Tests

-   `npm test`
-   `npm test:client`
-   `npm test:server`

Tests include senarios for:

-   Two clients and a single server: `Client -> Server ->  Client`
-   Two clients and two servers: `Client -> Server <-> Server -> Client`
-   Two clients and five servers with limited knowledge: `Client -> Server -> Server <-> Server <-> Server -> Server -> Client`


## Implementation

__Socket Library Used:__ [Nodejs Native Datagram Sockets](https://nodejs.org/api/dgram.html) 

Servers use a distance vector sharing technique with the aim to create efficient forwarding routes. The weights on the routes are increased when clients communicate, and decrease over time (each server tick).  
  
This allows for servers who communicate often with clients to receive their messages, and also allows for messages to be moved to more relevant servers when the clients change connections. Idle information is not propagated, and only recent information is saved.

__Server Implementation:__ `server/index.js`  
__Client Implementation:__ `client/index.js`
