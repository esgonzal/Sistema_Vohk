const twilio = require('twilio');
const admin = require('firebase-admin');
const userRepository = require('../../repositories/userRepository');
const intercomRepository = require('../../repositories/intercomRepository');
const userDeviceRepository = require('../../repositories/userDeviceRepository');
const activityRepository = require('../../repositories/activityRepository');
const condominiumRepository = require('../../repositories/condominiumRepository');
const intercomUserRepository = require('../../repositories/intercomUserRepository');
const OUTBOUND_CALLER_ID = process.env.TWILIO_CALLER_ID;
const OUTBOUND_SIP_URI = process.env.TWILIO_OUTBOUND_SIP_URI;
const STATUS_CALLBACK_URL = process.env.TWILIO_STATUS_CALLBACK_URL || 'https://api.vohk.cl/api/twilio/client-status';

function extractSipIdentity(sipAddress) {
    if (typeof sipAddress !== 'string') {
        return null;
    }
    const match = sipAddress.trim().match(/^sips?:([^@;>\s]+)@/i);
    return match?.[1]?.toLowerCase() || null;
}

async function handleIncomingCall(from, to, callSid = null) {
    const twiml = new twilio.twiml.VoiceResponse();
    if (/^sips?:/i.test(from)) {
        const destinationMatch = to.match(/^sips?:(\d+)@/i);
        if (!destinationMatch) {
            throw new Error('Invalid SIP destination');
        }
        const sipIdentity = extractSipIdentity(from);
        if (!sipIdentity) {
            throw new Error(`Invalid SIP caller address: ${from}`);
        }
        const apartmentIdentity = destinationMatch[1];
        const [resident, intercom] = await Promise.all([userRepository.findByIdentity(apartmentIdentity), intercomRepository.findIntercomBySipIdentity(sipIdentity),]);
        const callerName = intercom ? `${intercom.intercom_name} - ${intercom.condominium_name}` : 'Citófono';
        if (resident) {
            const devices = await userDeviceRepository.findActiveByUserId(resident.user_id);
            for (const device of devices) {
                try {
                    await admin.messaging().send({
                        token: device.fcm_token,
                        data: {
                            type: 'incoming_call',
                            call_type: 'intercom',
                            identity: apartmentIdentity,
                            caller_name: callerName,
                            device_id: String(intercom?.device_id ?? ''),
                            condominium_id: String(intercom?.condominium_id ?? ''),
                            intercom_name: intercom?.intercom_name ?? '',
                            condominium_name: intercom?.condominium_name ?? '',
                        }
                    });
                } catch (err) {
                    const errorCode = err?.errorInfo?.code ?? err?.code;
                    if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
                        console.log(`Deactivating invalid FCM device ${device.user_device_id}`);
                        await userDeviceRepository.deactivateDeviceById(device.user_device_id);
                        continue;
                    }
                    console.error(`Error sending FCM to device ${device.user_device_id}:`, err);
                }
            }
        }
        if (resident && intercom?.condominium_id) {
            await activityRepository.createActivity({
                condominiumId: intercom.condominium_id,
                deviceId: intercom.device_id,
                eventType: 'call',
                status: 'initiated',
                source: 'twilio',
                correlationId: callSid,
                participants: [{ userId: resident.user_id, role: 'recipient' }],
                metadata: { direction: 'intercom_to_user', from, to, callerName },
            }).catch(error => console.error('Could not record incoming call activity:', error));
        }
        const dial = twiml.dial({ answerOnBridge: true });
        const client = dial.client({ statusCallback: STATUS_CALLBACK_URL, statusCallbackMethod: 'POST', statusCallbackEvent: 'initiated ringing answered completed' });
        client.identity(apartmentIdentity);
        client.parameter({ name: 'call_type', value: 'intercom' });
        client.parameter({ name: 'caller_name', value: callerName });
        client.parameter({ name: '__TWI_CALLER_NAME', value: callerName });
        if (intercom?.intercom_id) {
            client.parameter({ name: 'intercom_id', value: String(intercom.intercom_id) });
        }
        if (intercom?.device_id) {
            client.parameter({ name: 'device_id', value: String(intercom.device_id) });
        }
        if (intercom?.intercom_name) {
            client.parameter({ name: 'intercom_name', value: intercom.intercom_name });
        }
        if (intercom?.condominium_id) {
            client.parameter({ name: 'condominium_id', value: String(intercom.condominium_id) });
        }
        if (intercom?.condominium_name) {
            client.parameter({ name: 'condominium_name', value: intercom.condominium_name });
        }
    } else {
        const dial = twiml.dial({ callerId: OUTBOUND_CALLER_ID });
        dial.sip(OUTBOUND_SIP_URI);
    }
    return twiml.toString();
}
async function handleOutgoingCall(from, to, callSid = null) {
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
        const callerIdentity = from.replace('client:', '');
        const caller = await userRepository.findByIdentity(callerIdentity);
        if (!caller) {
            const error = new Error('Caller not found');
            error.status = 403;
            throw error;
        }
        let allowed = caller.role === 'superadmin';
        if (caller.role === 'admin') {
            allowed = Boolean(await condominiumRepository.findByIdAndAdmin(intercom.condominium_id, caller.user_id));
        } else if (caller.role === 'resident') {
            allowed = Boolean(await intercomUserRepository.findIntercomUserByUserAndDevice(caller.user_id, deviceId));
        }
        if (!allowed) {
            const error = new Error('Caller does not have access to this intercom');
            error.status = 403;
            throw error;
        }
        await activityRepository.createActivity({
            condominiumId: intercom.condominium_id,
            deviceId,
            actorUserId: caller.user_id,
            eventType: 'call',
            status: 'initiated',
            source: 'twilio',
            correlationId: callSid,
            participants: [{ userId: caller.user_id, role: 'caller' }],
            metadata: { direction: 'user_to_intercom', from, to },
        }).catch(error => console.error('Could not record outgoing intercom call activity:', error));
        console.log(`Outgoing intercom call: ${from} -> ${intercom.sip_address}`);
        const dial = twiml.dial({ answerOnBridge: true });
        dial.sip({ statusCallback: STATUS_CALLBACK_URL, statusCallbackMethod: 'POST', statusCallbackEvent: 'initiated ringing answered completed' }, intercom.sip_address);
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
    const callCondominium = caller ? await userRepository.findCallCondominium(caller.user_id, resident.user_id) : null;
    if (!caller || !callCondominium) {
        const error = new Error('Caller cannot reach this resident');
        error.status = 403;
        throw error;
    }
    await activityRepository.createActivity({
        condominiumId: callCondominium.condominium_id,
        actorUserId: caller.user_id,
        eventType: 'call',
        status: 'initiated',
        source: 'twilio',
        correlationId: callSid,
        participants: [
            { userId: caller.user_id, role: 'caller' },
            { userId: resident.user_id, role: 'recipient' },
        ],
        metadata: { direction: 'user_to_user', from, to },
    }).catch(error => console.error('Could not record outgoing user call activity:', error));
    const dial = twiml.dial({ answerOnBridge: true });
    const client = dial.client({ statusCallback: STATUS_CALLBACK_URL, statusCallbackMethod: 'POST', statusCallbackEvent: 'initiated ringing answered completed' });
    client.identity(to);
    client.parameter({ name: 'call_type', value: 'admin' });
    client.parameter({ name: 'caller_identity', value: callerIdentity });
    client.parameter({ name: 'caller_name', value: caller?.legal_name || 'Administración' });
    return twiml.toString();
}

async function recordCallStatus(payload) {
    const status = payload.CallStatus;
    if (!status) return null;
    const context = await activityRepository.findCallContext([payload.ParentCallSid, payload.CallSid]);
    if (!context) {
        console.warn('Could not match Twilio status to a call activity:', payload.CallSid, payload.ParentCallSid);
        return null;
    }
    return activityRepository.createActivity({
        condominiumId: context.condominium_id,
        deviceId: context.device_id,
        actorUserId: context.actor_user_id,
        eventType: 'call',
        status,
        source: 'twilio',
        correlationId: context.correlation_id,
        occurredAt: payload.Timestamp || null,
        participants: context.participants,
        metadata: {
            direction: context.metadata?.direction,
            callSid: payload.CallSid,
            parentCallSid: payload.ParentCallSid || null,
            from: payload.From,
            to: payload.To,
            errorCode: payload.ErrorCode || null,
        },
    });
}

module.exports = { handleIncomingCall, handleOutgoingCall, recordCallStatus };
