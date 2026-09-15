const jwt = require('jsonwebtoken');
const encomiendaRepository = require('../../repositories/encomiendaRepository');
const unitRepository = require('../../repositories/unitRepository');
const residentUnitRepository = require('../../repositories/residentUnitRepository');
const staffCondominiumRepository = require('../../repositories/staffCondominiumRepository');
const pushNotificationService = require('./pushNotificationService');

const STAFF_ROLES = ['staff', 'admin', 'superadmin'];

function createError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}

async function assertUnitAccess(userId, role, unitId) {
    const unit = await unitRepository.findUnitHierarchy(unitId);
    if (!unit) throw createError('Unit not found', 404);
    if (role === 'superadmin') return unit;
    if (role === 'admin') {
        const owned = await unitRepository.findUnitByIdAndAdmin(unitId, userId);
        if (!owned) throw createError('Unit not found or not accessible', 404);
        return unit;
    }
    if (role === 'staff') {
        const assignment = await staffCondominiumRepository.findByUserAndCondominium(userId, unit.condominium_id);
        if (!assignment) throw createError('Unit not found or not accessible', 404);
        return unit;
    }
    if (role === 'resident') {
        const relation = await residentUnitRepository.findByUserAndUnit(userId, unitId);
        if (!relation) throw createError('Unit not found or not accessible', 404);
        return unit;
    }
    throw createError('Forbidden', 403);
}

function cleanOptional(value, maxLength) {
    const cleaned = String(value || '').trim();
    if (!cleaned) return null;
    if (cleaned.length > maxLength) throw createError(`Field cannot exceed ${maxLength} characters`, 400);
    return cleaned;
}

async function notifyResidents(encomienda, reminder = false) {
    const residents = await encomiendaRepository.findResidentsByUnit(encomienda.unit_id);
    if (!residents.length) return;
    try {
        await pushNotificationService.sendToUsers(residents.map(item => item.user_id), {
            notification: {
                title: reminder ? 'Tienes una encomienda pendiente' : 'Llegó una encomienda',
                body: reminder ? 'Recuerda retirarla en conserjería.' : `Hay una encomienda para tu unidad${encomienda.unit_name ? ` ${encomienda.unit_name}` : ''}.`,
            },
            data: { type: 'encomienda', encomiendaId: encomienda.encomienda_id, unitId: encomienda.unit_id },
        });
        await encomiendaRepository.markNotified(encomienda.encomienda_id, encomienda.created_by_user_id, residents.map(item => item.user_id), reminder);
    } catch (error) {
        console.error(`[ENCOMIENDA NOTIFICATION ${encomienda.encomienda_id}]`, error);
    }
}

async function createEncomienda({ userId, role, unitId, recipientName, courierName, notes, photo }) {
    if (!STAFF_ROLES.includes(role)) throw createError('Only staff can register packages', 403);
    if (!photo) throw createError('A package photo is required', 400);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimetype)) throw createError('Photo must be JPEG, PNG or WebP', 400);
    const unit = await assertUnitAccess(userId, role, unitId);
    const residents = await encomiendaRepository.findResidentsByUnit(unitId);
    if (!residents.length) throw createError('The selected unit has no active residents', 400);
    const created = await encomiendaRepository.create({
        unitId,
        createdByUserId: userId,
        recipientName: cleanOptional(recipientName, 255),
        courierName: cleanOptional(courierName, 120),
        notes: cleanOptional(notes, 1000),
        photoBytes: photo.buffer,
        photoMimeType: photo.mimetype,
    });
    const result = { ...created, unit_name: unit.name, building_name: unit.building_name, condominium_id: unit.condominium_id };
    await notifyResidents(result, false);
    return result;
}

async function listEncomiendas({ userId, role, unitId, includeHistory }) {
    await assertUnitAccess(userId, role, unitId);
    const rows = await encomiendaRepository.listByUnit(unitId, includeHistory && role !== 'resident');
    if (role !== 'resident') return rows;
    return rows.map(item => ({ ...item, claim_token: jwt.sign(
        { encomiendaId: item.encomienda_id, residentUserId: userId, unitId },
        process.env.JWT_SECRET,
        { expiresIn: '5m', audience: 'encomienda-claim', issuer: 'vohk' },
    ) }));
}

async function getPhoto({ userId, role, encomiendaId }) {
    const encomienda = await encomiendaRepository.findById(encomiendaId);
    if (!encomienda) throw createError('Package not found', 404);
    await assertUnitAccess(userId, role, encomienda.unit_id);
    if (role === 'resident' && encomienda.status !== 'pending') throw createError('Package not found', 404);
    return encomiendaRepository.getPhoto(encomiendaId);
}

async function deliverEncomienda({ userId, role, claimToken }) {
    if (!STAFF_ROLES.includes(role)) throw createError('Only staff can deliver packages', 403);
    let claim;
    try {
        claim = jwt.verify(claimToken, process.env.JWT_SECRET, { audience: 'encomienda-claim', issuer: 'vohk' });
    } catch (_) {
        throw createError('The claim QR is invalid or expired', 400);
    }
    const encomienda = await encomiendaRepository.findById(claim.encomiendaId);
    if (!encomienda) throw createError('Package not found', 404);
    if (claim.unitId !== encomienda.unit_id) throw createError('The claim QR does not match this package', 400);
    await assertUnitAccess(userId, role, encomienda.unit_id);
    const result = await encomiendaRepository.deliver({ encomiendaId: claim.encomiendaId, staffUserId: userId, residentUserId: claim.residentUserId });
    if (result.outcome === 'resident_not_assigned') throw createError('The resident is no longer assigned to this unit', 409);
    if (result.outcome === 'not_found') throw createError('Package not found', 404);
    if (result.outcome !== 'delivered') throw createError(`This package is already ${result.outcome}`, 409);
    return encomiendaRepository.findById(claim.encomiendaId);
}

async function cancelEncomienda({ userId, role, encomiendaId, reason }) {
    if (!STAFF_ROLES.includes(role)) throw createError('Only staff can cancel packages', 403);
    const encomienda = await encomiendaRepository.findById(encomiendaId);
    if (!encomienda) throw createError('Package not found', 404);
    await assertUnitAccess(userId, role, encomienda.unit_id);
    const result = await encomiendaRepository.cancel({ encomiendaId, actorUserId: userId, reason: cleanOptional(reason, 1000) || 'Sin motivo informado' });
    if (!result) throw createError('Only pending packages can be cancelled', 409);
    return result;
}

async function processReminders() {
    const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
    if (hour < 8 || hour >= 22) return 0;
    const intervalHours = Math.max(1, Number.parseInt(process.env.ENCOMIENDA_REMINDER_HOURS || '3', 10) || 3);
    const pending = await encomiendaRepository.findDueReminders(intervalHours);
    for (const encomienda of pending) await notifyResidents(encomienda, true);
    return pending.length;
}

module.exports = { createEncomienda, listEncomiendas, getPhoto, deliverEncomienda, cancelEncomienda, processReminders };
