const twilio = require('twilio');

function webhookUrl(req) {
    const configuredBaseUrl = String(process.env.TWILIO_WEBHOOK_BASE_URL || '').replace(/\/$/, '');
    if (configuredBaseUrl) return `${configuredBaseUrl}${req.originalUrl}`;

    const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0].trim();
    const protocol = forwardedProto || req.protocol;
    return `${protocol}://${req.get('host')}${req.originalUrl}`;
}

function validateTwilioWebhook(req, res, next) {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
        console.error('TWILIO_AUTH_TOKEN is required to validate Twilio webhooks');
        return res.status(503).send('Webhook validation is not configured');
    }

    const signature = req.get('x-twilio-signature') || '';
    if (!signature || !twilio.validateRequest(authToken, signature, webhookUrl(req), req.body || {})) {
        return res.status(403).send('Invalid Twilio signature');
    }

    next();
}

module.exports = { validateTwilioWebhook, webhookUrl };
