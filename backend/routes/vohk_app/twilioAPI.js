const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const twilioService = require('../../services/vohk_app/twilioService');
const serviceAccount = require('../../firebase/firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

router.post('/incoming', async (req, res) => {
    try {
        console.log(`Incoming Twilio call ${req.body.CallSid}: ${req.body.From} -> ${req.body.To}`);
        const from = req.body.From || '';
        const to = req.body.To || '';
        const twiml = await twilioService.handleIncomingCall(from, to);
        res.type('text/xml').send(twiml);
    } catch (err) {
        console.error('❌ Incoming call error:', err.message);
        if (err.message === 'Invalid SIP destination') {
            return res.status(400).send(err.message);
        }
        res.status(500).send('Internal server error');
    }
});
router.post('/outgoing', async (req, res) => {
    try {
        console.log(`Outgoing Twilio call: ${req.body.From} -> ${req.body.To}`);
        const from = req.body.From || '';
        const to = req.body.To || '';
        const twiml = await twilioService.handleOutgoingCall(from, to);
        return res.type('text/xml').status(200).send(twiml);
    } catch (error) {
        console.error('❌ Outgoing call error:', error.message);
        if (error.message === 'Invalid client destination') {
            return res.status(400).send(error.message);
        }
        return res.status(500).send('Internal server error');
    }
});

router.post('/client-status', (req, res) => {
    const status = req.body.CallStatus;
    if (['failed', 'busy', 'no-answer'].includes(status)) {
        console.warn('Twilio Client call unsuccessful:', {
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