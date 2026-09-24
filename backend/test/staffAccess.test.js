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

test('staff can open an intercom door only in an assigned condominium', async () => {
    const originalLoad = Module._load;
    let assigned = true;
    let openCount = 0;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/deviceRepository') return {
            findDeviceById: async () => ({ device_id: 'device-1', type: 'intercom' }),
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
        const result = await service.openDoor('device-1', { userId: 'staff-1', role: 'staff' });
        assert.equal(result.ok, true);
        assert.equal(openCount, 1);

        assigned = false;
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
