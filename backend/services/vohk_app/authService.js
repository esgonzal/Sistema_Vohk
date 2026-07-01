const twilio = require('twilio');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
    if (!user) {
        return { error: 'User not found', status: 401 };
    }
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
        return { error: 'Invalid password', status: 401 };
    }
    const tenant = await userRepository.findTenantIdByUserId(user.user_id);
    if (!tenant) {
        return { error: 'User is not assigned to any tenant.', status: 403 };
    }
    const session = { userId: user.user_id, tenantId: tenant.tenant_id, username: user.username, role: user.role, identity: user.sip_identity };
    const token = generateJwt(session);
    return {
        success: true,
        token,
        user: session
    }
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

async function registerFcmToken(userId, fcmToken) {
    const user = await userRepository.findById(userId);
    if (!user) {
        return { error: 'User not found', status: 404 };
    }
    await userRepository.updateFcmToken(userId, fcmToken);
    return { success: true };
}

function generateJwt(session) {
    return jwt.sign(
        {
            userId: session.userId,
            tenantId: session.tenantId,
            username: session.username,
            role: session.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    );
}

module.exports = { login, generateTwilioToken, registerFcmToken };