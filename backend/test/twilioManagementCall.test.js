const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

test('resident management call is condominium-scoped and rings admin and staff', async () => {
    const originalLoad = Module._load;
    const activities = [];
    const condominiumId = '11111111-1111-4111-8111-111111111111';
    const resident = { user_id: 'resident-id', role: 'resident', legal_name: 'Ana Pérez', sip_identity: 'resident_1' };
    const recipients = [
        { user_id: 'staff-id', role: 'staff', legal_name: 'Conserjería', sip_identity: 'staff_1' },
        { user_id: 'admin-id', role: 'admin', legal_name: 'Administración', sip_identity: 'admin_1' },
    ];

    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/userRepository') return {
            findByIdentity: async identity => identity === resident.sip_identity ? resident : null,
            findResidentCallLocation: async () => ({ condominium_id: condominiumId, unit_id: 'unit-1', unit_name: 'Depto 42' }),
            findActiveManagementByCondominium: async () => recipients,
        };
        if (request === '../../repositories/activityRepository') return {
            createActivity: async input => { activities.push(input); return input; },
        };
        if (request.startsWith('../../repositories/')) return {};
        return originalLoad.call(this, request, parent, isMain);
    };

    try {
        const service = require('../services/vohk_app/twilioService');
        const xml = await service.handleOutgoingCall(
            resident.sip_identity,
            `management:${condominiumId}`,
            'CA-management-call',
        );
        assert.match(xml, /<Identity>staff_1<\/Identity>/);
        assert.match(xml, /<Identity>admin_1<\/Identity>/);
        assert.match(xml, /<Parameter name="call_type" value="resident"/);
        assert.match(xml, /<Parameter name="caller_name" value="Ana Pérez · Depto 42"/);
        assert.equal(activities[0].metadata.direction, 'resident_to_management');
        assert.deepEqual(activities[0].participants.map(item => item.userId), ['resident-id', 'staff-id', 'admin-id']);
        await assert.rejects(
            service.handleOutgoingCall('sip:attacker@example.com', `management:${condominiumId}`),
            /Invalid client destination/,
        );
    } finally {
        Module._load = originalLoad;
        delete require.cache[require.resolve('../services/vohk_app/twilioService')];
    }
});
