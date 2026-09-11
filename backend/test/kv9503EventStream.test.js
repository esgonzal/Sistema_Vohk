const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { jsonEventParts, normalizeKv9503Event } = require('../services/vohk_app/hikvision/eventStream');
const { Kv9503EventStreamService } = require('../services/vohk_app/kv9503EventStreamService');

function message(minor = 75, extra = {}) {
    return { eventType: 'AccessControllerEvent', eventState: 'active', dateTime: '2026-09-10T16:03:22-04:00',
        AccessControllerEvent: { majorEventType: 5, subEventType: minor, employeeNoString: '123', currentEvent: false, ...extra } };
}
function part(type, body) {
    body = Buffer.isBuffer(body) ? body : Buffer.from(body);
    return Buffer.concat([Buffer.from(`--test-boundary\r\nContent-Type: ${type}\r\nContent-Length: ${body.length}\r\n\r\n`), body, Buffer.from('\r\n')]);
}
async function collect(buffer, size) {
    const chunks = [];
    for (let i = 0; i < buffer.length; i += size) chunks.push(buffer.subarray(i, i + size));
    const result = [];
    for await (const event of jsonEventParts(Readable.from(chunks), 'multipart/mixed; boundary="test-boundary"')) result.push(event);
    return result;
}

test('multipart parser handles split headers, UTF-8, binary boundary-like data and multiple notifications', async () => {
    const event = message(75, { name: 'José' });
    const binary = Buffer.concat([Buffer.from([0xff, 0xd8, 0, 0xff]), Buffer.from('\r\n--test-boundary\r\n{"fake":true}')]);
    const data = Buffer.concat([part('application/json', JSON.stringify(event)), part('image/jpeg', binary),
        part('application/xml', '<heartbeat/>'), part('application/json', '{broken'),
        part('application/json', JSON.stringify(message(181))), Buffer.from('--test-boundary--\r\n')]);
    for (const size of [1, 7, 127, data.length]) assert.deepEqual(await collect(data, size), [event, message(181)]);
});

test('oversized JSON and malformed lengths fail with bounded memory', async () => {
    const header = Buffer.from('--test-boundary\r\nContent-Type: application/json\r\nContent-Length: 999999\r\n\r\n');
    await assert.rejects(collect(header, header.length), /JSON too large/);
    const missing = Buffer.from('--test-boundary\r\nContent-Type: image/jpeg\r\nContent-Length: invalid\r\n\r\nx');
    await assert.rejects(collect(missing, missing.length), /Invalid event part length/);
    const image = Buffer.alloc(1024 * 1024, 255);
    assert.deepEqual(await collect(Buffer.concat([part('image/jpeg', image), part('application/json', JSON.stringify(message()))]), 4096), [message()]);
});

test('lengthless multipart JSON, heartbeats and images use boundaries across chunk splits', async () => {
    const data = Buffer.concat([
        Buffer.from('--test-boundary\r\nContent-Type: application/xml\r\n\r\n<heartbeat/>\r\n'),
        Buffer.from('--test-boundary\r\nContent-Type: image/jpeg\r\n\r\n'), Buffer.alloc(100000, 255), Buffer.from('\r\n'),
        Buffer.from('--test-boundary\r\nContent-Type: application/json\r\n\r\n'), Buffer.from(JSON.stringify(message(181))),
        Buffer.from('\r\n--test-boundary--\r\n'),
    ]);
    for (const size of [1, 31, 4096, data.length]) assert.deepEqual(await collect(data, size), [message(181)]);
});

test('firmware image headers with LF or mixed CRLF line endings do not disconnect or hide the next PIN event', async () => {
    for (const newline of ['\n', '\r\n']) {
        const image = Buffer.alloc(79246, 255);
        const data = Buffer.concat([
            Buffer.from(`--test-boundary\r\nContent-Disposition: form-data; name="Picture"${newline}Content-Type: image/jpeg\nContent-Length: 79246\r\n\r\n`),
            image, Buffer.from('\r\n'),
            Buffer.from('--test-boundary\nContent-Type: application/json\n\n'),
            Buffer.from(JSON.stringify(message(181))), Buffer.from('\n--test-boundary--\n'),
        ]);
        for (const size of [7, 1024, data.length]) assert.deepEqual(await collect(data, size), [message(181)]);
    }
});

