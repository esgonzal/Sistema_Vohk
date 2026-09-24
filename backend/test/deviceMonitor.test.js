const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

test('TTLock heartbeat queries the lock through its gateway and updates last seen', async () => {
    const originalLoad = Module._load;
    const checkedLocks = [];
    const seenDevices = [];

    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/deviceRepository') return {
            findActiveDevices: async () => [{
                device_id: 'device-1',
                vendor: 'TTLock',
                name: 'Portón',
                ttlock_external_lock_id: 34739974,
            }],
            updateLastSeen: async deviceId => seenDevices.push(deviceId),
        };
        if (request === '../../integrations/ttlock/ttlockClient') return {
            queryOpenState: async lockId => checkedLocks.push(lockId),
        };
        if (request === './hikvision/identityService') return {
            fetchHikvisionIdentity: async () => ({}),
        };
        return originalLoad.call(this, request, parent, isMain);
    };

    try {
        const monitor = require('../services/vohk_app/deviceMonitorService');
        await monitor.checkDevices();
        assert.deepEqual(checkedLocks, [34739974]);
        assert.deepEqual(seenDevices, ['device-1']);
    } finally {
        Module._load = originalLoad;
        delete require.cache[require.resolve('../services/vohk_app/deviceMonitorService')];
    }
});

test('failed TTLock heartbeat leaves last seen unchanged', async () => {
    const originalLoad = Module._load;
    const originalConsoleError = console.error;
    const seenDevices = [];

    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/deviceRepository') return {
            findActiveDevices: async () => [{
                device_id: 'device-2',
                vendor: 'ttlock',
                name: 'Cerradura',
                ttlock_external_lock_id: 3101840,
            }],
            updateLastSeen: async deviceId => seenDevices.push(deviceId),
        };
        if (request === '../../integrations/ttlock/ttlockClient') return {
            queryOpenState: async () => { throw new Error('Gateway offline'); },
        };
        if (request === './hikvision/identityService') return {
            fetchHikvisionIdentity: async () => ({}),
        };
        return originalLoad.call(this, request, parent, isMain);
    };

    try {
        console.error = () => {};
        const monitor = require('../services/vohk_app/deviceMonitorService');
        await monitor.checkDevices();
        assert.deepEqual(seenDevices, []);
    } finally {
        console.error = originalConsoleError;
        Module._load = originalLoad;
        delete require.cache[require.resolve('../services/vohk_app/deviceMonitorService')];
    }
});
