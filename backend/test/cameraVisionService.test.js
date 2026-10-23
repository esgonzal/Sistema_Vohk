const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

function loadService({ device, stored, replace } = {}) {
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/deviceRepository') return {
            findDeviceById: async () => device,
            findDeviceByIdAndAdmin: async () => device,
        };
        if (request === '../../repositories/cameraVisionRepository') return {
            getProfile: async () => stored || { profile: null, regions: [], rules: [] },
            replaceProfile: replace || (async () => 1),
        };
        return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[require.resolve('../services/vohk_app/cameraVisionService')];
    const service = require('../services/vohk_app/cameraVisionService');
    Module._load = originalLoad;
    return service;
}

test('empty camera profile is returned with version zero', async () => {
    const service = loadService({ device: { device_id: 'camera-1', name: 'Entrada', type: 'camera' } });
    const result = await service.getVisionProfile('camera-1', { userId: 'admin-1', role: 'admin' });
    assert.equal(result.profile.configurationVersion, 0);
    assert.deepEqual(result.regions, []);
});

test('profile replacement normalizes regions and dwell rules', async () => {
    let captured;
    const service = loadService({
        device: { device_id: 'camera-1', name: 'Entrada', type: 'camera' },
        replace: async (...args) => { captured = args; },
        stored: {
            profile: { configuration_version: 1, calibration_version: 1, enabled: true },
            regions: [], rules: [],
        },
    });
    await service.replaceVisionProfile('camera-1', { userId: 'admin-1', role: 'admin' }, {
        configurationVersion: 0,
        profile: { sceneContext: ' Acceso principal ' },
        regions: [{
            key: 'waiting_area', name: 'Espera', type: 'occupancy', color: '#EF4444',
            points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: .5, y: 1 }],
        }],
        rules: [{
            name: 'Persona esperando', eventType: 'visitor_waiting',
            conditions: { type: 'dwell', regionKey: 'waiting_area', minimumSeconds: 5 },
        }],
    });
    assert.equal(captured[1], 0);
    assert.equal(captured[2].sceneContext, 'Acceso principal');
    assert.equal(captured[3][0].color, '#ef4444');
    assert.equal(captured[4][0].conditions.minimumSeconds, 5);
});

test('invalid normalized coordinates are rejected', async () => {
    const service = loadService({ device: { device_id: 'camera-1', name: 'Entrada', type: 'camera' } });
    await assert.rejects(
        service.replaceVisionProfile('camera-1', { userId: 'admin-1', role: 'admin' }, {
            configurationVersion: 0,
            regions: [{
                key: 'bad', name: 'Bad', type: 'ignore', color: '#ffffff',
                points: [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: .5, y: 1 }],
            }],
        }),
        error => error.status === 400 && /normalized/.test(error.message),
    );
});

test('staff cannot read or edit vision profiles', async () => {
    const service = loadService({ device: { device_id: 'camera-1', type: 'camera' } });
    await assert.rejects(
        service.getVisionProfile('camera-1', { userId: 'staff-1', role: 'staff' }),
        error => error.status === 403,
    );
});
