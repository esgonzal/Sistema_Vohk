const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');

function createApp(service) {
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    const allowedOrigins = ['http://localhost:4200', 'https://app.vohk.cl'];
    app.use(cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error(`CORS not allowed for this origin: ${origin}`));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }));
    app.options('*', cors());
    // Liveness only: this does not check the database or external providers.
    app.get('/healthz', (req, res) => res.json({ service, status: 'ok' }));
    return app;
}

function startServer(app, { service, port, attachWebSocket }) {
    const server = http.createServer(app);
    if (attachWebSocket) attachWebSocket(server);
    server.listen(Number(port), process.env.HOST || '127.0.0.1', () => {
        console.log(`[${service}] Listening on ${JSON.stringify(server.address())}`);
    });
    return server;
}

module.exports = { createApp, startServer };
