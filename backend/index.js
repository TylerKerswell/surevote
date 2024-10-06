const express = require('express');
const cors = require('cors');
const initEndpoints = require('./endpoints/endpoints.js');
const path = require('path');
const serverless = require('serverless-http');

// Initialize Express app
const app = express();

// Initialize middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files
app.use('/assets', express.static(path.join(__dirname, '../public')));

// Initialize your endpoints
initEndpoints(app);

// Export the app and handler
module.exports = app;
module.exports.handler = serverless(app);