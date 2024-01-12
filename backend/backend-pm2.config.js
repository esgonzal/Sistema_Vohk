module.exports = {
    apps: [{
        name: 'backend', // Choose a name for your application
        script: 'server.js', // Specify the entry point for your application
        watch: true, // Automatically restart on file changes
        ignore_watch: ['node_modules', 'logs'], // Folders to ignore
        log_date_format: 'YYYY-MM-DD HH:mm Z',
    }, ],
};