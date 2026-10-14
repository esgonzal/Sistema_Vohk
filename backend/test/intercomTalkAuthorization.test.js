const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

function loadService({ adminCondominium = null, staffAssignment = null, residentUnit = null } = {}) {
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/deviceRepository') {
            return {
                findIntercomByDeviceId: async deviceId => ({
                    device_id: deviceId,
                    condominium_id: 'condominium-1',
                }),
            };
        }
        if (request === '../../repositories/condominiumRepository') {
            return { findByIdAndAdmin: async () => adminCondominium };
        }
        if (request === '../../repositories/staffCondominiumRepository') {
            return { findByUserAndCondominium: async () => staffAssignment };
        }
        if (request === '../../repositories/residentUnitRepository') {
            return { findByUserAndCondominium: async () => residentUnit };
        }
        return originalLoad.call(this, request, parent, isMain);
    };
    const servicePath = require.resolve('../services/vohk_app/intercomTalkService');
    delete require.cache[servicePath];
    try {
        return require(servicePath);
    } finally {
        Module._load = originalLoad;
    }
}

test('assigned staff can start two-way audio', async () => {
    const service = loadService({ staffAssignment: { user_id: 'staff-1', condominium_id: 'condominium-1' } });
    const intercom = await service.getAuthorizedIntercom('device-1', { userId: 'staff-1', role: 'staff' });
    assert.equal(intercom.device_id, 'device-1');
});

test('staff cannot start two-way audio outside their assigned condominium', async () => {
    const service = loadService();
    await assert.rejects(
        service.getAuthorizedIntercom('device-1', { userId: 'staff-1', role: 'staff' }),
        error => error.status === 403 && error.message === 'Forbidden',
    );
});

test('administrator authorization remains scoped to owned condominiums', async t => {
    await t.test('owned condominium', async () => {
        const service = loadService({ adminCondominium: { condominium_id: 'condominium-1' } });
        const intercom = await service.getAuthorizedIntercom('device-1', { userId: 'admin-1', role: 'admin' });
        assert.equal(intercom.condominium_id, 'condominium-1');
    });

    await t.test('unowned condominium', async () => {
        const service = loadService();
        await assert.rejects(
            service.getAuthorizedIntercom('device-1', { userId: 'admin-1', role: 'admin' }),
            error => error.status === 403 && error.message === 'Forbidden',
        );
    });
});
