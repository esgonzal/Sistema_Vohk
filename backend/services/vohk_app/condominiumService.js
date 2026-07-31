const condominiumRepository = require('../../repositories/condominiumRepository');
const zoneRepository = require('../../repositories/zoneRepository');
const buildingRepository = require('../../repositories/buildingRepository');

async function getCondominiumTree(adminUserId) {
    const rows = await condominiumRepository.findCondominiumTreeRows(adminUserId);
    const condominiumMap = new Map();
    for (const row of rows) {
        let condominium = condominiumMap.get(row.condominium_id);
        if (!condominium) {
            condominium = {
                condominium_id: row.condominium_id, name: row.condominium_name, address: row.address, city: row.city, buildings: [], zones: [],
                _buildingMap: new Map(), _zoneMap: new Map()
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
async function createCondominium(userId, name, address, city) {
    const condominium = await condominiumRepository.createCondominium(userId, name, address, city);
    if (!condominium) {
        throw new Error('Failed to create condominium.');
    }
    const zone = await zoneRepository.createZone(condominium.condominium_id, userId, 'Áreas Comunes');
    if (!zone) {
        try {
            await condominiumRepository.deleteCondominium(condominium.condominium_id, userId);
        } catch (rollbackError) {
            console.error('Failed to roll back condominium creation:', rollbackError);
        }
        throw new Error('Failed to create default zone.');
    }
    return condominium;
}
async function updateCondominium(condominiumId, userId, name, address, city) {
    return condominiumRepository.updateCondominium(condominiumId, userId, name, address, city);
}
async function deleteCondominium(condominiumId, userId) {
    const buildingCount = await condominiumRepository.countBuildingsByCondominium(condominiumId, userId);
    if (buildingCount > 0) {
        const error = new Error(`No se puede eliminar el condominio porque contiene ${buildingCount} torre(s).`)
        error.status = 409;
        throw error;
    }
    return condominiumRepository.deleteCondominium(condominiumId, userId);
}
async function createBuilding(condominiumId, userId, name, floorCount) {
    return buildingRepository.createBuilding(condominiumId, userId, name, floorCount);
}
async function updateBuilding(buildingId, userId, name, floorCount) {
    return buildingRepository.updateBuilding(buildingId, userId, name, floorCount);
}
async function deleteBuilding(buildingId, userId) {
    const unitCount = await buildingRepository.countUnitsByBuilding(buildingId, userId);
    if (unitCount > 0) {
        const error = new Error(`No se puede eliminar la torre porque contiene ${unitCount} unidad(es).`);
        error.status = 409;
        throw error;
    }
    return buildingRepository.deleteBuilding(buildingId, userId);
}
async function createZone(condominiumId, userId, name) {
    return zoneRepository.createZone(condominiumId, userId, name);
}
async function updateZone(zoneId, userId, name) {
    return zoneRepository.updateZone(zoneId, userId, name);
}
async function deleteZone(zoneId, userId) {
    const deviceCount = await zoneRepository.countDevicesByZone(zoneId, userId);
    if (deviceCount > 0) {
        const error = new Error(`No se puede eliminar la zona porque tiene ${deviceCount} dispositivo(s) asociado(s).`)
        error.status = 409;
        throw error;
    }
    return zoneRepository.deleteZone(zoneId, userId);
}

module.exports = {
    getCondominiumTree,
    createCondominium, updateCondominium, deleteCondominium,
    createBuilding, updateBuilding, deleteBuilding,
    createZone, updateZone, deleteZone,
}