const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

function loadRoutingService(shifts, administrator) {
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/staffShiftRepository') return { listShifts: async () => shifts };
        if (request === '../../repositories/userRepository') return { findActiveAdminByCondominium: async () => administrator };
        return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[require.resolve('../services/vohk_app/managementCallRoutingService')];
    const service = require('../services/vohk_app/managementCallRoutingService');
    Module._load = originalLoad;
    return service;
}

const staff = {
    user_id: 'staff-id', legal_name: 'Staff', role: 'staff', active: true, sip_identity: '12345678',
};
const administrator = {
    user_id: 'admin-id', legal_name: 'Admin', role: 'admin', active: true, sip_identity: '19334358',
};
const normalShift = {
    enabled: true, start_time: '08:00', end_time: '18:00', weekdays: [1, 2, 3, 4, 5], staff: [staff],
};

test('08:00-18:00 weekday shift routes to staff during the shift and admin outside it', async () => {
    const service = loadRoutingService([normalShift], administrator);
    const during = await service.resolveManagementCallRecipients('condo-id', new Date('2026-10-15T12:00:00-03:00'));
    assert.equal(during.route, 'scheduled_staff');
    assert.deepEqual(during.recipients.map(user => user.sip_identity), ['12345678']);

    const after = await service.resolveManagementCallRecipients('condo-id', new Date('2026-10-15T18:00:00-03:00'));
    assert.equal(after.route, 'admin_fallback');
    assert.deepEqual(after.recipients.map(user => user.sip_identity), ['19334358']);

    const weekend = await service.resolveManagementCallRecipients('condo-id', new Date('2026-10-17T10:00:00-03:00'));
    assert.equal(weekend.route, 'admin_fallback');
});

test('overnight shifts remain active after midnight on the following day', () => {
    const service = loadRoutingService([], administrator);
    const shift = { ...normalShift, start_time: '22:00', end_time: '06:00', weekdays: [5] };
    const saturdayEarly = require('moment-timezone').tz('2026-10-17 02:00', 'America/Santiago');
    assert.equal(service.isShiftActive(shift, saturdayEarly), true);
});
