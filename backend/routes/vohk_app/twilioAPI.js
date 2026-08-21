const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const twilio = require('twilio');
const twilioService = require('../../services/vohk_app/twilioService');
const serviceAccount = require('../../firebase/firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function validateTwilioWebhook(req, res, next) {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = req.get('X-Twilio-Signature');
    if (!authToken) {
        console.error('TWILIO_AUTH_TOKEN is required to validate Twilio webhooks');
        return res.status(503).send('Twilio webhook validation is not configured');
    }
    const baseUrl = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://api.vohk.cl';
    const requestUrl = new URL(req.originalUrl, baseUrl).toString();
    if (!signature || !twilio.validateRequest(authToken, signature, requestUrl, req.body)) {
        return res.status(403).send('Invalid Twilio signature');
    }
    return next();
}

router.post('/incoming', validateTwilioWebhook, async (req, res) => {
    try {
        console.log(`Incoming Twilio call ${req.body.CallSid}: ${req.body.From} -> ${req.body.To}`);
        const from = req.body.From || '';
        const to = req.body.To || '';
        const twiml = await twilioService.handleIncomingCall(from, to, req.body.CallSid || null);
        res.type('text/xml').send(twiml);
    } catch (err) {
        console.error('❌ Incoming call error:', err.message);
        if (err.message === 'Invalid SIP destination') {
            return res.status(400).send(err.message);
        }
        res.status(500).send('Internal server error');
    }
});
router.post('/outgoing', validateTwilioWebhook, async (req, res) => {
    try {
        console.log(`Outgoing Twilio call: ${req.body.From} -> ${req.body.To}`);
        const from = req.body.From || '';
        const to = req.body.To || '';
        const twiml = await twilioService.handleOutgoingCall(from, to, req.body.CallSid || null);
        return res.type('text/xml').status(200).send(twiml);
    } catch (error) {
        console.error('❌ Outgoing call error:', error.message);
        if (error.message === 'Invalid client destination') {
            return res.status(400).send(error.message);
        }
        if (error.status >= 400 && error.status < 500) {
            return res.status(error.status).send(error.message);
        }
        return res.status(500).send('Internal server error');
    }
});

router.post('/client-status', validateTwilioWebhook, async (req, res) => {
    const status = req.body.CallStatus;
    try {
        await twilioService.recordCallStatus(req.body);
    } catch (error) {
        console.error('Could not record Twilio call status:', error);
    }
    if (['busy', 'no-answer', 'canceled'].includes(status)) {
        console.log('Twilio Client call ended without connection:', {
            callSid: req.body.CallSid,
            parentCallSid: req.body.ParentCallSid,
            status,
            from: req.body.From,
            to: req.body.To,
        });
    } else if (status === 'failed') {
        console.error('Twilio Client call failed:', {
            callSid: req.body.CallSid,
            parentCallSid: req.body.ParentCallSid,
            status,
            from: req.body.From,
            to: req.body.To,
            errorCode: req.body.ErrorCode,
        });
    }
    res.sendStatus(204);
});

module.exports = router;
