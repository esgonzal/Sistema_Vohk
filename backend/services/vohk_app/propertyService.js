const crypto = require('crypto');
const bcrypt = require('bcrypt');
const condominiumRepository = require('../../repositories/condominiumRepository');
const zoneRepository = require('../../repositories/zoneRepository');
const buildingRepository = require('../../repositories/buildingRepository');
const unitRepository = require('../../repositories/unitRepository');
const userRepository = require('../../repositories/userRepository');
const deviceRepository = require('../../repositories/deviceRepository');
const intercomUserRepository = require('../../repositories/intercomUserRepository');
const residentUnitRepository = require('../../repositories/residentUnitRepository');
const intercomRepository = require('../../repositories/intercomRepository');
const deviceService = require('./deviceService');

async function listCondominiums(adminUserId) {
    return condominiumRepository.findCondominiums(adminUserId);
}
async function findCurrentCondominium(userId, tenantId) {
    return condominiumRepository.findFirstAccessibleByUser(userId, tenantId);
}

async function listZones(condominiumId) {
    return zoneRepository.findZonesByCondominium(condominiumId);
}




async function listBuildings(condominiumId, tenantId) {
    return buildingRepository.findBuildingsByCondominium(condominiumId, tenantId);
}




async function listUnits(buildingId, tenantId) {
    return unitRepository.findUnitsByBuilding(buildingId, tenantId);
}
async function createUnit(buildingId, tenantId, name, roomNo, floor) {
    return unitRepository.createUnit(buildingId, tenantId, name, roomNo, floor);
}
async function updateUnit(unitId, tenantId, name, roomNo, floor) {
    return unitRepository.updateUnit(unitId, tenantId, name, roomNo, floor);
}
async function deleteUnit(unitId, tenantId) {
    const residentCount = await unitRepository.countResidentsByUnit(unitId, tenantId);
    if (residentCount > 0) {
        const error = new Error(
            `No se puede eliminar la unidad. Hay ${residentCount} residente(s) asignado(s).`
        );
        error.status = 409;
        throw error;
    }
    return unitRepository.deleteUnit(unitId, tenantId);
}
async function getResidentUnits(userId) {
    return unitRepository.findResidentUnits(userId);
}

