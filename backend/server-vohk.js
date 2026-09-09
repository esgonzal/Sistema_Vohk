const { createApp, startServer } = require('./runtime/httpServer');

function createVohkApp() {
    const app = createApp('vohk-api');
    app.use('/api', require('./routes/vohk_app'));
    app.use('/debug.jpg', (req, res) => res.sendFile('/opt/vohk_ai/debug_center.jpg'));
    return app;
}

if (require.main === module) {
    startServer(createVohkApp(), {
        service: 'vohk-api', port: process.env.VOHK_PORT || 8080,
        attachWebSocket: require('./websocket/intercomTalkWebSocket'),
    });
}

module.exports = { createVohkApp };
