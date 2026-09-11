// Parse multipart notifications without decoding or retaining image bodies.
async function* jsonEventParts(body, contentType) {
    const boundary = /boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i.exec(contentType || '');
    if (!boundary || (boundary[1] || boundary[2]).length > 200) throw new Error('Invalid event stream boundary');
    const delimiter = Buffer.from(`--${boundary[1] || boundary[2]}`);
    const bodyBoundary = Buffer.from(`\n--${boundary[1] || boundary[2]}`);
    let pending = Buffer.alloc(0);
    let state = 'boundary';
    let remaining = 0;
    let json = false;
    let pieces = [];
    let jsonSize = 0;
    for await (const chunk of body) {
        pending = Buffer.concat([pending, Buffer.from(chunk)]);
        while (pending.length) {
            if (state === 'boundary') {
                const index = pending.indexOf(delimiter);
                if (index < 0) {
                    pending = Buffer.from(pending.subarray(Math.max(0, pending.length - delimiter.length)));
                    break;
                }
                pending = pending.subarray(index + delimiter.length);
                state = 'headers';
            } else if (state === 'headers') {
                if (pending.subarray(0, 2).toString() === '--') return;
                const separator = /\r?\n\r?\n/.exec(pending.toString('latin1', 0, Math.min(pending.length, 16388)));
                if (!separator) {
                    if (pending.length > 16384) throw new Error('Event stream headers too large');
                    break;
                }
                const end = separator.index;
                const headers = pending.subarray(0, end).toString('ascii');
                const length = /(?:^|[\r\n])Content-Length:[ \t]*(\d+)[ \t]*(?=[\r\n]|$)/i.exec(headers);
                if ((!length && /Content-Length:/i.test(headers)) || (length && Number(length[1]) > 16 * 1024 * 1024)) throw new Error(`Invalid event part length: ${JSON.stringify(headers.match(/Content-Length:[^\r\n]*/i)?.[0]?.slice(0,80))}`);
                remaining = length ? Number(length[1]) : null;
                json = /(?:^|[\r\n])Content-Type:[ \t]*application\/json\b/i.test(headers);
                if (json && remaining > 65536) throw new Error('Event JSON too large');
                pieces = [];
                jsonSize = 0;
                pending = pending.subarray(end + separator[0].length);
                state = 'body';
                if (remaining === 0) state = 'boundary';
            } else {
                const boundaryIndex = remaining === null ? pending.indexOf(bodyBoundary) : -1;
                const consumed = remaining === null
                    ? (boundaryIndex >= 0 ? boundaryIndex : Math.max(0, pending.length - bodyBoundary.length))
                    : Math.min(remaining, pending.length);
                if (json) {
                    jsonSize += consumed;
                    if (jsonSize > 65536) throw new Error('Event JSON too large');
                    pieces.push(Buffer.from(pending.subarray(0, consumed)));
                }
                pending = pending.subarray(consumed);
                if (remaining === null) {
                    if (boundaryIndex < 0) break;
                } else {
                    remaining -= consumed;
                    if (remaining) break;
                }
                state = 'boundary';
                if (json) {
                    let event;
                    try { event = JSON.parse(Buffer.concat(pieces).toString('utf8')); } catch { /* Ignore malformed notifications. */ }
                    pieces = [];
                    if (event) yield event;
                }
            }
        }
    }
}

// Only identifiable face/PIN authentication outcomes. Never infer an unlock
// from the configured verification mode, a relay event, or unknown 0/0 data.
// Codes from the device's /doc/Common/static/data/eventJson.json.
const AUTH_MINORS = new Set([75, 76, 101, 102, 149, 150, 151, 179, 180, 181]);
function normalizeKv9503Event(message) {
    if (message?.eventType !== 'AccessControllerEvent' || message.eventState !== 'active') return null;
    const event = message.AccessControllerEvent;
    if (Number(event?.majorEventType) !== 5 || !AUTH_MINORS.has(Number(event?.subEventType))) return null;
    const time = message.dateTime;
    if (typeof time !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(time) || !Number.isFinite(Date.parse(time))) return null;
    const normalized = { major: 5, minor: Number(event.subEventType), time };
    // Whitelist metadata: no PINs, images, URLs, or biometric templates.
    for (const key of ['employeeNoString', 'employeeNo', 'name', 'serialNo', 'doorNo', 'cardReaderNo', 'currentVerifyMode']) {
        if (typeof event[key] === 'string' || typeof event[key] === 'number') normalized[key] = event[key];
    }
    if (normalized.employeeNoString === '0') delete normalized.employeeNoString;
    if (normalized.employeeNo === 0) delete normalized.employeeNo;
    normalized.currentEvent = event.currentEvent;
    return normalized;
}

module.exports = { jsonEventParts, normalizeKv9503Event };
