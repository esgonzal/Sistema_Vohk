const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

test('unit fan-out preserves Twilio Client resident calls and SIP intercom calls', async () => {
    const originalLoad = Module._load;
    const activityCalls = [];
    const unitId = '22222222-2222-4222-8222-222222222222';
    const caller = { user_id: 'staff-id', role: 'staff', legal_name: 'Conserjería', sip_identity: 'staff_1' };
    const residents = [
        { user_id: 'resident-1', role: 'resident', legal_name: 'Ana', sip_identity: 'resident_1' },
        { user_id: 'resident-2', role: 'resident', legal_name: 'Luis', sip_identity: 'resident_2' },
    ];

    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/userRepository') return {
            findByIdentity: async identity => {
                if (identity === caller.sip_identity) return caller;
                return residents.find(resident => resident.sip_identity === identity) || null;
            },
            findCallableUnit: async () => ({ unit_id: unitId, condominium_id: 'condo-id' }),
            findActiveResidentsByUnit: async () => residents,
            findCallCondominium: async () => ({ condominium_id: 'condo-id' }),
        };
        if (request === '../../repositories/intercomRepository') return {
            findIntercomByDeviceId: async () => ({
                device_id: 'door-device',
                condominium_id: 'condo-id',
                sip_address: 'sip:door@example.invalid',
            }),
        };
        if (request === '../../repositories/intercomUserRepository') return {
            findIntercomUserByUserAndDevice: async () => ({}),
        };
        if (request === '../../repositories/activityRepository') return {
            createActivity: async input => { activityCalls.push(input); return input; },
        };
        if (request.startsWith('../../repositories/')) return {};
        return originalLoad.call(this, request, parent, isMain);
    };

    try {
        const service = require('../services/vohk_app/twilioService');
        const xml = await service.handleOutgoingCall(`client:${caller.sip_identity}`, `unit:${unitId}`, 'CA-unit-call');
        assert.match(xml, /<Client[^>]*>.*<Identity>resident_1<\/Identity>.*<\/Client>/);
        assert.match(xml, /<Client[^>]*>.*<Identity>resident_2<\/Identity>.*<\/Client>/);
        assert.doesNotMatch(xml, /<Number>/);
        assert.doesNotMatch(xml, /<Sip>/);
        assert.equal(activityCalls[0].metadata.direction, 'user_to_unit');
        assert.deepEqual(activityCalls[0].participants.map(item => item.userId), ['staff-id', 'resident-1', 'resident-2']);

        const residentXml = await service.handleOutgoingCall(
            `client:${caller.sip_identity}`,
            residents[0].sip_identity,
            'CA-resident-call'
        );
        assert.match(residentXml, /<Client[^>]*>.*<Identity>resident_1<\/Identity>.*<\/Client>/);
        assert.doesNotMatch(residentXml, /<Number>/);
        assert.equal(activityCalls[1].metadata.direction, 'user_to_user');

        const intercomXml = await service.handleOutgoingCall(
            `client:${residents[0].sip_identity}`,
            'intercom:door-device',
            'CA-intercom-call'
        );
        assert.match(intercomXml, /<Sip[^>]*>sip:door@example\.invalid<\/Sip>/);
        assert.equal(activityCalls[2].metadata.direction, 'user_to_intercom');
    } finally {
        Module._load = originalLoad;
        delete require.cache[require.resolve('../services/vohk_app/twilioService')];
    }
});
