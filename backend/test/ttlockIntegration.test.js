const test = require('node:test');
const assert = require('node:assert/strict');

const ttlockService = require('../services/vohk_app/ttlockService');
const ttlockClient = require('../integrations/ttlock/ttlockClient');
const ttlockPasscodeRecordSyncService = require('../services/vohk_app/ttlockPasscodeRecordSyncService');

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

test('TTLock passcodes reject simple consecutive and repeated patterns', () => {
    assert.equal(ttlockService._private.validateTtlockPasscode('194835'), '194835');
    assert.throws(() => ttlockService._private.validateTtlockPasscode('123456'), /consecutive or repeated/);
    assert.throws(() => ttlockService._private.validateTtlockPasscode('654321'), /consecutive or repeated/);
    assert.throws(() => ttlockService._private.validateTtlockPasscode('111111'), /consecutive or repeated/);
    assert.throws(() => ttlockService._private.validateTtlockPasscode('121212'), /consecutive or repeated/);
});

test('gate modules reject passcode operations', () => {
    assert.throws(
        () => ttlockService._private.assertPasscodeCapableLock({ type: 'gate', keyboard_pwd_version: 4 }),
        /Gate devices do not support passcodes/,
    );
});

test('TTLock record sync accepts passcode events only for lock devices', () => {
    const occurred = { recordType: 4, success: 1, lockDate: 1759511294000 };
    assert.equal(ttlockPasscodeRecordSyncService.shouldPersistRecord({ type: 'lock' }, occurred), true);
    assert.equal(ttlockPasscodeRecordSyncService.shouldPersistRecord({ type: 'gate' }, occurred), false);
    assert.equal(ttlockPasscodeRecordSyncService.shouldPersistRecord(
        { type: 'lock' },
        { recordType: 3, success: 1, lockDate: 1759511294000 },
    ), false);
});

test('TTLock passcode activity metadata never exposes the raw passcode', () => {
    const metadata = ttlockPasscodeRecordSyncService.recordMetadata(
        { lock_id: 3101840, type: 'lock' },
        { recordType: 4, success: 1, keyboardPwd: '3180512', serverDate: 1759511295000 },
        { subject_name: 'Resident', purpose: 'resident_dynamic', keyboard_pwd_name: 'Resident PIN' },
    );
    assert.equal(metadata.method, 'pin');
    assert.equal(metadata.subjectName, 'Resident');
    assert.equal('keyboardPwd' in metadata, false);
    assert.equal(JSON.stringify(metadata).includes('3180512'), false);
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
