const crypto = require('crypto');
const moment = require('moment-timezone');
const accessEventRepository = require('../../repositories/accessEventRepository');
const activityRepository = require('../../repositories/activityRepository');
const { getAdapterForIntercom } = require('./hikvision/adapterFactory');

const DEVICE_TIMEZONE = process.env.DEVICE_TIMEZONE || 'America/Santiago';
const configuredLookbackDays = Number.parseInt(process.env.ACCESS_EVENT_INITIAL_LOOKBACK_DAYS || '30', 10);
const INITIAL_LOOKBACK_MS = Math.min(Math.max(configuredLookbackDays || 30, 1), 365) * 24 * 60 * 60 * 1000;
const OVERLAP_MS = 5 * 60 * 1000;
const PAGE_SIZE = 30;
const MAX_PAGES = 100;

function formatDeviceTime(value) {
    return moment(value).tz(DEVICE_TIMEZONE).format('YYYY-MM-DDTHH:mm:ssZ');
}

function parseDeviceTime(value) {
    if (!value) return new Date();
    const text = String(value);
    const parsed = /(Z|[+-]\d\d:\d\d)$/.test(text)
        ? moment.parseZone(text)
        : moment.tz(text, DEVICE_TIMEZONE);
    return parsed.isValid() ? parsed.toDate() : new Date();
}

function employeeNoFromEvent(event) {
    return event.employeeNoString || event.employeeNo || event.EmployeeNo || null;
}

function eventDescription(event) {
    return event.eventDescription || event.description || event.label || event.eventType || null;
}

function eventStatus(event) {
    const description = String(eventDescription(event) || '').toLowerCase();
    const inductiveType = Number(event.inductiveEventType || event.inductiveEvent || 0);
    if (inductiveType === 1) return 'succeeded';
    if (inductiveType === 2) return 'failed';
    if (/fail|invalid|denied|illegal|expired|error|rechaz|fallid|inválid|inval/.test(description)) return 'failed';
    return 'recorded';
}

function correlationId(device, event, occurredAt) {
    const serial = event.serialNo ?? event.SerialNo;
    if (serial !== undefined && serial !== null) {
        return `${device.device_id}:${serial}:${occurredAt.toISOString()}`;
    }
    const stable = JSON.stringify({
        deviceId: device.device_id,
        time: occurredAt.toISOString(),
        employeeNo: employeeNoFromEvent(event),
        major: event.major,
        minor: event.minor,
        doorNo: event.doorNo,
        readerNo: event.cardReaderNo,
        description: eventDescription(event),
    });
    return `${device.device_id}:${crypto.createHash('sha256').update(stable).digest('hex')}`;
}

function eventMetadata(event, subject) {
    return {
        employeeNo: employeeNoFromEvent(event),
        subjectName: subject?.subject_name || event.name || null,
        subjectType: subject?.subject_type || 'unknown',
        description: eventDescription(event),
        major: event.major ?? null,
        minor: event.minor ?? null,
        inductiveEventType: event.inductiveEventType ?? null,
        doorNo: event.doorNo ?? null,
        cardReaderNo: event.cardReaderNo ?? null,
        verifyMode: event.currentVerifyMode || event.verifyMode || null,
        attendanceStatus: event.attendanceStatus || null,
        serialNo: event.serialNo ?? null,
    };
}

async function persistDeviceEvent(device, event) {
    const employeeNo = employeeNoFromEvent(event);
    const occurredAt = parseDeviceTime(event.time || event.dateTime);
    const subject = await accessEventRepository.resolveEventSubject(device.device_id, employeeNo, occurredAt);
    const participants = subject?.owner_user_id
        ? [{ userId: subject.owner_user_id, role: 'invitation_owner' }]
        : [];
    await activityRepository.createActivity({
        condominiumId: device.condominium_id,
        deviceId: device.device_id,
        actorUserId: subject?.actor_user_id || null,
        eventType: 'access',
        status: eventStatus(event),
        source: 'hikvision_access',
        correlationId: correlationId(device, event, occurredAt),
        occurredAt,
        metadata: eventMetadata(event, subject),
        participants,
    });
}

async function syncDeviceAccessEvents(device) {
    const adapter = await getAdapterForIntercom(device);
    if (!adapter.supportsStoredAccessEvents) return { deviceId: device.device_id, skipped: true };

    const latest = await accessEventRepository.findLatestEventTime(device.device_id);
    const now = new Date();
    const start = latest
        ? new Date(new Date(latest).getTime() - OVERLAP_MS)
        : new Date(now.getTime() - INITIAL_LOOKBACK_MS);
    const searchID = crypto.randomUUID().replace(/-/g, '');
    let position = 0;
    let imported = 0;

    for (let page = 0; page < MAX_PAGES; page += 1) {
        const result = await adapter.searchAccessEvents({
            position,
            maxResults: PAGE_SIZE,
            major: 5,
            minor: 0,
            startTime: formatDeviceTime(start),
            endTime: formatDeviceTime(new Date(now.getTime() + 60_000)),
            picEnable: false,
            timeReverseOrder: false,
            searchID,
        });
        if (!result.ok) {
            throw new Error(`Access event query failed with HTTP ${result.status}: ${JSON.stringify(result.data)}`);
        }
        const events = Array.isArray(result.data.InfoList) ? result.data.InfoList : [];
        for (const event of events) {
            await persistDeviceEvent(device, event);
            imported += 1;
        }
        const matched = Number(result.data.numOfMatches ?? events.length);
        position += matched;
        if (result.data.responseStatusStrg !== 'MORE' || matched === 0) break;
    }

    return { deviceId: device.device_id, imported };
}

async function syncAllAccessEvents() {
    const devices = await accessEventRepository.findSyncableIntercoms();
    const results = [];
    for (const device of devices) {
        try {
            results.push(await syncDeviceAccessEvents(device));
        } catch (error) {
            console.error(`[ACCESS EVENT SYNC ${device.device_id}]`, error.message);
            results.push({ deviceId: device.device_id, error: error.message });
        }
    }
    return results;
}

module.exports = {
    employeeNoFromEvent,
    eventStatus,
    syncDeviceAccessEvents,
    syncAllAccessEvents,
};