test('only direct face/PIN outcomes pass; relay, card, ambiguous and invalid-time messages do not', () => {
    for (const minor of [75, 76, 101, 102, 149, 150, 151, 179, 180, 181]) assert.equal(normalizeKv9503Event(message(minor)).minor, minor);
    for (const minor of [0, 1, 21, 22, 38, 148, 214, 215, 216, 999]) assert.equal(normalizeKv9503Event(message(minor)), null);
    assert.equal(normalizeKv9503Event(message(75, { majorEventType: 3 })), null);
    assert.equal(normalizeKv9503Event({ ...message(), eventState: 'inactive' }), null);
    assert.equal(normalizeKv9503Event({ ...message(), eventType: 'videoloss' }), null);
    for (const dateTime of [undefined, 'invalid', '2026-09-10T16:03:22']) assert.equal(normalizeKv9503Event({ ...message(), dateTime }), null);
    const normalized = normalizeKv9503Event(message(76, { employeeNoString: '0', password: 'secret', pictureURL: 'private', faceData: 'biometric' }));
    assert.equal(normalized.currentEvent, false);
    assert.equal(normalized.employeeNoString, undefined);
    for (const key of ['password', 'pictureURL', 'faceData']) assert.equal(normalized[key], undefined);
});

const quiet = { log() {}, warn() {}, error() {} };
function service(options = {}) {
    return new Kv9503EventStreamService({ listDevices: async () => [], getAdapter: async () => {},
        persistEvent: async () => {}, eventKey: (d, e) => `${d.device_id}:${e.time}:${e.minor}`,
        logger: quiet, refreshMs: 10000, idleMs: 100, retryMs: 1, ...options });
}

test('replays deduplicate after successful persistence; failed writes can retry; cache stays bounded', async () => {
    const writes = [];
    let fail = true;
    const s = service({ persistEvent: async (d, e) => { if (fail) throw new Error('DB unavailable'); writes.push(e); } });
    const d = { device_id: 'kv' };
    await assert.rejects(s.accept(d, message()), /DB unavailable/);
    assert.equal(s.recent.size, 0);
    fail = false;
    assert.equal(await s.accept(d, message()), true);
    assert.equal(await s.accept(d, message()), false);
    assert.equal(await s.accept(d, message(76)), true);
    assert.equal(await s.accept(d, message(0)), false);
    assert.equal(writes.length, 2);
    for (let i = 0; i < 2100; i++) await s.accept({ device_id: String(i) }, message());
    assert.equal(s.recent.size, 2048);
});

test('one connection per device; credential changes reconnect; removal and stop abort', async () => {
    let devices = [{ device_id: 'kv', password_encrypted: 'one' }];
    const signals = [];
    const s = service({ listDevices: async () => devices });
    s.listen = async (d, signal) => { signals.push(signal); await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true })); };
    // Manual refresh avoids starting the recurring timer in this test.
    s.stopped = false;
    await s.refresh(); clearTimeout(s.timer);
    await s.refresh(); clearTimeout(s.timer);
    assert.equal(signals.length, 1);
    devices = [{ ...devices[0], password_encrypted: 'two' }];
    await s.refresh(); clearTimeout(s.timer);
    assert.equal(signals[0].aborted, true);
    assert.equal(signals.length, 2);
    devices = [];
    await s.refresh(); clearTimeout(s.timer);
    assert.equal(signals[1].aborted, true);
    await s.stop();
});