async function listResidents(unitId, tenantId) {
    return userRepository.findUsersByUnit(unitId, tenantId);
}
async function createResident(unitId, tenantId, { legalName, rut, email, isPrimary }) {
    const unit = await unitRepository.findUnitByIdAndTenant(unitId, tenantId);
    if (!unit) { throw new Error(`Unit not found: ${unitId}`); }
    const normalizedRut = rut.trim().replace(/[.-]/g, '').toUpperCase();
    const sipIdentity = normalizedRut.slice(0, -1);
    const username = email;
    let resident = await userRepository.findByRut(rut);
    if (!resident) {
        //const temporaryPassword = crypto.randomBytes(4).toString('hex');
        const temporaryPassword = crypto.randomInt(100000, 999999).toString()
        console.log("temp Pass for: ", temporaryPassword, " for user ", username);
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
        resident = await userRepository.createResident(username, passwordHash, rut, sipIdentity, email, legalName);
    }
    const alreadyInIntercom = await userRepository.assignResidentToUnit(resident.user_id, unitId, isPrimary ?? false, tenantId);
    const condominiumId = await condominiumRepository.getCondominiumByUnitId(unitId);
    const devices = await deviceRepository.findDevicesByCondominium(condominiumId);
    const intercoms = devices.filter(d => d.type === 'intercom');
    const dynamicCode = String(Math.floor(100000 + Math.random() * 900000));
    for (const device of intercoms) {
        try {
            const result = await deviceService.createIntercomUser(device.device_id, {
                employeeNo: resident.sip_identity,
                dynamicCode: dynamicCode,
                name: legalName,
                roomNumber: unit.room_no,
                floorNumber: unit.floor ?? 1
            });
            if (!result.ok) {
                if (result.error === 'employeeNoAlreadyExist') {
                    console.log(`Intercom user already exists on device ${device.device_id}`);
                } else {
                    console.error(
                        `Intercom sync failed for device ${device.device_id}:`,
                        result.error
                    );
                }
            }
            await intercomUserRepository.createIntercomUser(resident.user_id, device.intercom_id, resident.sip_identity, dynamicCode);
        } catch (err) {
            console.error(`Unexpected intercom error for device ${device.device_id}:`, err.message);
        }
    }
    return resident;
}
async function updateResident(userId, tenantId, { unitId, legalName, email, isPrimary }) {
    await userRepository.updateResident(userId, email, legalName, tenantId);
    await residentUnitRepository.updateResidentUnit(userId, unitId, isPrimary, tenantId);
    return userRepository.findById(userId);
}
async function deleteResident(userId, tenantId, unitId) {
    const residentUnit = await residentUnitRepository.findByUserAndUnit(userId, unitId, tenantId);
    if (!residentUnit) return null;
    const condominiumId = await condominiumRepository.getCondominiumByUnitId(unitId);
    await residentUnitRepository.unassignResident(userId, unitId, tenantId);
    const remainingUnits = await residentUnitRepository.findUnitsByUser(userId);
    const stillInSameCondo = remainingUnits.some(u => u.condominium_id === condominiumId);
    if (stillInSameCondo) {
        return { ok: true, removedFromUnitOnly: true };
    }
    const intercomUserRows = await intercomUserRepository.findIntercomUsersByUserId(userId);
    for (const row of intercomUserRows) {
        const intercom = await intercomRepository.findIntercomById(row.intercom_id);
        if (!intercom) {
            console.error("Intercom not found:", row.intercom_id);
            continue;
        }
        const deviceId = intercom.device_id;
        const employeeNo = row.employee_no;
        const response = await deviceService.deleteIntercomUser(deviceId, employeeNo);
        if (!response || response.statusCode !== 1) {
            console.error("Intercom delete failed:", response);
            continue;
        }
        await intercomUserRepository.deleteIntercomUserByUserAndIntercom(userId, row.intercom_id);
    }
    return { ok: true, removedFromCondo: true };
}
async function assignResidentToUnit(userId, unitId, isPrimary, tenantId) {
    return userRepository.assignResidentToUnit(userId, unitId, isPrimary, tenantId);
}
async function updateUsername(userId, username) {
    if (!username?.trim()) {
        throw new Error('Username is required');
    }
    username = username.trim();
    const existing = await userRepository.findByUsername(username);
    if (existing && existing.user_id !== userId) {
        throw new Error('Username is already in use');
    }
    return await userRepository.updateUsername(userId, username);
}
async function updateEmail(userId, email) {
    if (!email?.trim()) {
        throw new Error('Email is required');
    }
    email = email.trim().toLowerCase();
    const existing = await userRepository.findByEmail(email);
    if (existing && existing.user_id !== userId) {
        throw new Error('Email is already in use');
    }
    return await userRepository.updateEmail(userId, email);
}
async function updatePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
        throw new Error('Current and new password are required');
    }
    const user = await userRepository.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash,);
    if (!validPassword) {
        throw new Error('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.updatePassword(userId, passwordHash,);
    return true;
}

async function getUnitTree(condominiumId) {
    const rows = await condominiumRepository.findUnitTreeRows(condominiumId);
    const condominium = {
        condominium_id: condominiumId, name: rows[0]?.condominium_name, address: rows[0]?.address, city: rows[0]?.city, buildings: [], _buildingMap: new Map()
    };
    for (const row of rows) {
        if (!row.building_id) {
            continue;
        }
        let building = condominium._buildingMap.get(row.building_id);
        if (!building) {
            building = { building_id: row.building_id, name: row.building_name, floor_count: row.floor_count, units: [], _unitMap: new Map() };
            condominium._buildingMap.set(row.building_id, building);
            condominium.buildings.push(building);
        }
        if (!row.unit_id) {
            continue;
        }
        let unit = building._unitMap.get(row.unit_id);
        if (!unit) {
            unit = { unit_id: row.unit_id, room_no: row.room_no, floor: row.floor, residents: [] };
            building._unitMap.set(row.unit_id, unit);
            building.units.push(unit);
        }
        if (row.user_id) {
            unit.residents.push({
                user_id: row.user_id, legal_name: row.legal_name, email: row.email, sip_identity: row.sip_identity, role: row.role, active: row.active, is_primary: row.is_primary
            });
        }
    }
    delete condominium._buildingMap;
    condominium.buildings.forEach(building => { delete building._unitMap; });
    return condominium;
}

module.exports = {
    // Condominiums
    listCondominiums, findCurrentCondominium,
    // Zones
    listZones,
    // Buildings
    listBuildings,
    // Units
    listUnits, createUnit, updateUnit, deleteUnit, getResidentUnits,
    // Residents
    listResidents, createResident, updateResident, deleteResident, assignResidentToUnit, updateUsername, updateEmail, updatePassword,
    getUnitTree
};