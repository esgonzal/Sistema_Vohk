const condominiumRepository = require('../../repositories/condominiumRepository');
const zoneRepository = require('../../repositories/zoneRepository');
const buildingRepository = require('../../repositories/buildingRepository');
const staffCondominiumRepository = require('../../repositories/staffCondominiumRepository');
const staffShiftRepository = require('../../repositories/staffShiftRepository');

async function requireManagedCondominium(condominiumId, userId, role) {
    const condominium = role === 'superadmin'
        ? await condominiumRepository.findById(condominiumId)
        : await condominiumRepository.findByIdAndAdmin(condominiumId, userId);
    if (!condominium) {
        const error = new Error('Condominium not found');
        error.status = 404;
        throw error;
    }
    return condominium;
}

async function getCondominiumTree(userId, role) {
    const adminUserId = role === 'admin' ? userId : null;
    const staffUserId = role === 'staff' ? userId : null;
    const rows = await condominiumRepository.findCondominiumTreeRows(adminUserId, staffUserId);
    const condominiumMap = new Map();
    for (const row of rows) {
        let condominium = condominiumMap.get(row.condominium_id);
        if (!condominium) {
            condominium = {
                condominium_id: row.condominium_id,
                name: row.condominium_name,
                address: row.address,
                city: row.city,
                resident_camera_access: row.resident_camera_access,
                max_recurrent_invitations: row.max_recurrent_invitations,
                max_temporary_duration_hours: row.max_temporary_duration_hours,
                max_express_duration_hours: row.max_express_duration_hours,
                buildings: [],
                zones: [],
                _buildingMap: new Map(),
                _zoneMap: new Map()
            };
            condominiumMap.set(row.condominium_id, condominium);
        }
        if (row.building_id && !condominium._buildingMap.has(row.building_id)) {
            const building = { building_id: row.building_id, name: row.building_name, floor_count: row.floor_count };
            condominium._buildingMap.set(row.building_id, building);
            condominium.buildings.push(building);
        }
        if (row.zone_id && !condominium._zoneMap.has(row.zone_id)) {
            const zone = { zone_id: row.zone_id, name: row.zone_name, created_at: row.zone_created_at };
            condominium._zoneMap.set(row.zone_id, zone);
            condominium.zones.push(zone);
        }
    }
    const condominiums = [];
    for (const condominium of condominiumMap.values()) {
        delete condominium._buildingMap;
        delete condominium._zoneMap;
        condominiums.push(condominium);
    }
    return condominiums;
}

async function listAdminCondominiums(userId, role) {
    if (role === 'staff') {
        return staffCondominiumRepository.findCondominiumsByStaff(userId);
    }
    return condominiumRepository.findByAdminUserId(role === 'superadmin' ? null : userId);
}

async function createCondominium(userId, role, name, address, city) {
    const condominium = await condominiumRepository.createCondominium(userId, name, address, city);
    if (!condominium) {
        throw new Error('Failed to create condominium.');
    }
    const zone = await zoneRepository.createZone(condominium.condominium_id, role === 'superadmin' ? null : userId, 'Áreas Comunes');
    if (!zone) {
        try {
            await condominiumRepository.deleteCondominium(condominium.condominium_id, role === 'superadmin' ? null : userId);
        } catch (rollbackError) {
            console.error('Failed to roll back condominium creation:', rollbackError);
        }
        throw new Error('Failed to create default zone.');
    }
    return condominium;
}

async function updateCondominium(condominiumId, userId, role, name, address, city) {
    return condominiumRepository.updateCondominium(condominiumId, role === 'superadmin' ? null : userId, name, address, city);
}

async function deleteCondominium(condominiumId, userId, role) {
    const adminUserId = role === 'superadmin' ? null : userId;
    const buildingCount = await condominiumRepository.countBuildingsByCondominium(condominiumId, adminUserId);
    if (buildingCount > 0) {
        const error = new Error(`No se puede eliminar el condominio porque contiene ${buildingCount} torre(s).`);
        error.status = 409;
        throw error;
    }
    return condominiumRepository.deleteCondominium(condominiumId, adminUserId);
}

