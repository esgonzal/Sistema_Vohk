const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mediaAccessService = require('../services/vohk_app/mediaAccessService');

const originalJwtSecret = process.env.JWT_SECRET;
const originalMediaTokenSecret = process.env.MEDIA_TOKEN_SECRET;
const originalMediaTokenTtl = process.env.MEDIA_TOKEN_TTL;

test.beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    delete process.env.MEDIA_TOKEN_SECRET;
    delete process.env.MEDIA_TOKEN_TTL;
});

test.after(() => {
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    if (originalMediaTokenSecret === undefined) delete process.env.MEDIA_TOKEN_SECRET;
    else process.env.MEDIA_TOKEN_SECRET = originalMediaTokenSecret;
    if (originalMediaTokenTtl === undefined) delete process.env.MEDIA_TOKEN_TTL;
    else process.env.MEDIA_TOKEN_TTL = originalMediaTokenTtl;
});

test('protectDeviceResponse signs only the paths belonging to each device', () => {
    const response = {
        zones: [{
            devices: [{
                device_id: 'device-1',
                snapshot_url: 'https://api.vohk.cl/snapshots/cam1.jpg?cache=false',
                stream_url: 'https://api.vohk.cl/cam1/',
            }],
        }],
    };

    const protectedResponse = mediaAccessService.protectDeviceResponse(response, {
        userId: 'user-1',
        role: 'staff',
    });
    const device = protectedResponse.zones[0].devices[0];
    const snapshotToken = new URL(device.snapshot_url).searchParams.get('token');
    const streamToken = new URL(device.stream_url).searchParams.get('token');

    assert.equal(snapshotToken, streamToken);
    assert.equal(mediaAccessService.verifyMediaToken(streamToken, 'cam1'), true);
    assert.equal(mediaAccessService.verifyMediaToken(streamToken, '/snapshots/cam1.jpg'), true);
    assert.equal(mediaAccessService.verifyMediaToken(streamToken, '/cam2'), false);
    assert.equal(new URL(device.snapshot_url).searchParams.get('cache'), 'false');
});

test('verifyMediaToken rejects expired and non-media JWTs', () => {
    const expired = jwt.sign({ tokenType: 'media', paths: ['/cam1'] }, process.env.JWT_SECRET, {
        expiresIn: -1,
        issuer: 'vohk-api',
        audience: 'vohk-media',
    });
    const applicationToken = jwt.sign({ userId: 'user-1', role: 'staff' }, process.env.JWT_SECRET);

    assert.equal(mediaAccessService.verifyMediaToken(expired, '/cam1'), false);
    assert.equal(mediaAccessService.verifyMediaToken(applicationToken, '/cam1'), false);
});

test('tokenFromQueryString reads MediaMTX query payloads', () => {
    assert.equal(mediaAccessService.tokenFromQueryString('controls=false&token=abc.def'), 'abc.def');
    assert.equal(mediaAccessService.tokenFromQueryString('?token=encoded%20token'), 'encoded token');
});
