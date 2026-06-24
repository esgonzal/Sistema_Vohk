const twilio = require('twilio');
const admin = require('firebase-admin');
const userRepository = require('../../repositories/userRepository');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID;
const TWILIO_PUSH_CRED_SID = process.env.TWILIO_PUSH_CRED_SID;

async function login(username, password) {
    const user = await userRepository.findByUsername(username);
    if (!user) { return { error: 'User not found', status: 401 }; }
    if (user.password_hash !== password) { return { error: 'Invalid password', status: 401 }; }
    const primaryUnit = await userRepository.fetchPrimaryUnit(user.user_id);
    return {
        success: true,
        username: user.username,
        identity: user.identity,
        role: user.role,
        userId: user.user_id,
        primaryUnitId: primaryUnit?.unit_id ?? null,
    };
}

function generateTwilioToken(identity) {
    const token = new AccessToken(
        TWILIO_ACCOUNT_SID,
        TWILIO_API_KEY,
        TWILIO_API_SECRET,
        { identity, ttl: 3600 }
    );
    const voiceGrant = new VoiceGrant({
        incomingAllow: true,
        outgoingApplicationSid: TWILIO_TWIML_APP_SID,
        pushCredentialSid: TWILIO_PUSH_CRED_SID,
    });
    token.addGrant(voiceGrant);
    return token.toJwt();
}

async function registerFcmToken(identity, fcmToken) {
    const user = await userRepository.findByIdentity(identity);
    if (!user) { return { error: 'User identity not found', status: 404 }; }
    await userRepository.updateFcmToken(identity, fcmToken);
    return { success: true };
}

module.exports = { login, generateTwilioToken, registerFcmToken };