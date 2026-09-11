const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

test('VOHK worker owns all three schedules, the KV stream and initial access sync', async () => {
    const schedules = [];
    const calls = [];
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === 'node-cron') return {
            schedule: (expression, callback) => schedules.push({ expression, callback }),
        };
        if (request === '../services/vohk_app/deviceMonitorService') return {
            checkDevices: async () => calls.push('heartbeat'),
        };
        if (request === '../services/vohk_app/invitationService') return {
            processExpiredInvitations: async () => calls.push('expiration'),
        };
        if (request === '../services/vohk_app/accessEventSyncService') return {
            syncAllAccessEvents: async () => calls.push('access'),
        };
        if (request === '../services/vohk_app/ttlockPasscodeRecordSyncService') return {
            syncAllTtlockPasscodeRecords: async () => calls.push('ttlock'),
        };
        if (request === '../services/vohk_app/kv9503EventStreamService') return {
            startKv9503EventStreams: () => calls.push('kv-stream'),
        };
        return originalLoad.call(this, request, parent, isMain);
    };
    try {
        const { startVohkWorker } = require('../workers/vohkWorker');
        assert.equal(schedules.length, 0, 'import alone must not start the worker');
        startVohkWorker();
        assert.deepEqual(schedules.map(item => item.expression), [
            '*/5 * * * *', '* * * * *', '* * * * *',
        ]);
        await new Promise(resolve => setImmediate(resolve));
        assert.deepEqual(calls, ['kv-stream', 'access', 'ttlock']);
        calls.length = 0;
        for (const { callback } of schedules) await callback();
        await new Promise(resolve => setImmediate(resolve));
        assert.deepEqual(calls, ['heartbeat', 'expiration', 'access', 'ttlock']);
    } finally {
        Module._load = originalLoad;
    }
});
