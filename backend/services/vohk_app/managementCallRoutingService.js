const moment = require('moment-timezone');
const staffShiftRepository = require('../../repositories/staffShiftRepository');
const userRepository = require('../../repositories/userRepository');

const DEFAULT_TIMEZONE = process.env.CONDOMINIUM_TIMEZONE || 'America/Santiago';

function timeToMinutes(value) {
    const [hours, minutes] = value.substring(0, 5).split(':').map(Number);
    return (hours * 60) + minutes;
}

function isShiftActive(shift, localTime) {
    if (!shift.enabled || !Array.isArray(shift.weekdays)) return false;
    const nowMinutes = (localTime.hour() * 60) + localTime.minute();
    const startMinutes = timeToMinutes(shift.start_time);
    const endMinutes = timeToMinutes(shift.end_time);
    const today = localTime.day();
    if (startMinutes < endMinutes) {
        return shift.weekdays.includes(today) && nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }
    // Equal times represent a full 24-hour shift beginning on each selected day.
    if (nowMinutes >= startMinutes) return shift.weekdays.includes(today);
    const previousDay = (today + 6) % 7;
    return shift.weekdays.includes(previousDay) && nowMinutes < endMinutes;
}

async function resolveManagementCallRecipients(condominiumId, now = new Date()) {
    const localTime = moment(now).tz(DEFAULT_TIMEZONE);
    const shifts = await staffShiftRepository.listShifts(condominiumId);
    const staffById = new Map();
    for (const shift of shifts) {
        if (!isShiftActive(shift, localTime)) continue;
        for (const staff of shift.staff || []) {
            if (staff.active === false || !staff.sip_identity || staff.role !== 'staff') continue;
            staffById.set(staff.user_id, staff);
        }
    }
    if (staffById.size) {
        return { recipients: [...staffById.values()], route: 'scheduled_staff', timezone: DEFAULT_TIMEZONE };
    }
    const administrator = await userRepository.findActiveAdminByCondominium(condominiumId);
    return {
        recipients: administrator ? [administrator] : [],
        route: 'admin_fallback',
        timezone: DEFAULT_TIMEZONE,
    };
}

module.exports = { isShiftActive, resolveManagementCallRecipients };