async function updateResidentCameraAccess(condominiumId, userId, role, enabled) {
    return condominiumRepository.updateResidentCameraAccess(condominiumId, role === 'superadmin' ? null : userId, enabled);
}

async function getInvitationSettings(condominiumId, userId, role) {
    return condominiumRepository.getInvitationSettings(condominiumId, role === 'superadmin' ? null : userId);
}

async function updateInvitationSettings(condominiumId, userId, role, maxRecurrentInvitations, maxTemporaryDurationHours, maxExpressDurationHours) {
    return condominiumRepository.updateInvitationSettings(condominiumId, role === 'superadmin' ? null : userId, maxRecurrentInvitations, maxTemporaryDurationHours, maxExpressDurationHours);
}

async function getStaffScheduleData(condominiumId, userId, role) {
    await requireManagedCondominium(condominiumId, userId, role);
    const [staff, shifts] = await Promise.all([
        staffShiftRepository.listStaff(condominiumId),
        staffShiftRepository.listShifts(condominiumId)
    ]);
    return { staff, shifts };
}

async function createStaffShift(condominiumId, userId, role, input) {
    await requireManagedCondominium(condominiumId, userId, role);
    const shiftId = await staffShiftRepository.saveShift({ condominiumId, ...input });
    const shifts = await staffShiftRepository.listShifts(condominiumId);
    return shifts.find(shift => shift.shift_id === shiftId);
}

async function updateStaffShift(shiftId, userId, role, input) {
    const existing = await staffShiftRepository.findById(shiftId);
    if (!existing) return null;
    await requireManagedCondominium(existing.condominium_id, userId, role);
    const savedId = await staffShiftRepository.saveShift({
        shiftId,
        condominiumId: existing.condominium_id,
        ...input
    });
    if (!savedId) return null;
    const shifts = await staffShiftRepository.listShifts(existing.condominium_id);
    return shifts.find(shift => shift.shift_id === savedId);
}

async function deleteStaffShift(shiftId, userId, role) {
    const existing = await staffShiftRepository.findById(shiftId);
    if (!existing) return null;
    await requireManagedCondominium(existing.condominium_id, userId, role);
    return staffShiftRepository.deleteShift(shiftId, existing.condominium_id);
}

async function createBuilding(condominiumId, userId, role, name, floorCount) {
    return buildingRepository.createBuilding(condominiumId, role === 'superadmin' ? null : userId, name, floorCount);
}

async function updateBuilding(buildingId, userId, role, name, floorCount) {
    return buildingRepository.updateBuilding(buildingId, role === 'superadmin' ? null : userId, name, floorCount);
}

async function deleteBuilding(buildingId, userId, role) {
    const adminUserId = role === 'superadmin' ? null : userId;
    const unitCount = await buildingRepository.countUnitsByBuilding(buildingId, adminUserId);
    if (unitCount > 0) {
        const error = new Error(`No se puede eliminar la torre porque contiene ${unitCount} unidad(es).`);
        error.status = 409;
        throw error;
    }
    return buildingRepository.deleteBuilding(buildingId, adminUserId);
}

async function createZone(condominiumId, userId, role, name) {
    return zoneRepository.createZone(condominiumId, role === 'superadmin' ? null : userId, name);
}

async function updateZone(zoneId, userId, role, name) {
    return zoneRepository.updateZone(zoneId, role === 'superadmin' ? null : userId, name);
}

async function deleteZone(zoneId, userId, role) {
    const adminUserId = role === 'superadmin' ? null : userId;
    const deviceCount = await zoneRepository.countDevicesByZone(zoneId, adminUserId);
    if (deviceCount > 0) {
        const error = new Error(`No se puede eliminar la zona porque tiene ${deviceCount} dispositivo(s) asociado(s).`);
        error.status = 409;
        throw error;
    }
    return zoneRepository.deleteZone(zoneId, adminUserId);
}

module.exports = {
    getCondominiumTree, listAdminCondominiums,
    createCondominium, updateCondominium, deleteCondominium, updateResidentCameraAccess,
    getInvitationSettings, updateInvitationSettings,
    getStaffScheduleData, createStaffShift, updateStaffShift, deleteStaffShift,
    createBuilding, updateBuilding, deleteBuilding,
    createZone, updateZone, deleteZone
};
