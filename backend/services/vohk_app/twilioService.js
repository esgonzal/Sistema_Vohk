const twilio = require('twilio');
const admin = require('firebase-admin');
const userRepository = require('../../repositories/userRepository');
const intercomRepository = require('../../repositories/intercomRepository');
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
        console.log("apartmentIdentity: ", apartmentIdentity);
        console.log("resident: ", resident);
        console.log("intercom: ", intercom)
        if (resident?.fcm_token) {
            try {
                await admin.messaging().send({
                    token: resident.fcm_token,
                    data: {
                        type: 'incoming_call',
                        identity: apartmentIdentity,
                        intercom: JSON.stringify(intercom),
                    },
                });
            } catch (err) {
                console.error('Error sending FCM:', err);
            }
        } else {
            console.log('Resident or FCM token not found');
        }
        const dial = twiml.dial({ answerOnBridge: true });
        const client = dial.client();
        client.identity(apartmentIdentity);
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

module.exports = { handleIncomingCall };