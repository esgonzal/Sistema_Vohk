const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
let existingRut = null;
const staffAssignments = [];
const residentCreations = [];
const residentAssignments = [];
const welcomeEmails = [];

test('superadmin creates an administrator without sending email and receives one-time credentials', async () => {
    const created = [];
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/userRepository') return {
            findByRut: async () => existingRut,
            findByEmail: async () => null,
            findByIdentity: async () => null,
            createManagementUser: async (...args) => {
                created.push(args);
                return { user_id: `${args[6]}-1`, username: args[0], legal_name: args[5], role: args[6] };
            },
            createResident: async (...args) => {
                residentCreations.push(args);
                return { user_id: `resident-${residentCreations.length}`, legal_name: args[5], sip_identity: args[3], role: 'resident' };
            },
        };
        if (request === '../../repositories/condominiumRepository') return {
            findById: async condominiumId => ({ condominium_id: condominiumId }),
            findByIdAndAdmin: async condominiumId => ({ condominium_id: condominiumId }),
        };
        if (request === '../../repositories/staffCondominiumRepository') return {
            assignStaff: async (userId, condominiumId) => {
                staffAssignments.push({ userId, condominiumId });
                return { user_id: userId, condominium_id: condominiumId };
            },
        };
        if (request === '../vohk_app/emailService') return {
            sendResidentWelcomeEmail: async payload => welcomeEmails.push(payload),
        };
        if (request === '../../repositories/unitRepository') return {
            findUnitHierarchy: async () => ({
                unit_id: 'unit-1', condominium_id: 'condominium-1', room_no: '101', floor: 1,
            }),
            findUnitByIdAndAdmin: async () => ({
                unit_id: 'unit-1', condominium_id: 'condominium-1', room_no: '101', floor: 1,
            }),
            findUnitsByCondominium: async () => [{
                unit_id: 'unit-1', condominium_id: 'condominium-1', name: '101', room_no: '101',
                floor: 1, building_id: 'building-1', building_name: 'Torre Á',
            }],
        };
        if (request === '../../repositories/residentUnitRepository') return {
            findUnitsByUser: async () => [],
            assignResident: async (residentId, unitId, isPrimary) => {
                residentAssignments.push({ residentId, unitId, isPrimary });
            },
            findSipIdentitiesByUnit: async () => [],
        };
        if (request === '../../repositories/deviceRepository') return { findDevicesByCondominium: async () => [] };
        if (request === 'bcrypt') return { hash: async () => 'hashed-password' };
        if (request === 'crypto') return { randomInt: () => 654321 };
        return originalLoad.call(this, request, parent, isMain);
    };
    try {
        existingRut = null;
        const userService = require('../services/vohk_app/userService');
        const result = await userService.createManagementUser('superadmin-1', 'superadmin', {
            legalName: 'Administradora Prueba',
            rut: '12.345.678-5',
            email: 'ADMIN@example.com',
            role: 'admin',
        });
        assert.equal(result.temporaryPassword, '654321');
        assert.deepEqual(result.user, {
            user_id: 'admin-1',
            username: 'admin@example.com',
            legal_name: 'Administradora Prueba',
            role: 'admin',
        });
        assert.equal(created.length, 1);
        assert.deepEqual(created[0], [
            'admin@example.com', 'hashed-password', '12.345.678-5', '12345678',
            'admin@example.com', 'Administradora Prueba', 'admin',
        ]);
        assert.equal(welcomeEmails.length, 0);
    } finally {
        existingRut = null;
        Module._load = originalLoad;
    }
});

test('administrator creates staff assigned to the selected condominium', async () => {
    const userService = require('../services/vohk_app/userService');
    staffAssignments.length = 0;
    const result = await userService.createManagementUser('admin-1', 'admin', {
        legalName: 'Personal Prueba',
        rut: '12.345.678-5',
        email: 'staff@example.com',
        role: 'staff',
        condominiumId: 'condominium-1',
    });

    assert.equal(result.user.role, 'staff');
    assert.deepEqual(staffAssignments, [{ userId: 'staff-1', condominiumId: 'condominium-1' }]);
});

test('an administrator RUT cannot be linked as a resident', async () => {
    const userService = require('../services/vohk_app/userService');
    existingRut = { user_id: 'admin-1', role: 'admin' };
    try {
        await assert.rejects(
            userService.createResident('unit-1', 'superadmin-1', 'superadmin', {
                legalName: 'Administradora Prueba',
                rut: '123456785',
                email: 'admin@example.com',
                isPrimary: true,
            }),
            error => error.status === 409 && error.message === 'RUT is already registered as a non-resident user'
        );
    } finally {
        existingRut = null;
    }
});

test('non-superadmin cannot create an administrator', async () => {
    const userService = require('../services/vohk_app/userService');
    await assert.rejects(
        userService.createManagementUser('admin-1', 'admin', {
            legalName: 'Otro Admin', rut: '12.345.678-5', email: 'other@example.com', role: 'admin',
        }),
        error => error.status === 403
    );
});

test('bulk resident creation resolves units and reports row-level failures', async () => {
    const userService = require('../services/vohk_app/userService');
    existingRut = null;
    residentCreations.length = 0;
    residentAssignments.length = 0;
    welcomeEmails.length = 0;

    const result = await userService.createResidentsBulk('condominium-1', 'admin-1', 'admin', [
        { row: 2, legalName: 'Residente Uno', rut: '12.345.678-5', email: 'uno@example.com', building: 'Torre A', unit: '101', isPrimary: true },
        { row: 3, legalName: 'Duplicado', rut: '123456785', email: 'dos@example.com', building: 'Torre Á', unit: '101', isPrimary: false },
        { row: 4, legalName: 'Sin unidad', rut: '123456785', email: 'tres@example.com', building: 'Torre B', unit: '999', isPrimary: false },
    ]);

    assert.equal(result.total, 3);
    assert.equal(result.succeeded, 1, JSON.stringify(result));
    assert.equal(result.failed, 2);
    assert.equal(result.results[1].error, 'Duplicate resident and unit in file');
    assert.equal(result.results[2].error, 'Unit not found in condominium');
    assert.equal(residentCreations.length, 1);
    assert.deepEqual(residentAssignments, [{ residentId: 'resident-1', unitId: 'unit-1', isPrimary: true }]);
    assert.equal(welcomeEmails.length, 1);
});
