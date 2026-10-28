const deviceRepository = require('../../repositories/deviceRepository');
const activityRepository = require('../../repositories/activityRepository');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY_PATTERN = /^[a-z][a-z0-9_]{0,99}$/;
const OBSERVATION_TYPES = new Set(['dwell', 'region_entry']);

function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function cleanKey(value, field) {
    if (typeof value !== 'string' || !KEY_PATTERN.test(value)) {
        throw fail(400, `${field} is invalid`);
    }
    return value;
}

async function recordVisionEvent(token, payload) {
    if (!payload || typeof payload !== 'object') throw fail(400, 'Event payload is required');
    const deviceId = payload.deviceId;
    if (!UUID_PATTERN.test(deviceId || '')) throw fail(400, 'deviceId is invalid');
    if (token.deviceId !== deviceId) throw fail(403, 'Token is not valid for this camera');

    const device = await deviceRepository.findDeviceById(deviceId);
    if (!device || !['camera', 'intercom'].includes(device.type)) {
        throw fail(404, 'Camera or video intercom not found');
    }

    const observationType = payload.observationType;
    if (!OBSERVATION_TYPES.has(observationType)) throw fail(400, 'observationType is invalid');
    const eventName = cleanKey(payload.eventName, 'eventName');
    const regionKey = cleanKey(payload.regionKey, 'regionKey');
    const correlationId = payload.correlationId;
    if (!UUID_PATTERN.test(correlationId || '')) throw fail(400, 'correlationId is invalid');

    const occurredAt = new Date(payload.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) throw fail(400, 'occurredAt is invalid');
    const now = Date.now();
    if (occurredAt.getTime() > now + 60_000 || occurredAt.getTime() < now - 24 * 60 * 60 * 1000) {
        throw fail(400, 'occurredAt is outside the accepted window');
    }

    const dwellSeconds = payload.dwellSeconds == null ? null : Number(payload.dwellSeconds);
    if (dwellSeconds != null && (!Number.isFinite(dwellSeconds) || dwellSeconds < 0 || dwellSeconds > 86400)) {
        throw fail(400, 'dwellSeconds is invalid');
    }
    const trackId = payload.trackId == null ? null : Number(payload.trackId);
    if (trackId != null && (!Number.isInteger(trackId) || trackId < 0)) throw fail(400, 'trackId is invalid');

    return activityRepository.createActivity({
        condominiumId: device.condominium_id,
        deviceId,
        eventType: 'camera_event',
        status: 'recorded',
        source: 'vohk_vision',
        correlationId,
        occurredAt: occurredAt.toISOString(),
        metadata: {
            eventName,
            observationType,
            regionKey,
            regionName: typeof payload.regionName === 'string' ? payload.regionName.slice(0, 150) : regionKey,
            ruleName: typeof payload.ruleName === 'string' ? payload.ruleName.slice(0, 150) : eventName,
            severity: ['information', 'warning', 'critical'].includes(payload.severity) ? payload.severity : 'information',
            dwellSeconds,
            trackId,
            configurationVersion: Number.isInteger(payload.configurationVersion) ? payload.configurationVersion : null,
            analysisStage: 'deterministic_candidate',
            aiReviewed: false,
        },
    });
}

module.exports = { recordVisionEvent };
