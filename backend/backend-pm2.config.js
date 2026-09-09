function processConfig(name, script) {
    return {
        name,
        script,
        cwd: __dirname,
        exec_mode: 'fork',
        instances: 1,
        watch: false,
        autorestart: true,
        restart_delay: 5000,
        log_date_format: 'YYYY-MM-DD HH:mm Z',
    };
}

// Keep each service single-instance. Jobs and intercom reservations are not
// coordinated across replicas. mediamtx and snapshots are managed separately.
module.exports = {
    apps: [
        processConfig('university-api', 'server-university.js'),
        processConfig('legacy-api', 'server-legacy.js'),
        processConfig('vohk-api', 'server-vohk.js'),
        processConfig('integrations-api', 'server-integrations.js'),
        processConfig('vohk-worker', 'workers/vohkWorker.js'),
        processConfig('dte-sync', 'workers/dteSyncWorker.js'),
    ],
};
