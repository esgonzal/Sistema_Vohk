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

async function listCondominiums(tenantId) {
    return condominiumRepository.findCondominiums(tenantId);
}
async function createCondominium(tenantId, name, address, city) {
    const condominium = await condominiumRepository.createCondominium(tenantId, name, address, city);
    if (!condominium) {
        throw new Error('Failed to create condominium.');
    }
    const zone = await zoneRepository.createZone(condominium.condominium_id, 'Áreas Comunes');
    if (!zone) {
        await condominiumRepository.deleteCondominium(condominium.condominium_id);
        throw new Error('Failed to create default zone.');
    }
    return condominium;
}
async function updateCondominium(condominiumId, tenantId, name, address, city) {
    return condominiumRepository.updateCondominium(condominiumId, tenantId, name, address, city);
}
async function deleteCondominium(condominiumId, tenantId) {
    const buildingCount = await condominiumRepository.countBuildingsByCondominium(condominiumId, tenantId);
    if (buildingCount > 0) {
        const error = new Error(`No se puede eliminar el condominio. Hay ${buildingCount} torre(s) fijada(s).`)
        error.status = 409;
        throw error;
    }
    return condominiumRepository.deleteCondominium(condominiumId, tenantId);
}

async function listZones(condominiumId, tenantId) {
    return zoneRepository.findZonesByCondominium(condominiumId, tenantId);
}
async function createZone(condominiumId, tenantId, name) {
    return zoneRepository.createZone(condominiumId, tenantId, name);
}
async function updateZone(zoneId, tenantId, name) {
    return zoneRepository.updateZone(zoneId, tenantId, name);
}
async function deleteZone(zoneId, tenantId) {
    const deviceCount = await zoneRepository.countDevicesByZone(zoneId, tenantId);
    if (deviceCount > 0) {
        const error = new Error(`No se puede eliminar la zona. Hay ${deviceCount} dispositivo(s) fijado(s).`)
        error.status = 409;
        throw error;
    }
    return zoneRepository.deleteZone(zoneId, tenantId);
}

async function listBuildings(condominiumId, tenantId) {
    return buildingRepository.findBuildingsByCondominium(condominiumId, tenantId);
}
async function createBuilding(condominiumId, tenantId, name, floorCount) {
    return buildingRepository.createBuilding(condominiumId, tenantId, name, floorCount);
}
async function updateBuilding(buildingId, tenantId, name, floorCount) {
    return buildingRepository.updateBuilding(buildingId, tenantId, name, floorCount);
}
async function deleteBuilding(buildingId, tenantId) {
    const unitCount = await buildingRepository.countUnitsByBuilding(buildingId, tenantId);
    if (unitCount > 0) {
        const error = new Error(
            `No se puede eliminar la torre. Hay ${unitCount} unidad(es) fijadas.`
        );
        error.status = 409;
        throw error;
    }
    return buildingRepository.deleteBuilding(buildingId, tenantId);
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

module.exports = {
    // Condominiums
    listCondominiums, createCondominium, updateCondominium, deleteCondominium,
    // Zones
    listZones, createZone, updateZone, deleteZone,
    // Buildings
    listBuildings, createBuilding, updateBuilding, deleteBuilding,
    // Units
    listUnits, createUnit, updateUnit, deleteUnit,
    // Residents
    listResidents, createResident, updateResident, deleteResident, assignResidentToUnit,
};