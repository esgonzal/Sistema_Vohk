const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const jwt = require('jsonwebtoken');

test('admin package alerts notify unique active admin and staff through email, push and activity', async () => {
    const originalLoad = Module._load;
    const adminId = '11111111-1111-4111-8111-111111111111';
    const staffId = '22222222-2222-4222-8222-222222222222';
    const inactiveId = '33333333-3333-4333-8333-333333333333';
    const packageId = '44444444-4444-4444-8444-444444444444';
    const condominiumId = '55555555-5555-4555-8555-555555555555';
    const sentEmails = [];
    const pushes = [];
    const activities = [];
    const marked = [];
    const due = [{
        encomienda_id: packageId,
        unit_id: '66666666-6666-4666-8666-666666666666',
        condominium_id: condominiumId,
        admin_user_id: adminId,
        unit_name: '101',
        building_name: 'Torre A',
        recipient_name: 'Ana Residente',
        created_at: '2026-11-02T12:00:00.000Z',
    }];
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/encomiendaRepository') return {
            findDueAdminAlerts: async hours => {
                assert.equal(hours, 24);
                return due;
            },
            markAdminAlerted: async (...args) => marked.push(args),
        };
        if (request === '../../repositories/userRepository') return {
            findById: async () => ({ user_id: adminId, legal_name: 'Admin', email: 'admin@example.com', active: true }),
        };
        if (request === '../../repositories/staffShiftRepository') return {
            listStaff: async id => {
                assert.equal(id, condominiumId);
                return [
                    { user_id: adminId, legal_name: 'Admin duplicado', email: 'admin@example.com', active: true },
                    { user_id: staffId, legal_name: 'Staff', email: 'staff@example.com', active: true },
                    { user_id: inactiveId, legal_name: 'Inactivo', email: 'inactive@example.com', active: false },
                ];
            },
        };
        if (request === '../../repositories/activityRepository') return { createActivity: async input => activities.push(input) };
        if (request === './emailService') return { sendPackageAgingAlertEmail: async input => sentEmails.push(input) };
        if (request === './pushNotificationService') return {
            sendToUsers: async (userIds, message) => {
                pushes.push({ userIds, message });
                return { sent: 2, failed: 0 };
            },
        };
        if (request.startsWith('../../repositories/')) return {};
        return originalLoad.call(this, request, parent, isMain);
    };
    const servicePath = require.resolve('../services/vohk_app/encomiendaService');
    try {
        const service = require(servicePath);
        assert.equal(await service.processAdminAlerts(new Date('2026-11-04T12:00:00.000Z')), 1);
        assert.deepEqual(sentEmails.map(item => item.toEmail).sort(), ['admin@example.com', 'staff@example.com']);
        assert.deepEqual(pushes[0].userIds.sort(), [adminId, staffId].sort());
        assert.equal(pushes[0].message.data.type, 'encomienda_admin_alert');
        assert.equal(activities[0].eventType, 'encomienda_alert');
        assert.equal(activities[0].correlationId, `encomienda:${packageId}:2026-11-04`);
        assert.deepEqual(marked[0][1].recipientIds.sort(), [adminId, staffId].sort());
        assert.equal(marked.length, 1);
    } finally {
        Module._load = originalLoad;
        delete require.cache[servicePath];
    }
});

test('admin package alerts remain due when a condominium has no active recipients', async () => {
    const originalLoad = Module._load;
    let activityCreated = false;
    let marked = false;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/encomiendaRepository') return {
            findDueAdminAlerts: async () => [{ encomienda_id: 'package-1', condominium_id: 'condo-1', admin_user_id: null }],
            markAdminAlerted: async () => { marked = true; },
        };
        if (request === '../../repositories/staffShiftRepository') return { listStaff: async () => [{ user_id: 'inactive', active: false }] };
        if (request === '../../repositories/userRepository') return { findById: async () => null };
        if (request === '../../repositories/activityRepository') return { createActivity: async () => { activityCreated = true; } };
        if (request === './emailService') return { sendPackageAgingAlertEmail: async () => {} };
        if (request === './pushNotificationService') return { sendToUsers: async () => ({ sent: 0 }) };
        if (request.startsWith('../../repositories/')) return {};
        return originalLoad.call(this, request, parent, isMain);
    };
    const servicePath = require.resolve('../services/vohk_app/encomiendaService');
    try {
        const service = require(servicePath);
        assert.equal(await service.processAdminAlerts(), 0);
        assert.equal(activityCreated, false);
        assert.equal(marked, false);
    } finally {
        Module._load = originalLoad;
        delete require.cache[servicePath];
    }
});

test('admin package alerts do not resend while the repository 24-hour window is closed', async () => {
    const originalLoad = Module._load;
    let pushed = false;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/encomiendaRepository') return { findDueAdminAlerts: async hours => {
            assert.equal(hours, 24);
            return [];
        } };
        if (request === './pushNotificationService') return { sendToUsers: async () => { pushed = true; } };
        if (request.startsWith('../../repositories/')) return {};
        if (request === './emailService') return {};
        return originalLoad.call(this, request, parent, isMain);
    };
    const servicePath = require.resolve('../services/vohk_app/encomiendaService');
    try {
        const service = require(servicePath);
        assert.equal(await service.processAdminAlerts(), 0);
        assert.equal(pushed, false);
    } finally {
        Module._load = originalLoad;
        delete require.cache[servicePath];
    }
});

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

