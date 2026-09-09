const { createApp, startServer } = require('./runtime/httpServer');

function createUniversityApp() {
    const app = createApp('university-api');
    app.use('/v1', require('./routes/v1'));
    return app;
}

if (require.main === module) {
    startServer(createUniversityApp(), {
        service: 'university-api', port: process.env.UNIVERSITY_PORT || 8081,
    });
}

module.exports = { createUniversityApp };
