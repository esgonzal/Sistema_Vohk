const unitRepository = require('../../repositories/unitRepository');
const userRepository = require('../../repositories/userRepository');

async function getResidentUnits(userId) {
    return unitRepository.findResidentUnits(userId);
}
async function assignResidentToUnit(userId, unitId, isPrimary, tenantId) {
    return userRepository.assignResidentToUnit(userId, unitId, isPrimary, tenantId);
}

module.exports = { getResidentUnits, assignResidentToUnit };