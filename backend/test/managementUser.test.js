const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
let existingRut = null;

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
                return { user_id: 'admin-1', username: args[0], legal_name: args[5], role: args[6] };
            },
        };
        if (request === '../vohk_app/emailService') return {
            sendResidentWelcomeEmail: async () => {
                throw new Error('Management creation must not send email');
            },
        };
        if (request === '../../repositories/unitRepository') return {
            findUnitHierarchy: async () => ({
                unit_id: 'unit-1', condominium_id: 'condominium-1', room_no: '101', floor: 1,
            }),
        };
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
    } finally {
        existingRut = null;
        Module._load = originalLoad;
    }
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
