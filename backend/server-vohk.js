const { createApp, startServer } = require('./runtime/httpServer');

function createVohkApp() {
    const app = createApp('vohk-api');
    app.use('/api', require('./routes/vohk_app'));
    return app;
}

if (require.main === module) {
    startServer(createVohkApp(), {
        service: 'vohk-api', port: process.env.VOHK_PORT || 8080,
        attachWebSocket: require('./websocket/intercomTalkWebSocket'),
    });
}

module.exports = { createVohkApp };
