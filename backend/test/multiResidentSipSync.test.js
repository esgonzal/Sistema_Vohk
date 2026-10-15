const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

test('room SIP synchronization keeps every unique resident identity in one phonebook record', async () => {
    const originalLoad = Module._load;
    const updates = [];
    const adapter = {
        searchPhoneRecords: async () => ({
            ok: true,
            records: [{ id: 'room-record-101', roomNo: '101' }],
        }),
        updatePhoneRecord: async (recordId, roomNo, phoneNumbers) => {
            updates.push({ recordId, roomNo, phoneNumbers });
            return { ok: true };
        },
    };

    Module._load = function (request, parent, isMain) {
        if (request === './hikvision/adapterFactory') return {
            getAdapterForIntercom: async () => adapter,
        };
        if (request === '../../repositories/deviceRepository') return {
            findIntercomByDeviceId: async () => ({ device_id: 'intercom-1', model: 'DS-K1T343MWX' }),
        };
        if (request === './ttlockService') return {};
        if (request.startsWith('../../repositories/')) return {};
        return originalLoad.call(this, request, parent, isMain);
    };

    try {
        delete require.cache[require.resolve('../services/vohk_app/deviceService')];
        const deviceService = require('../services/vohk_app/deviceService');
        const result = await deviceService.syncIntercomRoomSipNumbers(
            'intercom-1',
            '101',
            ['17046230', '15156810', '17046230'],
        );

        assert.equal(result.ok, true);
        assert.deepEqual(updates, [{
            recordId: 'room-record-101',
            roomNo: '101',
            phoneNumbers: ['17046230', '15156810'],
        }]);
    } finally {
        Module._load = originalLoad;
        delete require.cache[require.resolve('../services/vohk_app/deviceService')];
    }
});
