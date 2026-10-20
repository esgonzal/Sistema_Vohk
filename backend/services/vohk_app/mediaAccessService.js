const jwt = require('jsonwebtoken');

const DEFAULT_TOKEN_TTL = '12h';
const MEDIA_TOKEN_QUERY_PARAM = 'token';

function signingSecret() {
    return process.env.MEDIA_TOKEN_SECRET || process.env.JWT_SECRET;
}

function normalizePath(value) {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const withoutQuery = value.split('?')[0].split('#')[0];
    const withLeadingSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
    const collapsed = withLeadingSlash.replace(/\/{2,}/g, '/');
    return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
}

function parseMediaUrl(value) {
    if (typeof value !== 'string' || value.trim() === '') return null;
    try {
        return new URL(value, 'https://api.vohk.cl');
    } catch (_) {
        return null;
    }
}

function allowedPathForUrl(value) {
    const parsed = parseMediaUrl(value);
    return parsed ? normalizePath(parsed.pathname) : null;
}

function createMediaToken(device, user) {
    const paths = [...new Set([
        allowedPathForUrl(device.snapshot_url),
        allowedPathForUrl(device.stream_url),
    ].filter(Boolean))];

    if (paths.length === 0) return null;
    const secret = signingSecret();
    if (!secret) {
        throw new Error('MEDIA_TOKEN_SECRET or JWT_SECRET must be configured');
    }

    return jwt.sign({
        tokenType: 'media',
        userId: user.userId,
        role: user.role,
        deviceId: device.device_id,
        paths,
    }, secret, {
        expiresIn: process.env.MEDIA_TOKEN_TTL || DEFAULT_TOKEN_TTL,
        issuer: 'vohk-api',
        audience: 'vohk-media',
    });
}

function addTokenToUrl(value, token) {
    const parsed = parseMediaUrl(value);
    if (!parsed || !token) return value;
    parsed.searchParams.set(MEDIA_TOKEN_QUERY_PARAM, token);
    return parsed.toString();
}

function protectDevice(device, user) {
    if (!device || typeof device !== 'object') return device;
    const token = createMediaToken(device, user);
    if (!token) return device;
    return {
        ...device,
        snapshot_url: addTokenToUrl(device.snapshot_url, token),
        stream_url: addTokenToUrl(device.stream_url, token),
    };
}

function protectDeviceResponse(value, user) {
    if (Array.isArray(value)) {
        return value.map(item => protectDeviceResponse(item, user));
    }
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value.devices)) {
        return {
            ...value,
            devices: value.devices.map(device => protectDevice(device, user)),
        };
    }
    if ('device_id' in value && ('snapshot_url' in value || 'stream_url' in value)) {
        return protectDevice(value, user);
    }
    if (Array.isArray(value.zones)) {
        return {
            ...value,
            zones: value.zones.map(zone => protectDeviceResponse(zone, user)),
        };
    }
    return value;
}

function verifyMediaToken(token, requestedPath) {
    if (!token || !signingSecret()) return false;
    try {
        const payload = jwt.verify(token, signingSecret(), {
            issuer: 'vohk-api',
            audience: 'vohk-media',
        });
        const normalizedRequestedPath = normalizePath(requestedPath);
        return payload.tokenType === 'media'
            && Array.isArray(payload.paths)
            && payload.paths.some(path => normalizePath(path) === normalizedRequestedPath);
    } catch (_) {
        return false;
    }
}

function tokenFromQueryString(queryString) {
    const query = typeof queryString === 'string' ? queryString.replace(/^\?/, '') : '';
    return new URLSearchParams(query).get(MEDIA_TOKEN_QUERY_PARAM);
}

module.exports = {
    MEDIA_TOKEN_QUERY_PARAM,
    addTokenToUrl,
    normalizePath,
    protectDeviceResponse,
    tokenFromQueryString,
    verifyMediaToken,
};
