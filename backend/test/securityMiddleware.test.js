const assert = require('node:assert/strict');
const test = require('node:test');
const twilio = require('twilio');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');
const { validateTwilioWebhook, webhookUrl } = require('../middleware/twilioWebhookMiddleware');

function responseRecorder() {
    return {
        headers: {},
        statusCode: 200,
        body: undefined,
        set(name, value) { this.headers[name] = value; return this; },
        status(value) { this.statusCode = value; return this; },
        json(value) { this.body = value; return this; },
        send(value) { this.body = value; return this; },
    };
}

test('rate limiter rejects requests beyond the configured limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, limit: 2 });
    const req = { ip: '127.0.0.1' };

    for (let attempt = 1; attempt <= 2; attempt += 1) {
        const res = responseRecorder();
        let allowed = false;
        limiter(req, res, () => { allowed = true; });
        assert.equal(allowed, true);
    }

    const rejected = responseRecorder();
    limiter(req, rejected, () => assert.fail('request should have been rate limited'));
    assert.equal(rejected.statusCode, 429);
    assert.equal(rejected.headers['Retry-After'], '60');
});

test('Twilio middleware accepts a valid signature for the configured public URL', () => {
    const previousAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const previousBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL;
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    process.env.TWILIO_WEBHOOK_BASE_URL = 'https://api.example.com';

    try {
        const body = { CallSid: 'CA123', From: 'client:test', To: 'sip:door@example.com' };
        const url = 'https://api.example.com/api/twilio/incoming';
        const signature = twilio.getExpectedTwilioSignature(process.env.TWILIO_AUTH_TOKEN, url, body);
        const headers = { host: 'internal:8080', 'x-twilio-signature': signature };
        const req = {
            body,
            originalUrl: '/api/twilio/incoming',
            protocol: 'http',
            get(name) { return headers[name.toLowerCase()]; },
        };
        const res = responseRecorder();
        let allowed = false;

        assert.equal(webhookUrl(req), url);
        validateTwilioWebhook(req, res, () => { allowed = true; });
        assert.equal(allowed, true);
        assert.equal(res.statusCode, 200);
    } finally {
        if (previousAuthToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
        else process.env.TWILIO_AUTH_TOKEN = previousAuthToken;
        if (previousBaseUrl === undefined) delete process.env.TWILIO_WEBHOOK_BASE_URL;
        else process.env.TWILIO_WEBHOOK_BASE_URL = previousBaseUrl;
    }
});

test('Twilio middleware rejects a missing or invalid signature', () => {
    const previousAuthToken = process.env.TWILIO_AUTH_TOKEN;
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    try {
        const req = {
            body: { CallSid: 'forged' },
            originalUrl: '/api/twilio/client-status',
            protocol: 'https',
            get(name) {
                return name.toLowerCase() === 'host' ? 'api.example.com' : undefined;
            },
        };
        const res = responseRecorder();
        validateTwilioWebhook(req, res, () => assert.fail('forged request should be rejected'));
        assert.equal(res.statusCode, 403);
    } finally {
        if (previousAuthToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
        else process.env.TWILIO_AUTH_TOKEN = previousAuthToken;
    }
});
