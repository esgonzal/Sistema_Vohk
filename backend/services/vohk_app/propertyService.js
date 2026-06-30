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

async function listCondominiums() { return condominiumRepository.findCondominiums(); }
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
async function updateCondominium(condominiumId, name, address, city) { return condominiumRepository.updateCondominium(condominiumId, name, address, city); }
async function deleteCondominium(condominiumId) {
    const buildingCount = await condominiumRepository.countBuildingsByCondominium(condominiumId);
    if (buildingCount > 0) {
        const error = new Error(`No se puede eliminar el condominio. Hay ${buildingCount} torre(s) fijada(s).`)
        error.status = 409;
        throw error;
    }
    return condominiumRepository.deleteCondominium(condominiumId);
}

async function listZones(condominiumId) { return zoneRepository.findZonesByCondominium(condominiumId); }
async function createZone(condominiumId, name) { return zoneRepository.createZone(condominiumId, name); }
async function updateZone(zoneId, name) { return zoneRepository.updateZone(zoneId, name); }
async function deleteZone(zoneId) {
    const deviceCount = await zoneRepository.countDevicesByZone(zoneId);
    if (deviceCount > 0) {
        const error = new Error(`No se puede eliminar la zona. Hay ${deviceCount} dispositivo(s) fijado(s).`)
        error.status = 409;
        throw error;
    }
    return zoneRepository.deleteZone(zoneId);

}

async function listBuildings(condominiumId) { return buildingRepository.findBuildingsByCondominium(condominiumId); }
async function createBuilding(condominiumId, name, floorCount) { return buildingRepository.createBuilding(condominiumId, name, floorCount); }
async function updateBuilding(buildingId, name, floorCount) { return buildingRepository.updateBuilding(buildingId, name, floorCount); }
async function deleteBuilding(buildingId) {
    const unitCount = await buildingRepository.countUnitsByBuilding(buildingId);
    if (unitCount > 0) {
        const error = new Error(`No se puede eliminar la torre. Hay ${unitCount} unidad(es) fijadas.`)
        error.status = 409;
        throw error;
    }
    return buildingRepository.deleteBuilding(buildingId);
}

async function listUnits(buildingId) { return unitRepository.findUnitsByBuilding(buildingId); }
async function createUnit(buildingId, name, roomNo, floor) { return unitRepository.createUnit(buildingId, name, roomNo, floor); }
async function updateUnit(unitId, name, roomNo, floor) { return unitRepository.updateUnit(unitId, name, roomNo, floor); }
async function deleteUnit(unitId) {
    const residentCount = await unitRepository.countResidentsByUnit(unitId);
    if (residentCount > 0) {
        const error = new Error(`No se puede eliminar la unidad. Hay ${residentCount} residente(s) asignado.`);
        error.status = 409;
        throw error;
    }
    return unitRepository.deleteUnit(unitId);
}

async function listResidents(unitId) { return userRepository.findUsersByUnit(unitId); }
async function createResident(unitId, { legalName, rut, email, isPrimary }) {
    const unit = await unitRepository.findUnitById(unitId);
    if (!unit) { throw new Error(`Unit not found: ${unitId}`); }
    const sipIdentity = rut.replace(/\D/g, '');;
    const username = email;
    //const temporaryPassword = crypto.randomBytes(4).toString('hex');
    const temporaryPassword = crypto.randomInt(100000, 999999).toString()
    console.log("temp Pass for: ", temporaryPassword, " for user ", username);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    let resident = await userRepository.findByRut(rut);
    if (!resident) {
        resident = await userRepository.createResident(username, passwordHash, rut, sipIdentity, email, legalName);
    }
    const alreadyInIntercom = await userRepository.assignResidentToUnit(resident.user_id, unitId, isPrimary ?? false);
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
async function updateResident(userId, { unitId, legalName, email, isPrimary }) {
    await userRepository.updateResident(userId, email, legalName);
    await residentUnitRepository.updateResidentUnit(userId, unitId, isPrimary);
    return userRepository.findById(userId);
}
async function deleteResident(userId, unitId) {
    const residentUnit = await residentUnitRepository.findByUserAndUnit(userId, unitId);
    if (!residentUnit) return null;
    const condominiumId = await condominiumRepository.getCondominiumByUnitId(unitId);
    await residentUnitRepository.unassignResident(userId, unitId);
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
async function assignResidentToUnit(userId, unitId, isPrimary) { return userRepository.assignResidentToUnit(userId, unitId, isPrimary); }

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