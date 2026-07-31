const condominiumRepository = require('../../repositories/condominiumRepository');
const unitRepository = require('../../repositories/unitRepository');

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
            unit = { unit_id: row.unit_id, name: row.name, room_no: row.room_no, floor: row.floor, residents: [] };
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
async function createUnit(buildingId, userId, name, roomNo, floor) {
    return unitRepository.createUnit(buildingId, name, roomNo, floor);
}
async function updateUnit(unitId, userId, name, roomNo, floor) {
    return unitRepository.updateUnit(unitId, name, roomNo, floor);
}
async function deleteUnit(unitId, userId) {
    const residentCount = await unitRepository.countResidentsByUnit(unitId);
    if (residentCount > 0) {
        const error = new Error(
            `No se puede eliminar la unidad. Hay ${residentCount} residente(s) asignado(s).`
        );
        error.status = 409;
        throw error;
    }
    return unitRepository.deleteUnit(unitId);
}

module.exports = { getUnitTree, createUnit, updateUnit, deleteUnit }