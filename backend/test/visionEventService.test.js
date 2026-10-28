const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

function loadService({ device, createActivity }) {
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === '../../repositories/deviceRepository') return {
            findDeviceById: async () => device,
        };
        if (request === '../../repositories/activityRepository') return {
            createActivity,
        };
        return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[require.resolve('../services/vohk_app/visionEventService')];
    const service = require('../services/vohk_app/visionEventService');
    Module._load = originalLoad;
    return service;
}

const deviceId = 'b58d0be6-093a-4ec9-81c5-e9deb7dab8af';
const correlationId = '4060c416-7280-4acd-9b26-9ea6bc121f07';

test('camera observation becomes a scoped camera activity', async () => {
    let captured;
    const service = loadService({
        device: { device_id: deviceId, condominium_id: 'condo-1', type: 'camera' },
        createActivity: async input => { captured = input; return { activity_event_id: 'event-1' }; },
    });
    const occurredAt = new Date().toISOString();
    const result = await service.recordVisionEvent({ deviceId }, {
        deviceId,
        correlationId,
        occurredAt,
        eventName: 'visitor_waiting',
        observationType: 'dwell',
        regionKey: 'visitor_waiting_area',
        regionName: 'Waiting',
        ruleName: 'Permanencia en Waiting',
        severity: 'information',
        trackId: 12,
        dwellSeconds: 7.2,
        configurationVersion: 4,
    });
    assert.equal(result.activity_event_id, 'event-1');
    assert.equal(captured.condominiumId, 'condo-1');
    assert.equal(captured.eventType, 'camera_event');
    assert.equal(captured.source, 'vohk_vision');
    assert.equal(captured.metadata.analysisStage, 'deterministic_candidate');
    assert.equal(captured.metadata.aiReviewed, false);
});

test('ingestion token cannot write an event for another camera', async () => {
    const service = loadService({
        device: { device_id: deviceId, condominium_id: 'condo-1', type: 'camera' },
        createActivity: async () => { throw new Error('must not be called'); },
    });
    await assert.rejects(
        service.recordVisionEvent({ deviceId: 'f72113de-2d9e-43ca-98f5-cef55779fdcb' }, {
            deviceId,
            correlationId,
            occurredAt: new Date().toISOString(),
            eventName: 'visitor_waiting',
            observationType: 'dwell',
            regionKey: 'visitor_waiting_area',
        }),
        error => error.status === 403,
    );
});