test('listener primes authentication, reconnects after HTTP failure, and persists streamed events', async () => {
    let attempts = 0;
    const calls = [];
    const controller = new AbortController();
    const s = service({ getAdapter: async () => ({ fetch: async (path, options) => {
        calls.push(path);
        if (path.endsWith('deviceInfo')) return { ok: true, text: async () => '<DeviceInfo/>' };
        attempts++;
        if (attempts === 1) return { ok: false, status: 404 };
        return { ok: true, headers: new Map([['content-type', 'multipart/mixed; boundary=test-boundary']]),
            body: Readable.from([part('application/json', JSON.stringify(message()))]) };
    } }), persistEvent: async () => controller.abort() });
    await s.listen({ device_id: 'kv' }, controller.signal);
    assert.equal(attempts, 2);
    assert.deepEqual(calls, ['/ISAPI/System/deviceInfo', '/ISAPI/Event/notification/alertStream', '/ISAPI/System/deviceInfo', '/ISAPI/Event/notification/alertStream']);
});

test('idle connection aborts and stop cancels reconnect waits', async () => {
    const controller = new AbortController();
    let aborted = false;
    const s = service({ idleMs: 10, getAdapter: async () => ({ fetch: async (path, { signal }) => {
        await new Promise((resolve, reject) => signal.addEventListener('abort', () => {
            aborted = true; controller.abort(); reject(new Error('idle'));
        }, { once: true }));
    } }) });
    await s.listen({ device_id: 'kv' }, controller.signal);
    assert.equal(aborted, true);
});

test('a transient database failure retries the same pending event before consuming another', async () => {
    const controller = new AbortController();
    const attempts = [];
    const s = service({ getAdapter: async () => ({ fetch: async path => {
        if (path.endsWith('deviceInfo')) return { ok: true, text: async () => '' };
        return { ok: true, headers: new Map([['content-type', 'multipart/mixed; boundary=test-boundary']]),
            body: Readable.from([Buffer.concat([part('application/json', JSON.stringify(message(75))), part('application/json', JSON.stringify(message(181)))])]) };
    } }), persistEvent: async (d, e) => {
        attempts.push(e.minor);
        if (attempts.length === 1) throw new Error('temporary DB failure');
        if (e.minor === 181) controller.abort();
    } });
    await s.listen({ device_id: 'kv' }, controller.signal);
    assert.deepEqual(attempts, [75, 75, 181]);
});

test('accepted KV events use existing recent-activity metadata and visitor visibility', async () => {
    const repository = require('../repositories/accessEventRepository');
    const activity = require('../repositories/activityRepository');
    const { persistDeviceEvent, correlationId } = require('../services/vohk_app/accessEventSyncService');
    const originalResolve = repository.resolveEventSubject;
    const originalCreate = activity.createActivity;
    const rows = [];
    repository.resolveEventSubject = async () => ({ subject_name: 'Visitor', subject_type: 'visitor', owner_user_id: 'resident' });
    activity.createActivity = async row => rows.push(row);
    try {
        const s = service({ persistEvent: persistDeviceEvent, eventKey: correlationId });
        const device = { device_id: 'kv', condominium_id: 'condo' };
        await s.accept(device, message(75));
        await s.accept(device, message(75));
        await s.accept(device, message(181));
        await s.accept(device, message(76));
        for (const minor of [149, 150, 179, 180]) await s.accept(device, message(minor));
        assert.equal(rows.length, 7);
        assert.deepEqual(rows.map(r => [r.eventType, r.source, r.status, r.metadata.method]), [
            ['access', 'hikvision_access', 'succeeded', 'face'],
            ['access', 'hikvision_access', 'succeeded', 'pin'],
            ['access', 'hikvision_access', 'failed', 'face'],
            ['access', 'hikvision_access', 'succeeded', 'pin'],
            ['access', 'hikvision_access', 'failed', 'pin'],
            ['access', 'hikvision_access', 'succeeded', 'pin'],
            ['access', 'hikvision_access', 'failed', 'pin'],
        ]);
        assert.equal(rows[0].condominiumId, 'condo');
        assert.equal(rows[0].metadata.offlineReplay, true);
        assert.equal(rows[0].occurredAt.toISOString(), '2026-09-10T20:03:22.000Z');
        assert.deepEqual(rows[0].participants, [{ userId: 'resident', role: 'invitation_owner' }]);
    } finally {
        repository.resolveEventSubject = originalResolve;
        activity.createActivity = originalCreate;
    }
});
