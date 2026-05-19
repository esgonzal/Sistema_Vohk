const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

// ─── Variables de entorno requeridas ───────────────────────────
const TWILIO_ACCOUNT_SID = 'AC86e880f4e6093cf6ced05ad83b7164ea';
const TWILIO_AUTH_TOKEN = '9485c1566561a77ed656ed2232b2aa31';
const TWILIO_API_KEY = 'SK11f6b290e65f792ccb606ba5bb750475';
const TWILIO_API_SECRET = 'Mq4m2iTGhfIKvFsBrIOmFrSjp035t9dH';
const TWILIO_TWIML_APP_SID = 'AP0384ba4ebbac7acffb89db57c7f841d4';

const users = {
    'guard': { password: '1234', identity: '8001', },
    'resident101': { password: '1234', identity: '8101', },
    'resident102': { password: '1234', identity: '8102', },
};

router.post('/incoming', (req, res) => {
    console.log("incoming endpoint")
    const twiml = new twilio.twiml.VoiceResponse();
    const origen = req.body.From || '';
    const destino = req.body.To || '';
    console.log(req.body);
    // Incoming call FROM intercom SIP
    if (origen.startsWith('sip:')) {
        console.log(`📞 Llamada entrante desde: ${origen}`);
        // Extract apartment identity from:
        // sip:8101@vohk-porteria.sip.us1.twilio.com:5060
        const match = destino.match(/sip:(\d+)@/);
        const apartmentIdentity = match
            ? match[1]
            : '8001';
        console.log(`➡️ Enrutando llamada a cliente: ${apartmentIdentity}`);
        const dial = twiml.dial();
        dial.client(apartmentIdentity);
    }
    // Outgoing call FROM app TO intercom
    else {
        console.log(`📞 Llamada saliente hacia videoportero`);
        const dial = twiml.dial({ callerId: '+16186212365' });
        dial.sip('sip:vp-01-vohk@vohk-porteria.sip.us1.twilio.com;transport=tcp');
    }
    res.type('text/xml');
    res.send(twiml.toString());
});
router.post('/login', (req, res) => {
    console.log('login endpoint');
    const { username, password } = req.body;
    console.log('username:', username);
    if (!username || !password) { return res.status(400).json({ error: 'Missing username or password' }); }
    const user = users[username];
    if (!user) { return res.status(401).json({ error: 'User not found' }); }
    if (user.password !== password) { return res.status(401).json({ error: 'Invalid password' }); }
    console.log(`✅ Login success: ${username}`);
    res.json({ success: true, username: username, identity: user.identity, });
});
router.get('/token', (req, res) => {
    console.log("token endpoint")
    const accountSid = TWILIO_ACCOUNT_SID;
    const apiKey = TWILIO_API_KEY;
    const apiSecret = TWILIO_API_SECRET;
    const twimlAppSid = TWILIO_TWIML_APP_SID;
    const fcmToken = req.query.fcmToken;
    const identity = req.query.identity || '8001';
    console.log("FCM token:", fcmToken);
    console.log("Identity:", identity);
    // Validar que las variables estén configuradas
    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
        return res.status(500).json({
            error: 'Variables de entorno de Twilio no configuradas'
        });
    }
    const token = new AccessToken(accountSid, apiKey, apiSecret, { identity: identity, ttl: 3600 });
    const voiceGrant = new VoiceGrant({
        incomingAllow: true,               // puede recibir llamadas
        outgoingApplicationSid: twimlAppSid,
        pushCredentialSid: 'CRe04e9804aebdc00ea2a2bf7203b5069c',
    });
    token.addGrant(voiceGrant);
    res.json({ token: token.toJwt(), identity: identity });
});

module.exports = router;