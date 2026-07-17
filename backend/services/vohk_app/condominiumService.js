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
    //console.log(condominiums)
    return condominiums;
}
async function createCondominium(userId, name, address, city) {
    const condominium = await condominiumRepository.createCondominium(userId, name, address, city);
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
async function updateCondominium(condominiumId, userId, name, address, city) {
    return condominiumRepository.updateCondominium(condominiumId, name, address, city);
}
async function deleteCondominium(condominiumId, userId) {
    const buildingCount = await condominiumRepository.countBuildingsByCondominium(condominiumId, userId);
    if (buildingCount > 0) {
        const error = new Error(`No se puede eliminar el condominio. Hay ${buildingCount} torre(s) fijada(s).`)
        error.status = 409;
        throw error;
    }
    return condominiumRepository.deleteCondominium(condominiumId, userId);
}
async function createBuilding(condominiumId, userId, name, floorCount) {
    return buildingRepository.createBuilding(condominiumId, userId, name, floorCount);
}
async function updateBuilding(buildingId, name, floorCount) {
    return buildingRepository.updateBuilding(buildingId, name, floorCount);
}
async function deleteBuilding(buildingId) {
    const unitCount = await buildingRepository.countUnitsByBuilding(buildingId);
    if (unitCount > 0) {
        const error = new Error(
            `No se puede eliminar la torre. Hay ${unitCount} unidad(es) fijadas.`
        );
        error.status = 409;
        throw error;
    }
    return buildingRepository.deleteBuilding(buildingId);
}
async function createZone(condominiumId, name) {
    return zoneRepository.createZone(condominiumId, name);
}
async function updateZone(zoneId, name) {
    return zoneRepository.updateZone(zoneId, name);
}
async function deleteZone(zoneId) {
    const deviceCount = await zoneRepository.countDevicesByZone(zoneId);
    if (deviceCount > 0) {
        const error = new Error(`No se puede eliminar la zona. Hay ${deviceCount} dispositivo(s) fijado(s).`)
        error.status = 409;
        throw error;
    }
    return zoneRepository.deleteZone(zoneId);
}

module.exports = {
    getCondominiumTree, createCondominium, updateCondominium, deleteCondominium,
    createBuilding, updateBuilding, deleteBuilding,
    createZone, updateZone, deleteZone,
}