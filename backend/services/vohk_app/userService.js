const userRepository = require('../../repositories/userRepository');
const unitRepository = require('../../repositories/unitRepository')
const condominiumRepository = require('../../repositories/condominiumRepository')
const deviceRepository = require('../../repositories/deviceRepository')
const intercomUserRepository = require('../../repositories/intercomUserRepository')
const deviceService = require('../../services/vohk_app/deviceService')

async function getUsersByCondominium(adminUserId, condominiumId) {
    const condominium = await condominiumRepository.findByIdAndAdmin(condominiumId, adminUserId);
    if (!condominium) {
        throw new Error('Condominium not found or access denied');
    }
    return await userRepository.getUsersByCondominium(condominiumId);
}
async function createResident(unitId, adminUserId, { legalName, rut, email, isPrimary }) {
    const unit = await unitRepository.findUnitByIdAndAdmin(unitId, adminUserId);
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

module.exports = { getUsersByCondominium, createResident };