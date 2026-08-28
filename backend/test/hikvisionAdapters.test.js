const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdapter, getProfileForModel } = require('../services/vohk_app/hikvision/adapterFactory');

function response(data, { ok = true, status = 200 } = {}) {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    return {
        ok,
        status,
        text: async () => text,
        json: async () => JSON.parse(text),
    };
}

function recordingClient(replies = []) {
    const calls = [];
    return {
        calls,
        fetch: async (url, options) => {
            calls.push({ url, options, body: options?.body ? JSON.parse(options.body) : undefined });
            return replies.shift() || response({ statusCode: 1 });
        },
    };
}

const commonIntercom = {
    ip_address: '192.168.0.76',
    port: 80,
    door_id: 1,
    dial_period_number: 1,
    dial_building_number: 1,
    dial_unit_number: 1,
};

test('factory selects the K1T343 profile and rejects unknown intercom models', () => {
    const k1 = createAdapter({ ...commonIntercom, model: 'DS-K1T343MWX' }, recordingClient());
    assert.equal(k1.profile, 'hikvision-minmoe-k1t343-v4');
    assert.equal(k1.supportsStoredAccessEvents, true);
    assert.throws(
        () => createAdapter({ ...commonIntercom, model: 'UNSUPPORTED' }, recordingClient()),
        /Unsupported Hikvision intercom model/,
    );
    assert.deepEqual(getProfileForModel('UNSUPPORTED'), {
        profile: null,
        storedAccessEvents: false,
        supported: false,
    });
});

test('legacy devices without a stored model preserve the KV9503 payload', () => {
    const adapter = createAdapter(commonIntercom, recordingClient());
    const user = adapter.buildResidentUserInfo({
        employeeNo: 'resident-1',
        dynamicCode: '123456',
        name: 'Resident',
        roomNumber: 101,
        floorNumber: 1,
    });
    assert.deepEqual(user.floorNumbers, [1]);
    assert.deepEqual(user.callNumbers, ['101']);
});

test('K1T343 builds the model-specific resident, visitor and phonebook data', () => {
    const adapter = createAdapter({ ...commonIntercom, model: 'DS-K1T343MWX' }, recordingClient());
    const resident = adapter.buildResidentUserInfo({
        employeeNo: 'resident-1',
        dynamicCode: '123456',
        name: 'Resident',
        roomNumber: 101,
        floorNumber: 1,
    });
    assert.deepEqual(resident.callNumbers, ['1-1-1-101']);
    assert.deepEqual(resident.floorNumbers, [1]);
    const visitor = adapter.buildVisitorUserInfo({
        invitation: { valid: { enable: true } },
        visitorName: 'Visitor',
        employeeNo: 'visitor-1',
        dynamicCode: '654321',
    });
    assert.equal(visitor.userVerifyMode, 'faceOrPw');
    assert.deepEqual(adapter.buildPhoneRecord(101, ['sip:resident@example.com']), {
        PhoneNumberRecord: {
            periodNumber: 1,
            buildingNumber: 1,
            unitNumber: 1,
            roomNo: '101',
            PhoneNumbers: [{ phoneNumber: 'sip:resident@example.com' }],
        },
    });
});

test('K1T343 phonebook updates use delete then create', async () => {
    const client = recordingClient([response({ statusCode: 1 }), response({ statusCode: 1 })]);
    const adapter = createAdapter({ ...commonIntercom, model: 'DS-K1T343MWX' }, client);
    const result = await adapter.updatePhoneRecord('record-1', 101, ['1001']);
    assert.equal(result.ok, true);
    assert.equal(client.calls[0].options.method, 'DELETE');
    assert.equal(client.calls[1].options.method, 'POST');
});

test('K1T343 exposes stored access events and blocks unvalidated PIN clearing', async () => {
    const client = recordingClient([response({ AcsEvent: { numOfMatches: 1, InfoList: [] } })]);
    const adapter = createAdapter({ ...commonIntercom, model: 'DS-K1T343MWX' }, client);
    const events = await adapter.searchAccessEvents({ maxResults: 10 });
    assert.equal(events.ok, true);
    assert.equal(client.calls[0].url.endsWith('/ISAPI/AccessControl/AcsEvent?format=json'), true);
    assert.throws(() => adapter.setPin('resident-1', ''), /requires a validated device-specific method/);
});
