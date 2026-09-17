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
