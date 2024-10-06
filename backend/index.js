const Server = require('./server.js'); 

const PORT = 3000;

let server = new Server(PORT);

server.start();

