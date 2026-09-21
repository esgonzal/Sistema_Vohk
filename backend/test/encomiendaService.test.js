const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const jwt = require('jsonwebtoken');

test('package photos are identified from their bytes instead of trusting multipart MIME metadata', async () => {
    const servicePath = require.resolve('../services/vohk_app/encomiendaService');
    try {
        const service = require(servicePath);
        const onePixelPng = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            'base64',
        );

        assert.equal(await service.detectPhotoMimeType(onePixelPng), 'image/png');
        await assert.rejects(
            service.detectPhotoMimeType(Buffer.from('not an image')),
            error => error.status === 400 && error.message === 'Photo must be JPEG, PNG or WebP',
        );
    } finally {
        delete require.cache[servicePath];
    }
});

test('resident claim identifies the resident and an authorized staff scan records both parties', async () => {
    const originalLoad = Module._load;
    const packageId = '11111111-1111-4111-8111-111111111111';
    const unitId = '22222222-2222-4222-8222-222222222222';
    const residentId = '33333333-3333-4333-8333-333333333333';
    const staffId = '44444444-4444-4444-8444-444444444444';
    let delivery;

    const encomienda = {
        encomienda_id: packageId,
        unit_id: unitId,
        condominium_id: '55555555-5555-4555-8555-555555555555',
        status: 'pending',
    };
    const repository = {
        listByUnit: async () => [encomienda],
        findById: async () => delivery ? { ...encomienda, status: 'delivered' } : encomienda,
        deliver: async input => {
            delivery = input;
            return { outcome: 'delivered', encomienda: { ...encomienda, status: 'delivered' } };
        },
    };

    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/encomiendaRepository') return repository;
        if (request === '../../repositories/unitRepository') return {
            findUnitHierarchy: async () => ({ unit_id: unitId, condominium_id: encomienda.condominium_id }),
            findUnitByIdAndAdmin: async () => null,
        };
        if (request === '../../repositories/residentUnitRepository') return {
            findByUserAndUnit: async (userId, requestedUnitId) => userId === residentId && requestedUnitId === unitId ? {} : null,
        };
        if (request === '../../repositories/staffCondominiumRepository') return {
            findByUserAndCondominium: async () => ({}),
        };
        if (request === './pushNotificationService') return { sendToUsers: async () => ({ sent: 0 }) };
        return originalLoad.call(this, request, parent, isMain);
    };

    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'encomienda-test-secret';
    try {
        const service = require('../services/vohk_app/encomiendaService');
        const listed = await service.listEncomiendas({ userId: residentId, role: 'resident', unitId, includeHistory: false });
        assert.equal(listed.length, 1);
        const claim = jwt.verify(listed[0].claim_token, process.env.JWT_SECRET, {
            audience: 'encomienda-claim',
            issuer: 'vohk',
        });
        assert.equal(claim.encomiendaId, packageId);
        assert.equal(claim.residentUserId, residentId);

        await service.deliverEncomienda({ userId: staffId, role: 'staff', claimToken: listed[0].claim_token });
        assert.deepEqual(delivery, { encomiendaId: packageId, staffUserId: staffId, residentUserId: residentId });
    } finally {
        Module._load = originalLoad;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
        delete require.cache[require.resolve('../services/vohk_app/encomiendaService')];
    }
});

test('staff can list all packages only for an assigned condominium', async () => {
    const originalLoad = Module._load;
    const staffId = '11111111-1111-4111-8111-111111111111';
    const condominiumId = '22222222-2222-4222-8222-222222222222';
    const listedRows = [{ encomienda_id: '33333333-3333-4333-8333-333333333333' }];
    const requested = [];

    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/encomiendaRepository') return {
            listByCondominium: async (id, includeHistory) => {
                requested.push({ id, includeHistory });
                return listedRows;
            },
        };
        if (request === '../../repositories/condominiumRepository') return {
            findById: async () => null,
            findByIdAndAdmin: async () => null,
        };
        if (request === '../../repositories/staffCondominiumRepository') return {
            findByUserAndCondominium: async (userId, id) => userId === staffId && id === condominiumId ? {} : null,
        };
        if (request === '../../repositories/unitRepository') return {};
        if (request === '../../repositories/residentUnitRepository') return {};
        if (request === './pushNotificationService') return { sendToUsers: async () => ({ sent: 0 }) };
        return originalLoad.call(this, request, parent, isMain);
    };

    const servicePath = require.resolve('../services/vohk_app/encomiendaService');
    try {
        const service = require(servicePath);
        const rows = await service.listEncomiendas({
            userId: staffId,
            role: 'staff',
            condominiumId,
            includeHistory: true,
        });
        assert.equal(rows, listedRows);
        assert.deepEqual(requested, [{ id: condominiumId, includeHistory: true }]);

        await assert.rejects(
            service.listEncomiendas({ userId: '44444444-4444-4444-8444-444444444444', role: 'staff', condominiumId }),
            error => error.status === 404,
        );
        await assert.rejects(
            service.listEncomiendas({ userId: staffId, role: 'resident', condominiumId }),
            error => error.status === 403,
        );
    } finally {
        Module._load = originalLoad;
        delete require.cache[servicePath];
    }
});
