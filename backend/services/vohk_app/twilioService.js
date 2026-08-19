const twilio = require('twilio');
const admin = require('firebase-admin');
const userRepository = require('../../repositories/userRepository');
const intercomRepository = require('../../repositories/intercomRepository');
const userDeviceRepository = require('../../repositories/userDeviceRepository');
const OUTBOUND_CALLER_ID = process.env.TWILIO_CALLER_ID;
const OUTBOUND_SIP_URI = process.env.TWILIO_OUTBOUND_SIP_URI;

async function handleIncomingCall(from, to) {
    const twiml = new twilio.twiml.VoiceResponse();
    if (from.startsWith('sip:')) {
        const match = to.match(/sip:(\d+)@/);
        if (!match) {
            throw new Error('Invalid SIP destination');
        }
        const apartmentIdentity = match[1];
        const [resident, intercom] = await Promise.all([
            userRepository.findByIdentity(apartmentIdentity),
            intercomRepository.findIntercomBySipAddress(from),
        ]);
        if (resident) {
            const devices = await userDeviceRepository.findActiveByUserId(resident.user_id);
            for (const device of devices) {
                try {
                    await admin.messaging().send({ token: device.fcm_token, data: { type: 'incoming_call', identity: apartmentIdentity, intercom: JSON.stringify(intercom) } });
                } catch (err) {
                    console.error(`Error sending FCM to device ${device.user_device_id}:`, err);
                }
            }
        }
        const dial = twiml.dial({ answerOnBridge: true });
        //const client = dial.client();
        const client = dial.client({ statusCallback: 'https://api.vohk.cl/api/twilio/client-status', statusCallbackMethod: 'POST', statusCallbackEvent: 'initiated ringing answered completed' });
        client.identity(apartmentIdentity);
        client.parameter({ name: 'call_type', value: 'intercom' });
        if (intercom?.intercom_id) {
            client.parameter({ name: 'intercom_id', value: intercom.intercom_id, });
        }
        if (intercom?.device_id) {
            client.parameter({ name: 'device_id', value: intercom.device_id, });
        }
    } else {
        const dial = twiml.dial({ callerId: OUTBOUND_CALLER_ID });
        dial.sip(OUTBOUND_SIP_URI);
    }
    return twiml.toString();
}
async function handleOutgoingCall(from, to) {
    const twiml = new twilio.twiml.VoiceResponse();
    if (!from.startsWith('client:') || !to) {
        throw new Error('Invalid client destination');
    }
    // APP -> INTERCOM
    if (to.startsWith('intercom:')) {
        const deviceId = to.substring('intercom:'.length);
        if (!deviceId) {
            throw new Error('Invalid intercom destination');
        }
        const intercom = await intercomRepository.findIntercomByDeviceId(deviceId);
        if (!intercom || !intercom.sip_address) {
            const error = new Error('Intercom not found');
            error.status = 404;
            throw error;
        }
        console.log(`Outgoing intercom call: ${from} -> ${intercom.sip_address}`);
        const dial = twiml.dial({ answerOnBridge: true });
        dial.sip(intercom.sip_address);
        return twiml.toString();
    }
    // APP -> APP / RESIDENT
    const resident = await userRepository.findByIdentity(to);
    if (!resident) {
        const error = new Error('Resident not found');
        error.status = 404;
        throw error;
    }
    const callerIdentity = from.replace('client:', '');
    const caller = await userRepository.findByIdentity(callerIdentity);
    const dial = twiml.dial({ answerOnBridge: true });
    const client = dial.client();
    client.identity(to);
    client.parameter({ name: 'call_type', value: 'admin' });
    client.parameter({ name: 'caller_identity', value: callerIdentity });
    client.parameter({ name: 'caller_name', value: caller?.legal_name || 'Administración' });
    return twiml.toString();
}

module.exports = { handleIncomingCall, handleOutgoingCall };