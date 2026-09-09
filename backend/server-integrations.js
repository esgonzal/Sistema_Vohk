const { createApp, startServer } = require('./runtime/httpServer');

function createIntegrationsApp() {
    const app = createApp('integrations-api');
    app.use('/monday', require('./routes/automation/monday_test'));
    return app;
}

if (require.main === module) {
    startServer(createIntegrationsApp(), {
        service: 'integrations-api', port: process.env.INTEGRATIONS_PORT || 8083,
    });
}

module.exports = { createIntegrationsApp };
