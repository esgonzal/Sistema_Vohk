// Loaded only by process-isolation tests. Fail rather than query production DB
// or schedule real device/invitation jobs if API startup regresses.
const pg = require('pg');
pg.Pool.prototype.query = function () { throw new Error('Unexpected database query in API smoke test'); };
pg.Pool.prototype.connect = function () { throw new Error('Unexpected database connection in API smoke test'); };
require('node-cron').schedule = function () { throw new Error('API must not schedule background jobs'); };

// Do not require developer credentials to load the VOHK route tree.
process.env.RESEND_KEY = 're_test_placeholder';
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request.endsWith('firebase-service-account.json')) return {};
    if (request === 'firebase-admin') {
        return { apps: [{}] };
    }
    return originalLoad.call(this, request, parent, isMain);
};