test('registering a package immediately notifies every active resident in its unit', async () => {
    const originalLoad = Module._load;
    const unitId = '11111111-1111-4111-8111-111111111111';
    const packageId = '22222222-2222-4222-8222-222222222222';
    const creatorId = '33333333-3333-4333-8333-333333333333';
    const residentIds = [
        '44444444-4444-4444-8444-444444444444',
        '55555555-5555-4555-8555-555555555555',
    ];
    const notifications = [];
    const marked = [];
    const repository = {
        findResidentsByUnit: async () => residentIds.map(user_id => ({ user_id })),
        create: async () => ({ encomienda_id: packageId, unit_id: unitId, created_by_user_id: creatorId }),
        markNotified: async (...args) => marked.push(args),
    };

    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/encomiendaRepository') return repository;
        if (request === '../../repositories/unitRepository') return {
            findUnitHierarchy: async () => ({
                unit_id: unitId,
                condominium_id: '66666666-6666-4666-8666-666666666666',
                name: '101',
                building_name: 'Edificio Uno',
            }),
        };
        if (request === '../../repositories/residentUnitRepository') return {};
        if (request === '../../repositories/staffCondominiumRepository') return {};
        if (request === './pushNotificationService') return {
            sendToUsers: async (userIds, message) => {
                notifications.push({ userIds, message });
                return { sent: userIds.length, failed: 0, devices: userIds.length, users: userIds.length, errors: {} };
            },
        };
        if (request === 'sharp') return () => ({ metadata: async () => ({ format: 'jpeg' }) });
        return originalLoad.call(this, request, parent, isMain);
    };

    const servicePath = require.resolve('../services/vohk_app/encomiendaService');
    try {
        const service = require(servicePath);
        await service.createEncomienda({
            userId: creatorId,
            role: 'superadmin',
            unitId,
            recipientName: 'Residente',
            courierName: 'Courier',
            notes: null,
            photo: { buffer: Buffer.from('jpeg bytes') },
        });

        assert.equal(notifications.length, 1);
        assert.deepEqual(notifications[0].userIds, residentIds);
        assert.equal(notifications[0].message.data.type, 'encomienda');
        assert.equal(notifications[0].message.data.encomiendaId, packageId);
        assert.equal(notifications[0].message.notification.title, 'Llegó una encomienda');
        assert.deepEqual(marked, [[
            packageId,
            creatorId,
            residentIds,
            false,
            { sent: residentIds.length, failed: 0, devices: residentIds.length, users: residentIds.length, errors: {} },
        ]]);
    } finally {
        Module._load = originalLoad;
        delete require.cache[servicePath];
    }
});

test('package reminders use a fixed one-hour interval', async () => {
    const originalLoad = Module._load;
    const intervals = [];
    const repository = {
        findDueReminders: async hours => {
            intervals.push(hours);
            return [];
        },
    };

    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/encomiendaRepository') return repository;
        if (request === '../../repositories/condominiumRepository') return {};
        if (request === '../../repositories/unitRepository') return {};
        if (request === '../../repositories/residentUnitRepository') return {};
        if (request === '../../repositories/staffCondominiumRepository') return {};
        if (request === './pushNotificationService') return { sendToUsers: async () => ({ sent: 0 }) };
        return originalLoad.call(this, request, parent, isMain);
    };

    const servicePath = require.resolve('../services/vohk_app/encomiendaService');
    const previousInterval = process.env.ENCOMIENDA_REMINDER_HOURS;
    process.env.ENCOMIENDA_REMINDER_HOURS = '3';
    try {
        const service = require(servicePath);
        const processed = await service.processReminders(new Date('2026-01-15T15:00:00.000Z'));
        assert.equal(processed, 0);
        assert.equal(service.REMINDER_INTERVAL_HOURS, 1);
        assert.deepEqual(intervals, [1]);
    } finally {
        Module._load = originalLoad;
        if (previousInterval === undefined) delete process.env.ENCOMIENDA_REMINDER_HOURS;
        else process.env.ENCOMIENDA_REMINDER_HOURS = previousInterval;
        delete require.cache[servicePath];
    }
});

test('a failed publication push stays eligible for an initial-notification retry', async () => {
    const originalLoad = Module._load;
    const notifications = [];
    const marked = [];
    const pending = [{
        encomienda_id: '11111111-1111-4111-8111-111111111111',
        unit_id: '22222222-2222-4222-8222-222222222222',
        created_by_user_id: '33333333-3333-4333-8333-333333333333',
        unit_name: '101',
        initial_notification: true,
    }];
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/encomiendaRepository') return {
            findDueReminders: async () => pending,
            findResidentsByUnit: async () => [{ user_id: 'resident-1' }],
            markNotified: async (...args) => marked.push(args),
        };
        if (request === './pushNotificationService') return {
            sendToUsers: async (userIds, message) => {
                notifications.push({ userIds, message });
                return { sent: 1, failed: 0, devices: 1, users: 1, errors: {} };
            },
        };
        if (request.startsWith('../../repositories/')) return {};
        return originalLoad.call(this, request, parent, isMain);
    };
    const servicePath = require.resolve('../services/vohk_app/encomiendaService');
    try {
        const service = require(servicePath);
        const processed = await service.processReminders(new Date('2026-10-16T12:00:00-03:00'));
        assert.equal(processed, 1);
        assert.equal(notifications[0].message.notification.title, 'Llegó una encomienda');
        assert.equal(marked[0][3], false);
    } finally {
        Module._load = originalLoad;
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
    const notifications = [];

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
        if (request === './pushNotificationService') return {
            sendToUsers: async (userIds, message) => {
                notifications.push({ userIds, message });
                return { sent: 1, failed: 0, devices: 1, users: 1 };
            },
        };
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
        assert.equal(notifications.length, 1);
        assert.deepEqual(notifications[0].userIds, [residentId]);
        assert.deepEqual(notifications[0].message.data, {
            type: 'encomienda_delivered',
            encomiendaId: packageId,
            unitId,
            status: 'delivered',
        });
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
