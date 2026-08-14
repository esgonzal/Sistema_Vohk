const twilio = require('twilio');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const userRepository = require('../../repositories/userRepository');
const emailService = require('../vohk_app/emailService');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID;
const TWILIO_ANDROID_PUSH_CRED_SID = process.env.TWILIO_ANDROID_PUSH_CRED_SID;
const TWILIO_IOS_PUSH_CRED_SANDBOX_SID = process.env.TWILIO_IOS_PUSH_CRED_SANDBOX_SID;
const TWILIO_IOS_PUSH_CRED_PRODUCTION_SID = process.env.TWILIO_IOS_PUSH_CRED_PRODUCTION_SID;

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
    return { success: true, token, user: session, legalName: user.legal_name, email: user.email };
}
async function forgotPassword(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
        return;
    }
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await userRepository.savePasswordResetToken(user.user_id, tokenHash, expiresAt);
    const resetUrl = `https://app.vohk.cl/admin/reset-password/${token}`;
    try {
        await emailService.sendPasswordResetEmail({ toEmail: user.email, legalName: user.legal_name, resetUrl });
    } catch (error) {
        console.error(`Could not send password reset email to ${user.email}:`, error.message);
    }
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
function resolveTwilioPushCredential(platform, environment) {
    if (platform === 'android') {
        if (!TWILIO_ANDROID_PUSH_CRED_SID) {
            throw new Error('TWILIO_ANDROID_PUSH_CRED_SID is not configured');
        }
        return TWILIO_ANDROID_PUSH_CRED_SID;
    }
    if (platform === 'ios') {
        if (environment === 'sandbox') {
            if (!TWILIO_IOS_PUSH_CRED_SANDBOX_SID) {
                throw new Error('TWILIO_IOS_PUSH_CRED_SANDBOX_SID is not configured');
            }
            return TWILIO_IOS_PUSH_CRED_SANDBOX_SID;
        }
        if (environment === 'production') {
            if (!TWILIO_IOS_PUSH_CRED_PRODUCTION_SID) {
                throw new Error('TWILIO_IOS_PUSH_CRED_PRODUCTION_SID is not configured');
            }
            return TWILIO_IOS_PUSH_CRED_PRODUCTION_SID;
        }
        throw new Error(`Unsupported iOS environment: ${environment}`);
    }
    throw new Error(`Unsupported platform: ${platform}`);
}
function generateTwilioToken(identity, platform, environment) {
    if (!TWILIO_ACCOUNT_SID) throw new Error('TWILIO_ACCOUNT_SID is not configured');
    if (!TWILIO_API_KEY) throw new Error('TWILIO_API_KEY is not configured');
    if (!TWILIO_API_SECRET) throw new Error('TWILIO_API_SECRET is not configured');
    if (!TWILIO_TWIML_APP_SID) throw new Error('TWILIO_TWIML_APP_SID is not configured');
    if (!identity) throw new Error('Twilio identity is required');
    let pushCredentialSid;
    if (platform === 'android' || platform === 'ios') {
        pushCredentialSid = resolveTwilioPushCredential(platform, environment);
    }
    console.log('Resolved Twilio push credential:', { identity, platform, environment, pushCredentialSid });
    const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, { identity, ttl: 3600 });
    const grantOptions = { outgoingApplicationSid: TWILIO_TWIML_APP_SID, incomingAllow: true };
    if (pushCredentialSid) {
        grantOptions.pushCredentialSid = pushCredentialSid;
    }
    const voiceGrant = new VoiceGrant(grantOptions);
    token.addGrant(voiceGrant);
    return token.toJwt();
}
async function registerFcmToken(userId, fcmToken) {
    const updatedUser = await userRepository.updateFcmToken(userId, fcmToken);
    if (!updatedUser) {
        return { error: 'User not found', status: 404 };
    }
    return { success: true, identity: updatedUser.sip_identity };
}
async function unregisterFcmToken(userId, fcmToken) {
    await userRepository.clearFcmToken(userId, fcmToken);
    return { success: true };
}
function generateJwt(session) {
    return jwt.sign(
        { userId: session.userId, username: session.username, role: session.role, identity: session.identity },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

module.exports = { login, forgotPassword, resetPassword, generateTwilioToken, registerFcmToken, unregisterFcmToken };