const test = require('node:test');
const assert = require('node:assert/strict');
const { createService } = require('../services/vohk_app/hikvisionQrService');
const qrApi = require('../services/vohk_app/hikvision/qrApi');
const { createAdapter } = require('../services/vohk_app/hikvision/adapterFactory');
const actor = { userId: '00000000-0000-4000-8000-000000000001', role: 'admin' };
const deviceId = '00000000-0000-4000-8000-000000000002';
const userId = '00000000-0000-4000-8000-000000000003';
const input = { userId, valid: 5, times: 1 };
const capability = { employeeNo: { '@min': 1, '@max': 32 }, valid: { '@min': 5, '@max': 43200 }, times: { '@min': 1, '@max': 1000 } };
function fixture(overrides = {}) {
    const calls = [];
    const device = { device_id: deviceId, model: 'DS-KV9503-WBE1' };
    const repo = {
        findManagedDevice: async (...args) => { calls.push(['device', ...args]); return device; },
        findRegisteredUser: async (...args) => { calls.push(['user', ...args]); return { employee_no: '12345678', user_id: userId }; },
        ...overrides.repo,
    };
    const api = {
        getCapabilities: async () => ({ ok: true, data: { QRCodeInfoCap: capability } }),
        findPerson: async () => ({ ok: true, data: { UserInfoSearch: { UserInfo: [{ employeeNo: '12345678', userType: 'normal' }] } } }),
        issue: async (...args) => { calls.push(['issue', ...args.slice(1)]); return { ok: true, data: { QRCodeInfo: { QRCodeString: 'credential' } } }; },
        ...overrides.api,
    };
    const service = createService({ repo, api, getAdapter: async () => ({}), render: async () => 'data:image/png;base64,test' });
    return { service, calls, device };
}

test('issuance uses the device-specific user mapping and returns an image without claiming verified access', async () => {
    const { service, calls } = fixture();
    const result = await service.issue(deviceId, actor, input);
    assert.deepEqual(calls, [['device', deviceId, actor.userId, 'admin'], ['user', deviceId, userId], ['issue', '12345678', 5, 1]]);
    assert.equal(result.qrCode, 'credential');
    assert.equal(result.imageDataUrl, 'data:image/png;base64,test');
    assert.equal(result.verification.eventAttribution, 'unconfirmed');
    assert.equal(result.expiresAt, undefined);
});
test('unauthorized roles cannot reach repository or device', async () => {
    const { service, calls } = fixture();
    await assert.rejects(service.issue(deviceId, { ...actor, role: 'resident' }, input), { status: 403 });
    assert.equal(calls.length, 0);
});
test('inaccessible condominium/device and unmapped user stop before issuing', async () => {
    for (const repo of [{ findManagedDevice: async () => null }, { findRegisteredUser: async () => null }]) {
        const { service, calls } = fixture({ repo });
        await assert.rejects(service.issue(deviceId, actor, input), { status: 404 });
        assert.equal(calls.some(c => c[0] === 'issue'), false);
    }
});
test('rejects arbitrary employee numbers, malformed IDs, coercion and out-of-range inputs', async () => {
    const { service, calls } = fixture();
    for (const bad of [null, [], { ...input, employeeNo: '999' }, { ...input, userId: 'bad' },
        { ...input, valid: '5' }, { ...input, valid: 43201 }, { ...input, times: 0 }, { ...input, times: 1.5 }]) {
        await assert.rejects(service.issue(deviceId, actor, bad), { status: 400 });
    }
    assert.equal(calls.length, 0);
});
test('fresh device bounds are enforced; incomplete capabilities fail closed', async () => {
    for (const cap of [{ ...capability, times: { '@min': 2, '@max': 1000 } }, { ...capability, valid: {} }]) {
        const { service, calls } = fixture({ api: { getCapabilities: async () => ({ ok: true, data: { QRCodeInfoCap: cap } }) } });
        await assert.rejects(service.issue(deviceId, actor, input));
        assert.equal(calls.some(c => c[0] === 'issue'), false);
    }
});
test('device user absence, mismatch and blacklist stop issuance', async () => {
    for (const users of [[], [{ employeeNo: '999', userType: 'normal' }], [{ employeeNo: '12345678', userType: 'blackList' }]]) {
        const { service, calls } = fixture({ api: { findPerson: async () => ({ ok: true, data: { UserInfoSearch: { UserInfo: users } } }) } });
        await assert.rejects(service.issue(deviceId, actor, input), { status: 409 });
        assert.equal(calls.some(c => c[0] === 'issue'), false);
    }
});
test('K1T673 remains explicitly unsupported and K1T343 capability is not reported as proven issuance', async () => {
    const { service, device } = fixture();
    device.model = 'DS-K1T673DWX';
    await assert.rejects(service.getCapabilities(deviceId, actor), { code: 'QR_MODEL_UNVALIDATED' });
    device.model = 'DS-K1T343MWX';
    assert.equal((await service.getCapabilities(deviceId, actor)).verification.issuance, 'unconfirmed');
});
test('K1T343 times rejection is surfaced without retry or credential leakage', async () => {
    let attempts = 0;
    const { service, device } = fixture({ api: { issue: async () => {
        attempts++; return { ok: false, status: 400, data: { errorMsg: 'times', password: 'private' } };
    } } });
    device.model = 'DS-K1T343MWX';
    await assert.rejects(service.issue(deviceId, actor, input), e => e.code === 'QR_TIMES_REJECTED' && !e.message.includes('private'));
    assert.equal(attempts, 1);
});
test('timeouts and malformed successful replies do not retry an issuance', async () => {
    for (const operation of [async () => { throw Error('secret-url'); }, async () => ({ ok: true, data: {} }),
        async () => ({ ok: true, data: { statusCode: 4, errorMsg: 'secret-value' } })]) {
        let attempts = 0;
        const { service } = fixture({ api: { issue: async () => { attempts++; return operation(); } } });
        await assert.rejects(service.issue(deviceId, actor, input), e => !e.message.includes('secret'));
        assert.equal(attempts, 1);
    }
});
test('both existing adapters send the observed QRCodeInfoCond with a timeout', async () => {
    for (const model of ['DS-KV9503-WBE1', 'DS-K1T343MWX']) {
        const calls = [];
        const adapter = createAdapter({ model, ip_address: 'example.invalid', port: 80 }, { fetch: async (url, options) => {
            calls.push({ url, options }); return { ok: true, status: 200, text: async () => '{"QRCodeInfo":{"QRCodeString":"test"}}' };
        } });
        await qrApi.issue(adapter, '12345678', 5, 1);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].options.method, 'POST');
        assert.ok(calls[0].options.signal instanceof AbortSignal);
        assert.deepEqual(JSON.parse(calls[0].options.body), { QRCodeInfoCond: { employeeNo: '12345678', valid: 5, times: 1 } });
    }
});
test('HTTP routes require JWT and mark QR responses no-store', async t => {
    const express = require('express');
    const jwt = require('jsonwebtoken');
    const { createRouter } = require('../routes/vohk_app/hikvisionQrController');
    const oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'qr-route-test-only';
    t.after(() => { if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
    const app = express(); app.use(express.json());
    const { service } = fixture();
    app.use('/devices', createRouter(service));
    const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/devices/${deviceId}/qr`;
    assert.equal((await fetch(url, { method: 'POST' })).status, 401);
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt.sign(actor, process.env.JWT_SECRET)}` }, body: JSON.stringify(input) });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).qrCode, 'credential');
});
