const test = require('node:test');
const assert = require('node:assert/strict');
const { createService, normalizeName } = require('../services/vohk_app/almaService');

const residents = [
    { user_id: 'user-1', legal_name: 'María González', unit_id: 'unit-1', room_no: '504', building_name: 'Torre A' },
    { user_id: 'user-2', legal_name: 'Juan Pérez', unit_id: 'unit-2', room_no: '202', building_name: 'Torre B' },
    { user_id: 'user-3', legal_name: 'Juan Pérez', unit_id: 'unit-3', room_no: '804', building_name: 'Torre C' },
];

function fixture(rows = residents) {
    const calls = [];
    const repository = { findCallableResidentsByDevice: async deviceId => { calls.push(deviceId); return rows; } };
    return { service: createService({ repository, deviceId: 'device-77', tokenSecret: 'test-secret' }), calls };
}

test('normalizes Spanish names and returns a unique resident without internal identifiers', async () => {
    assert.equal(normalizeName('  MARÍA   González '), 'maria gonzalez');
    const { service, calls } = fixture();
    const result = await service.resolveResident('Maria Gonzalez');
    assert.equal(result.status, 'found');
    assert.equal(result.roomNo, '504');
    assert.equal(result.buildingName, 'Torre A');
    assert.equal(typeof result.resolutionToken, 'string');
    assert.equal(result.user_id, undefined);
    assert.equal(result.sip_identity, undefined);
    assert.equal(result.employee_no, undefined);
    assert.deepEqual(calls, ['device-77']);
});

test('returns controlled ambiguity and not-found responses', async () => {
    const { service } = fixture();
    const ambiguous = await service.resolveResident('Juan Perez');
    assert.equal(ambiguous.status, 'ambiguous');
    assert.equal(ambiguous.options.length, 2);
    assert.equal(ambiguous.options.every(option => !('user_id' in option)), true);
    assert.deepEqual(await service.resolveResident('Nombre Inexistente'), { status: 'not_found' });
});

test('rejects invalid input and missing server-side configuration', async () => {
    const { service } = fixture();
    await assert.rejects(service.resolveResident('a'), { status: 400 });
    const unconfigured = createService({ repository: {}, deviceId: '', tokenSecret: '' });
    await assert.rejects(unconfigured.resolveResident('Maria'), { status: 503 });
});

test('HTTP endpoint requires its webhook secret and disables caching', async t => {
    const express = require('express');
    const { createRouter } = require('../routes/vohk_app/almaController');
    const app = express();
    app.use(express.json());
    app.use('/alma', createRouter({ resolveResident: async name => ({ status: 'found', displayName: name }) }, 'webhook-secret'));
    const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/alma/residents/resolve`;
    assert.equal((await fetch(url, { method: 'POST' })).status, 401);
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer webhook-secret' }, body: JSON.stringify({ name: 'María' }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).displayName, 'María');
});
