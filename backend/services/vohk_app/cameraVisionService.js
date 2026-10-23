const deviceRepository = require('../../repositories/deviceRepository');
const cameraVisionRepository = require('../../repositories/cameraVisionRepository');

const REGION_TYPES = new Set(['landmark', 'occupancy', 'route', 'transition', 'ignore']);
const SEVERITIES = new Set(['information', 'warning', 'critical']);
const KEY_PATTERN = /^[a-z][a-z0-9_]{0,99}$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function fail(status, message, code, details) {
    const error = new Error(message);
    error.status = status;
    if (code) error.code = code;
    if (details) error.details = details;
    return error;
}

async function getAuthorizedCamera(deviceId, userId, role) {
    if (!['admin', 'superadmin'].includes(role)) throw fail(403, 'Forbidden');
    const device = role === 'admin'
        ? await deviceRepository.findDeviceByIdAndAdmin(deviceId, userId)
        : await deviceRepository.findDeviceById(deviceId);
    if (!device || !['camera', 'intercom'].includes(device.type)) {
        throw fail(404, 'Camera or video intercom not found');
    }
    return device;
}

function cleanText(value, field, max, { required = false } = {}) {
    if (value == null) value = '';
    if (typeof value !== 'string') throw fail(400, `${field} must be text`);
    const result = value.trim();
    if (required && !result) throw fail(400, `${field} is required`);
    if (result.length > max) throw fail(400, `${field} is too long`);
    return result;
}

function positiveIntegerOrNull(value, field) {
    if (value == null || value === '') return null;
    if (!Number.isInteger(value) || value <= 0) throw fail(400, `${field} must be a positive integer`);
    return value;
}

function normalizeRegion(region, index) {
    if (!region || typeof region !== 'object') throw fail(400, `Region ${index + 1} is invalid`);
    const key = cleanText(region.key, `regions[${index}].key`, 100, { required: true });
    if (!KEY_PATTERN.test(key)) throw fail(400, `Region key '${key}' is invalid`);
    const type = cleanText(region.type, `regions[${index}].type`, 30, { required: true });
    if (!REGION_TYPES.has(type)) throw fail(400, `Region type '${type}' is invalid`);
    const color = cleanText(region.color, `regions[${index}].color`, 7, { required: true });
    if (!COLOR_PATTERN.test(color)) throw fail(400, `Region color '${color}' is invalid`);
    if (!Array.isArray(region.points) || region.points.length < 3 || region.points.length > 100) {
        throw fail(400, `Region '${key}' must contain between 3 and 100 points`);
    }
    const points = region.points.map((point, pointIndex) => {
        const x = Number(point?.x);
        const y = Number(point?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
            throw fail(400, `Point ${pointIndex + 1} in region '${key}' must use normalized coordinates`);
        }
        return { x: Number(x.toFixed(6)), y: Number(y.toFixed(6)) };
    });
    return {
        key,
        name: cleanText(region.name, `regions[${index}].name`, 150, { required: true }),
        type,
        color: color.toLowerCase(),
        points,
        description: cleanText(region.description, `regions[${index}].description`, 2000),
        enabled: region.enabled !== false,
    };
}

function normalizeRule(rule, index, regionKeys) {
    if (!rule || typeof rule !== 'object') throw fail(400, `Rule ${index + 1} is invalid`);
    const eventType = cleanText(rule.eventType, `rules[${index}].eventType`, 80, { required: true });
    const severity = cleanText(rule.severity || 'information', `rules[${index}].severity`, 20, { required: true });
    if (!SEVERITIES.has(severity)) throw fail(400, `Rule severity '${severity}' is invalid`);
    const conditions = rule.conditions;
    if (!conditions || conditions.type !== 'dwell' || !regionKeys.has(conditions.regionKey)) {
        throw fail(400, `Rule ${index + 1} must reference an existing region with a dwell condition`);
    }
    const minimumSeconds = Number(conditions.minimumSeconds);
    if (!Number.isFinite(minimumSeconds) || minimumSeconds < 1 || minimumSeconds > 86400) {
        throw fail(400, `Rule ${index + 1} dwell time must be between 1 and 86400 seconds`);
    }
    return {
        name: cleanText(rule.name, `rules[${index}].name`, 150, { required: true }),
        eventType,
        conditions: {
            type: 'dwell',
            regionKey: conditions.regionKey,
            minimumSeconds,
            requiresReasoning: conditions.requiresReasoning === true,
        },
        severity,
        schedule: rule.schedule || null,
        enabled: rule.enabled !== false,
    };
}

function serialize(device, stored) {
    const profile = stored.profile;
    return {
        device: {
            deviceId: device.device_id,
            name: device.name,
            type: device.type,
            snapshotUrl: device.snapshot_url || null,
        },
        profile: {
            sceneContext: profile?.scene_context || '',
            calibrationVersion: profile?.calibration_version || 1,
            configurationVersion: profile?.configuration_version || 0,
            referenceWidth: profile?.reference_width || null,
            referenceHeight: profile?.reference_height || null,
            referenceImageKey: profile?.reference_image_key || null,
            enabled: profile?.enabled !== false,
        },
        regions: stored.regions.map(region => ({
            id: region.region_id,
            key: region.region_key,
            name: region.display_name,
            type: region.region_type,
            color: region.color,
            points: region.polygon,
            description: region.description,
            enabled: region.enabled,
        })),
        rules: stored.rules.map(rule => ({
            id: rule.rule_id,
            name: rule.name,
            eventType: rule.event_type,
            conditions: rule.conditions,
            severity: rule.severity,
            schedule: rule.schedule,
            enabled: rule.enabled,
        })),
    };
}

async function getVisionProfile(deviceId, user) {
    const device = await getAuthorizedCamera(deviceId, user.userId, user.role);
    return serialize(device, await cameraVisionRepository.getProfile(deviceId));
}

async function replaceVisionProfile(deviceId, user, payload) {
    const device = await getAuthorizedCamera(deviceId, user.userId, user.role);
    if (!payload || typeof payload !== 'object') throw fail(400, 'Vision profile is required');
    const expectedVersion = Number(payload.configurationVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
        throw fail(400, 'configurationVersion must be a non-negative integer');
    }
    const rawProfile = payload.profile || {};
    const profile = {
        sceneContext: cleanText(rawProfile.sceneContext, 'profile.sceneContext', 5000),
        calibrationVersion: positiveIntegerOrNull(rawProfile.calibrationVersion, 'profile.calibrationVersion') || 1,
        referenceWidth: positiveIntegerOrNull(rawProfile.referenceWidth, 'profile.referenceWidth'),
        referenceHeight: positiveIntegerOrNull(rawProfile.referenceHeight, 'profile.referenceHeight'),
        referenceImageKey: rawProfile.referenceImageKey == null ? null : cleanText(rawProfile.referenceImageKey, 'profile.referenceImageKey', 500),
        enabled: rawProfile.enabled !== false,
    };
    const regions = (Array.isArray(payload.regions) ? payload.regions : []).map(normalizeRegion);
    const keys = new Set(regions.map(region => region.key));
    if (keys.size !== regions.length) throw fail(400, 'Region keys must be unique');
    const rules = (Array.isArray(payload.rules) ? payload.rules : []).map((rule, index) => normalizeRule(rule, index, keys));
    await cameraVisionRepository.replaceProfile(deviceId, expectedVersion, profile, regions, rules, user.userId);
    return serialize(device, await cameraVisionRepository.getProfile(deviceId));
}

module.exports = { getVisionProfile, replaceVisionProfile, _private: { normalizeRegion, normalizeRule } };
