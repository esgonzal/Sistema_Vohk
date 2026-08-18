const jwt = require('jsonwebtoken');
const { WebSocket, WebSocketServer } = require('ws');
const { getAuthorizedIntercom, HikvisionTalkSession } = require('../services/vohk_app/intercomTalkService');

const PATH = '/api/intercom-talk';
const MAX_SESSION_MS = 10 * 60 * 1000;

function rejectUpgrade(socket, status, message) {
    if (socket.destroyed) return;
    const body = JSON.stringify({ error: message });
    socket.write(
        `HTTP/1.1 ${status} ${status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Bad Request'}\r\n` +
        'Content-Type: application/json\r\n' +
        `Content-Length: ${Buffer.byteLength(body)}\r\n` +
        'Connection: close\r\n\r\n' +
        body
    );
    socket.destroy();
}

function bearerToken(request) {
    const authorization = request.headers.authorization || '';
    return authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
}

function attachIntercomTalkWebSocket(httpServer) {
    const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
    const activeDevices = new Set();

    httpServer.on('upgrade', async (request, socket, head) => {
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname !== PATH) return;
        let reservedDeviceId;

        try {
            const token = bearerToken(request);
            if (!token) return rejectUpgrade(socket, 401, 'Missing bearer token');
            const user = jwt.verify(token, process.env.JWT_SECRET);
            const deviceId = url.searchParams.get('deviceId');
            if (!deviceId) return rejectUpgrade(socket, 400, 'Missing deviceId');
            if (activeDevices.has(deviceId)) return rejectUpgrade(socket, 409, 'Intercom is already in use');

            const intercom = await getAuthorizedIntercom(deviceId, user);
            if (socket.destroyed) return;
            if (activeDevices.has(deviceId)) return rejectUpgrade(socket, 409, 'Intercom is already in use');
            activeDevices.add(deviceId);
            reservedDeviceId = deviceId;

            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request, { deviceId, intercom });
            });
        } catch (error) {
            if (reservedDeviceId) activeDevices.delete(reservedDeviceId);
            const status = error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : error.status || 500;
            rejectUpgrade(socket, status, status === 500 ? 'Could not start intercom talk' : error.message);
        }
    });

    wss.on('connection', async (ws, request, context) => {
        const { deviceId, intercom } = context;
        let closing = false;
        const timeout = setTimeout(() => ws.close(1000, 'Talk session time limit reached'), MAX_SESSION_MS);
        const session = new HikvisionTalkSession(
            intercom,
            (pcm) => {
                if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 256 * 1024) ws.send(pcm, { binary: true });
            },
            (error) => {
                console.error(`Intercom audio error for ${deviceId}:`, error.message);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'error', message: error.message }));
                    ws.close(1011, 'Intercom audio failed');
                }
            }
        );

        const cleanup = async () => {
            if (closing) return;
            closing = true;
            clearTimeout(timeout);
            activeDevices.delete(deviceId);
            await session?.close();
        };

        ws.on('message', (data, isBinary) => {
            if (isBinary && Buffer.byteLength(data) <= 64 * 1024) session?.writePcm(Buffer.from(data));
        });
        ws.on('close', cleanup);
        ws.on('error', (error) => {
            console.error(`Intercom talk WebSocket error for ${deviceId}:`, error.message);
            cleanup();
        });

        try {
            ws.send(JSON.stringify({ type: 'connecting' }));
            const audio = await session.start();
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ready', ...audio }));
        } catch (error) {
            console.error(`Could not start intercom talk for ${deviceId}:`, error.message);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', message: error.message }));
                ws.close(1011, 'Could not start intercom audio');
            }
            await cleanup();
        }
    });

    return wss;
}

module.exports = attachIntercomTalkWebSocket;
