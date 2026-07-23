const twilio = require('twilio');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const userRepository = require('../../repositories/userRepository');
const { SsmlBreak } = require('twilio/lib/twiml/VoiceResponse');
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
    const session = { userId: user.user_id, username: user.username, role: user.role, identity: user.sip_identity };
    const token = generateJwt(session);
    return { success: true, token, user: session, legalName: user.legal_name }
}

async function forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
        return;
    }
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await userRepository.savePasswordResetToken(user.user_id, tokenHash, expiresAt);
    const resetUrl = `https://app.vohk.cl/admin/reset-password/${token}`;
    console.log('====================================');
    console.log('PASSWORD RESET');
    console.log(user.email);
    console.log(resetUrl);
    console.log('====================================');
}

async function resetPassword(token, password) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await userRepository.findByPasswordResetToken(tokenHash);
    if (!user) {
        return { status: 400, error: 'Invalid or expired reset token.' };
    }
    if (!user.password_reset_expires_at || new Date(user.password_reset_expires_at) < new Date()) {
        return { status: 400, error: 'Reset token has expired.' };
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await userRepository.resetPassword(user.user_id, passwordHash);
    return { ok: true };
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
    console.log(user)
    if (!user) {
        return { error: 'User not found', status: 404 };
    }
    let response = await userRepository.updateFcmToken(userId, fcmToken);
    console.log(response)
    return { success: true };
}

function generateJwt(session) {
    return jwt.sign(
        { userId: session.userId, username: session.username, role: session.role, identity: session.identity },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

module.exports = { login, forgotPassword, resetPassword, generateTwilioToken, registerFcmToken };