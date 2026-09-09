const { createApp, startServer } = require('./runtime/httpServer');

function createLegacyApp() {
    const app = createApp('legacy-api');
    app.use('/v0', require('./routes/v0'));
    app.use('/mail', require('./routes/nodemailer/emailRoutes'));
    return app;
}

if (require.main === module) {
    startServer(createLegacyApp(), {
        service: 'legacy-api', port: process.env.LEGACY_PORT || 8082,
    });
}

module.exports = { createLegacyApp };
