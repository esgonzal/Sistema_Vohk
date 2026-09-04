const test = require('node:test');
const assert = require('node:assert/strict');

const ttlockService = require('../services/vohk_app/ttlockService');
const ttlockClient = require('../integrations/ttlock/ttlockClient');

test('TTLock discovery exposes only operational metadata', () => {
    const lock = ttlockService._private.publicLock({
        lockId: 3101840,
        keyId: 329668100,
        lockAlias: 'K2F-SOPORTE',
        lockName: 'K2_bb2cc3',
        lockMac: 'EA:7B:12:C3:2C:BB',
        keyboardPwdVersion: 4,
        hasGateway: 1,
        remoteEnable: 1,
        keyRight: 1,
        userType: '110302',
        lockVersion: { scene: 4 },
        lockData: 'must-not-leave-the-server',
        noKeyPwd: '3180512',
    });

    assert.equal(lock.hasGateway, true);
    assert.equal(lock.remoteEnabled, true);
    assert.equal(lock.suggestedDeviceType, 'lock');
    assert.equal('lockData' in lock, false);
    assert.equal('noKeyPwd' in lock, false);
});

test('TTLock scene 2 is suggested as a gate module', () => {
    const lock = ttlockService._private.publicLock({
        lockId: 34739974,
        hasGateway: 1,
        remoteEnable: 1,
        lockVersion: { scene: 2 },
    });
    assert.equal(lock.suggestedDeviceType, 'gate');
});

test('resident passcodes require numeric values and accept six digits', () => {
    assert.equal(ttlockService._private.validatePasscode('123456'), '123456');
    assert.throws(() => ttlockService._private.validatePasscode('12A456'), /digits/);
});

test('TTLock form data omits undefined optional values', () => {
    const params = ttlockClient._private.appendDefined(new URLSearchParams(), {
        lockId: 123,
        keyboardPwdName: undefined,
        startDate: 0,
    });
    assert.equal(params.get('lockId'), '123');
    assert.equal(params.has('keyboardPwdName'), false);
    assert.equal(params.get('startDate'), '0');
});
