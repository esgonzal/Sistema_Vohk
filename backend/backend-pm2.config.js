module.exports = {
    apps: [
        {
            name: 'server',
            script: 'server.js',
            watch: false,
            log_date_format: 'YYYY-MM-DD HH:mm Z',
        },
        {
            name: 'dte-sync',
            script: 'workers/dteSyncWorker.js',
            watch: false,
            autorestart: true,
            restart_delay: 5000,
            log_date_format: 'YYYY-MM-DD HH:mm Z',
        },
    ],
};
