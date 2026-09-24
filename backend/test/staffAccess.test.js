const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

test('staff can read activities for an assigned condominium', async () => {
    const originalLoad = Module._load;
    let query;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/activityRepository') return {
            listActivities: async input => {
                query = input;
                return [];
            },
        };
        return originalLoad.call(this, request, parent, isMain);
    };
    try {
        const service = require('../services/vohk_app/activityService');
        await service.listActivities(
            { userId: 'staff-1', role: 'staff' },
            { condominiumId: '11111111-1111-4111-8111-111111111111', limit: '20' },
        );
        assert.equal(query.userId, 'staff-1');
        assert.equal(query.role, 'staff');
        assert.equal(query.limit, 20);
    } finally {
        Module._load = originalLoad;
        delete require.cache[require.resolve('../services/vohk_app/activityService')];
    }
});

test('staff can read the unit tree only for an assigned condominium', async () => {
    const originalLoad = Module._load;
    let assigned = true;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/staffCondominiumRepository') return {
            findByUserAndCondominium: async () => assigned ? {} : null,
        };
        if (request === '../../repositories/condominiumRepository') return {
            findUnitTreeRows: async condominiumId => [{ condominium_name: 'Condominio', condominium_id: condominiumId }],
        };
        if (request.startsWith('../../repositories/')) return {};
        return originalLoad.call(this, request, parent, isMain);
    };
    try {
        const service = require('../services/vohk_app/unitService');
        const tree = await service.getUnitTree('condominium-1', 'staff-1', 'staff');
        assert.equal(tree.name, 'Condominio');

        assigned = false;
        await assert.rejects(
            service.getUnitTree('condominium-2', 'staff-1', 'staff'),
            error => error.status === 404,
        );
    } finally {
        Module._load = originalLoad;
        delete require.cache[require.resolve('../services/vohk_app/unitService')];
    }
});

test('staff condominium tree and dashboard are scoped to staff assignments', async () => {
    const originalLoad = Module._load;
    const calls = [];
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/condominiumRepository') return {
            findCondominiumTreeRows: async (...args) => {
                calls.push(['tree', ...args]);
                return [];
            },
        };
        if (request === '../../repositories/dashboardRepository') return {
            getSummary: async (...args) => { calls.push(['summary', ...args]); return {}; },
            getCondominiums: async (...args) => { calls.push(['condominiums', ...args]); return []; },
            getDeviceSummary: async (...args) => { calls.push(['devices', ...args]); return {}; },
            getRecentResidents: async (...args) => { calls.push(['residents', ...args]); return []; },
            getRecentCondominiums: async (...args) => { calls.push(['recent-condominiums', ...args]); return []; },
        };
        if (request.startsWith('../../repositories/')) return {};
        return originalLoad.call(this, request, parent, isMain);
    };
    try {
        const condominiumService = require('../services/vohk_app/condominiumService');
        const dashboardService = require('../services/vohk_app/dashboardService');
        await condominiumService.getCondominiumTree('staff-1', 'staff');
        await dashboardService.getDashboard('staff-1', 'staff');

        assert.deepEqual(calls, [
            ['tree', null, 'staff-1'],
            ['summary', null, 'staff-1'],
            ['condominiums', null, 'staff-1'],
            ['devices', null, 'staff-1'],
            ['residents', null, 'staff-1'],
            ['recent-condominiums', null, 'staff-1'],
        ]);
    } finally {
        Module._load = originalLoad;
        delete require.cache[require.resolve('../services/vohk_app/condominiumService')];
        delete require.cache[require.resolve('../services/vohk_app/dashboardService')];
    }
});

test('staff can load concierge devices and open doors only in an assigned condominium', async () => {
    const originalLoad = Module._load;
    let assigned = true;
    let openCount = 0;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/deviceRepository') return {
            findDeviceById: async () => ({ device_id: 'device-1', type: 'intercom' }),
            findDeviceTreeRows: async () => [{
                condominium_name: 'Condominio',
                zone_id: 'zone-1',
                zone_name: 'Accesos',
                device_id: 'device-1',
                device_name: 'Entrada',
                type: 'intercom',
            }],
            findIntercomByDeviceId: async () => ({
                device_id: 'device-1',
                condominium_id: 'condominium-1',
                door_id: 1,
                name: 'Entrada',
            }),
        };
        if (request === '../../repositories/staffCondominiumRepository') return {
            findByUserAndCondominium: async (userId, condominiumId) => (
                assigned && userId === 'staff-1' && condominiumId === 'condominium-1' ? {} : null
            ),
        };
        if (request === '../../repositories/activityRepository') return {
            createActivity: async () => {},
        };
        if (request === './hikvision/adapterFactory') return {
            getAdapterForIntercom: async () => ({
                openDoor: async () => {
                    openCount += 1;
                    return { response: { ok: true, status: 200 }, text: 'OK' };
                },
            }),
        };
        if (request.startsWith('../../repositories/')) return {};
        if (request === './ttlockService') return { openDoor: async () => ({ ok: true }) };
        return originalLoad.call(this, request, parent, isMain);
    };
    try {
        const service = require('../services/vohk_app/deviceService');
        const tree = await service.getDevicesByCondominium('condominium-1', 'staff-1', 'staff');
        assert.equal(tree.zones[0].devices[0].name, 'Entrada');

        const result = await service.openDoor('device-1', { userId: 'staff-1', role: 'staff' });
        assert.equal(result.ok, true);
        assert.equal(openCount, 1);

        assigned = false;
        await assert.rejects(
            service.getDevicesByCondominium('condominium-1', 'staff-1', 'staff'),
            error => error.status === 404,
        );
        await assert.rejects(
            service.openDoor('device-1', { userId: 'staff-1', role: 'staff' }),
            error => error.status === 403,
        );
        assert.equal(openCount, 1);
    } finally {
        Module._load = originalLoad;
        delete require.cache[require.resolve('../services/vohk_app/deviceService')];
    }
});

test('staff can open but cannot manage an assigned TTLock device', async () => {
    const originalLoad = Module._load;
    let assigned = true;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/staffCondominiumRepository') return {
            findByUserAndCondominium: async (userId, condominiumId) => (
                assigned && userId === 'staff-1' && condominiumId === 'condominium-1' ? {} : null
            ),
        };
        return originalLoad.call(this, request, parent, isMain);
    };
    try {
        delete require.cache[require.resolve('../services/vohk_app/ttlockService')];
        const service = require('../services/vohk_app/ttlockService');
        const lock = { condominium_id: 'condominium-1' };
        const staff = { userId: 'staff-1', role: 'staff' };

        await service._private.assertDeviceAccess(lock, staff);
        await assert.rejects(
            service._private.assertDeviceAccess(lock, staff, { manage: true }),
            error => error.status === 403,
        );

        assigned = false;
        await assert.rejects(
            service._private.assertDeviceAccess(lock, staff),
            error => error.status === 403,
        );
    } finally {
        Module._load = originalLoad;
        delete require.cache[require.resolve('../services/vohk_app/ttlockService')];
    }
});
