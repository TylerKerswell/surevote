const express = require('express');
const cors = require('cors');
const initEndpoints = require('./endpoints/endpoints.js');
const path = require('path');


class Server {
    constructor(port) {
        this.port = port;
        this.app = express();
        this.initMiddlewares();
        
        initEndpoints(this.app);
    }

    initMiddlewares() {
        this.app.use(express.json());
        this.app.use('/assets', express.static(path.join(__dirname, '../frontend/test')));
        this.app.use(express.raw({ type: "application/*", limit: "10mb" }));
        this.app.use(cors());
    }


    start() {
        this.server = this.app.listen(this.port, () => {
            console.log(`Server started on http://localhost:${this.port}`);
        });
    }

    stop() {
        this.server.close(() => {
            console.log("Stopped");
        });
    }


}

module.exports = Server;