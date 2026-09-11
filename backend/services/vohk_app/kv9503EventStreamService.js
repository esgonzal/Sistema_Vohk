const { setTimeout: delay } = require('node:timers/promises');
const { jsonEventParts, normalizeKv9503Event } = require('./hikvision/eventStream');

class Kv9503EventStreamService {
    constructor({ listDevices, getAdapter, persistEvent, eventKey, logger = console,
        refreshMs = 60000, idleMs = 90000, retryMs = 5000 } = {}) {
        this.listDevices = listDevices;
        this.getAdapter = getAdapter;
        this.persistEvent = persistEvent;
        this.eventKey = eventKey;
        this.logger = logger;
        this.refreshMs = refreshMs;
        this.idleMs = idleMs;
        this.retryMs = retryMs;
        this.connections = new Map();
        this.recent = new Map();
        this.stopped = true;
    }

    start() {
        if (!this.stopped) return;
        this.stopped = false;
        this.refresh();
    }

    async refresh() {
        try {
            const devices = await this.listDevices();
            if (this.stopped) return;
            const active = new Set(devices.map(d => d.device_id));
            for (const [id, connection] of this.connections) {
                if (!active.has(id)) { connection.controller.abort(); this.connections.delete(id); }
            }
            for (const device of devices) {
                // In-memory only; credentials are never logged or written to disk.
                const signature = JSON.stringify([device.ip_address, device.port, device.username, device.password_encrypted, device.condominium_id]);
                const previous = this.connections.get(device.device_id);
                if (previous?.signature === signature) continue;
                if (previous) {
                    previous.controller.abort();
                    await previous.task;
                }
                if (this.stopped) return;
                const controller = new AbortController();
                const task = this.listen(device, controller.signal);
                this.connections.set(device.device_id, { controller, signature, task });
            }
        } catch {
            this.logger.error('[KV9503 EVENTS] Device refresh failed; retrying');
        } finally {
            if (!this.stopped) this.timer = setTimeout(() => this.refresh(), this.refreshMs);
        }
    }

    async accept(device, message) {
        const event = normalizeKv9503Event(message);
        if (!event) return false;
        const key = this.eventKey(device, event, new Date(event.time));
        const now = Date.now();
        if ((this.recent.get(key) || 0) > now) return false;
        await this.persistEvent(device, event);
        this.recent.delete(key);
        this.recent.set(key, now + 10 * 60 * 1000);
        while (this.recent.size > 2048) this.recent.delete(this.recent.keys().next().value);
        return true;
    }

    async listen(device, signal) {
        let failures = 0;
        while (!signal.aborted) {
            const started = Date.now();
            const session = new AbortController();
            const abort = () => session.abort();
            signal.addEventListener('abort', abort, { once: true });
            let idle;
            const touch = () => { clearTimeout(idle); idle = setTimeout(abort, this.idleMs); };
            let response;
            const observedCodes = new Set();
            try {
                touch();
                const adapter = await this.getAdapter(device);
                if (signal.aborted) break;
                // Prime Digest on a reliable endpoint before opening the stream.
                const identity = await adapter.fetch('/ISAPI/System/deviceInfo', { signal: session.signal });
                await identity.text();
                if (!identity.ok) throw new Error(`HTTP ${identity.status}`);
                response = await adapter.fetch('/ISAPI/Event/notification/alertStream', { signal: session.signal });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                this.logger.log(`[KV9503 EVENTS ${device.device_id}] Connected`);
                const body = response.body;
                async function* chunks() {
                    for await (const chunk of body) { touch(); yield chunk; }
                }
                for await (const message of jsonEventParts(chunks(), response.headers.get('content-type'))) {
                    if (signal.aborted) break;
                    const details = message.AccessControllerEvent;
                    if (message.eventType === 'AccessControllerEvent' && details) {
                        const code = `${Number(details.majorEventType)}/${Number(details.subEventType)}`;
                        if (!observedCodes.has(code) && observedCodes.size < 16) {
                            observedCodes.add(code);
                            this.logger.log(`[KV9503 EVENTS ${device.device_id}] Received ${code}; accepted=${Boolean(normalizeKv9503Event(message))}; offline=${details.currentEvent === false}; metadata=${JSON.stringify({
                                time: message.dateTime, unlockType: details.unlockType,
                                fields: Object.keys(details), hasEmployee: Boolean(details.employeeNoString || details.employeeNo),
                            })}`);
                        }
                    }
                    // Await database writes: bounded memory and natural backpressure.
                    let attempts = 0;
                    while (!signal.aborted) {
                        try {
                            const saved = await this.accept(device, message);
                            if (saved) {
                                this.logger.log(`[KV9503 EVENTS ${device.device_id}] Stored authentication minor=${Number(details.subEventType)} at ${message.dateTime}`);
                            }
                            break;
                        } catch {
                            attempts++;
                            if (attempts === 1) this.logger.warn(`[KV9503 EVENTS ${device.device_id}] Activity write failed; retaining event for retry`);
                            await delay(Math.min(60000, this.retryMs * 2 ** Math.min(attempts, 5)), undefined, { signal }).catch(() => {});
                        }
                    }
                }
            } catch (error) {
                const reason = /^(Invalid event|Event stream headers|Event JSON|HTTP \d)/.test(error.message || '')
                    ? error.message : `${error.name || 'Error'} (${error.code || 'no code'})`;
                if (!signal.aborted) this.logger.warn(`[KV9503 EVENTS ${device.device_id}] ${reason}; reconnecting`);
            } finally {
                clearTimeout(idle);
                session.abort();
                response?.body?.destroy?.();
                signal.removeEventListener('abort', abort);
            }
            if (signal.aborted) break;
            failures = Date.now() - started >= 60000 ? 0 : Math.min(failures + 1, 5);
            const wait = Math.min(60000, this.retryMs * 2 ** failures) + Math.floor(Math.random() * this.retryMs);
            await delay(wait, undefined, { signal }).catch(() => {});
        }
    }

    async stop() {
        this.stopped = true;
        clearTimeout(this.timer);
        const connections = [...this.connections.values()];
        for (const connection of connections) connection.controller.abort();
        this.connections.clear();
        await Promise.all(connections.map(connection => connection.task));
        this.recent.clear();
    }
}

let service;
function startKv9503EventStreams() {
    if (process.env.KV9503_EVENT_STREAM_ENABLED === 'false') return null;
    if (!service) {
        const repository = require('../../repositories/accessEventRepository');
        const { getAdapterForIntercom } = require('./hikvision/adapterFactory');
        const { persistDeviceEvent, correlationId } = require('./accessEventSyncService');
        service = new Kv9503EventStreamService({
            listDevices: () => repository.findSyncableIntercoms(true),
            getAdapter: getAdapterForIntercom,
            persistEvent: persistDeviceEvent,
            eventKey: correlationId,
        });
    }
    service.start();
    return service;
}

module.exports = { Kv9503EventStreamService, startKv9503EventStreams };
