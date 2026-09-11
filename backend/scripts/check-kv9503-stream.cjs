// Read-only smoke check: uses production parser/listener, never inserts activity.
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { Kv9503EventStreamService } = require('../services/vohk_app/kv9503EventStreamService');
const { getAdapterForIntercom } = require('../services/vohk_app/hikvision/adapterFactory');
const { correlationId } = require('../services/vohk_app/accessEventSyncService');
const repository = require('../repositories/accessEventRepository');
const pool = require('../database/db');
const cpu = process.cpuUsage();
const started = Date.now();
let matched = 0;
const service = new Kv9503EventStreamService({
    listDevices: () => repository.findSyncableIntercoms(true),
    getAdapter: getAdapterForIntercom,
    eventKey: correlationId,
    persistEvent: async (device, event) => {
        matched++;
        console.log(JSON.stringify({ model: device.model, major: event.major, minor: event.minor,
            time: event.time, offlineReplay: event.currentEvent === false }));
    },
});
service.start();
setTimeout(async () => {
    await service.stop();
    await pool.end();
    const used = process.cpuUsage(cpu);
    console.log(JSON.stringify({ durationMs: Date.now() - started, matched,
        cpuMs: (used.user + used.system) / 1000, heapMiB: process.memoryUsage().heapUsed / 1024 / 1024,
        databaseWrites: 0 }));
}, 30000);
