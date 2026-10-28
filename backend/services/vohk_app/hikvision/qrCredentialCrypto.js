const crypto = require('node:crypto');

function fail(message) {
    const error = new Error(message);
    error.status = 500;
    return error;
}

function credentialKey() {
    const secret = process.env.QR_CREDENTIAL_SECRET || process.env.JWT_SECRET;
    if (!secret) throw fail('QR credential storage is not configured');
    return crypto.createHash('sha256').update(secret).digest();
}

function encryptCredential(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', credentialKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

function decryptCredential(value) {
    const [version, iv, tag, encrypted] = String(value || '').split('.');
    if (version !== 'v1' || !iv || !tag || !encrypted) throw fail('Stored QR credential is invalid');
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', credentialKey(), Buffer.from(iv, 'base64url'));
        decipher.setAuthTag(Buffer.from(tag, 'base64url'));
        return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
    } catch {
        throw fail('Stored QR credential could not be decrypted');
    }
}

function deviceEncryptionMaterial() {
    const secret = process.env.HIKVISION_QR_SHARED_SECRET || process.env.QR_CREDENTIAL_SECRET || process.env.JWT_SECRET;
    if (!secret) throw fail('QR device encryption is not configured');
    const material = crypto.createHash('sha256').update(`vohk-hikvision-qr-v1:${secret}`).digest('hex');
    return { key: material.slice(0, 32), vector: material.slice(32, 64) };
}

module.exports = { encryptCredential, decryptCredential, deviceEncryptionMaterial };
