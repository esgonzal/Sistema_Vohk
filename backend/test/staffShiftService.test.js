const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

function loadService({ owned = true } = {}) {
    const originalLoad = Module._load;
    const calls = [];
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/condominiumRepository') return {
            findById: async condominiumId => ({ condominium_id: condominiumId }),
            findByIdAndAdmin: async condominiumId => owned ? ({ condominium_id: condominiumId }) : null,
        };
        if (request === '../../repositories/staffShiftRepository') return {
            listStaff: async () => [{ user_id: 'staff-1', legal_name: 'Turno Uno' }],
            listShifts: async () => [{ shift_id: 'shift-1', name: 'Mañana' }],
            saveShift: async input => { calls.push(input); return 'shift-1'; },
            findById: async () => ({ shift_id: 'shift-1', condominium_id: 'condo-1' }),
            deleteShift: async (...args) => ({ args }),
        };
        if (request.startsWith('../../repositories/')) return {};
        return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[require.resolve('../services/vohk_app/condominiumService')];
    const service = require('../services/vohk_app/condominiumService');
    Module._load = originalLoad;
    return { service, calls };
}

test('administrator can store a shift only for an owned condominium', async () => {
    const { service, calls } = loadService();
    const input = {
        name: 'Mañana', startTime: '08:00', endTime: '12:00',
        weekdays: [1, 2, 3, 4, 5], enabled: true, staffUserIds: ['staff-1'],
    };
    const shift = await service.createStaffShift('condo-1', 'admin-1', 'admin', input);
    assert.equal(shift.shift_id, 'shift-1');
    assert.deepEqual(calls[0], { condominiumId: 'condo-1', ...input });

    const denied = loadService({ owned: false }).service;
    await assert.rejects(
        denied.createStaffShift('condo-2', 'admin-1', 'admin', input),
        error => error.status === 404,
    );
});

test('superadmin can list staff and shifts for any condominium', async () => {
    const { service } = loadService({ owned: false });
    const result = await service.getStaffScheduleData('condo-1', 'super-1', 'superadmin');
    assert.equal(result.staff[0].user_id, 'staff-1');
    assert.equal(result.shifts[0].shift_id, 'shift-1');
});
