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

// ─── POST /twilio/incoming ──────────────────────────────────────
// Twilio llama aquí cuando el videoportero llama al SIP Domain
// Conecta la llamada al operador web registrado como 'operador-vohk'
router.post('/incoming', (req, res) => {
    console.log("incoming endpoint")
    const twiml = new twilio.twiml.VoiceResponse();
    const origen = req.body.From || '';
    //const dial = twiml.dial();
    console.log(req.body);
    // Llamada entrante desde el videoportero SIP → enrutar al cliente web
    if (origen.startsWith('sip:')) {
        console.log(`📞 Llamada entrante desde: ${origen}`);
        const dial = twiml.dial();
        dial.client('8001');
    }
    // Llamada saliente desde el cliente web → enrutar al videoportero SIP
    else {
        console.log(`📞 Llamada saliente hacia: sip:vp-01-vohk@201.186.166.84:5060`);
        const dial = twiml.dial({ callerId: '+16186212365' });
        dial.sip('sip:vp-01-vohk@vohk-porteria.sip.us1.twilio.com;transport=tcp');
    }
    res.type('text/xml');
    res.send(twiml.toString());
});
router.get('/testcall', async (req, res) => {
    console.log("testcall endpoint")
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    try {
        const call = await client.calls.create({
            from: '+16186212365',
            to: 'sip:vp-01-vohk@vohk-porteria.sip.us1.twilio.com',
            url: 'https://demo.twilio.com/docs/voice.xml'
        });

        res.json(call);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// ─── GET /twilio/token ──────────────────────────────────────────
// El frontend llama aquí para obtener el token de acceso
// Necesario para que el navegador pueda recibir llamadas
router.get('/token', (req, res) => {
    console.log("token endpoint")
    const accountSid = TWILIO_ACCOUNT_SID;
    const apiKey = TWILIO_API_KEY;
    const apiSecret = TWILIO_API_SECRET;
    const twimlAppSid = TWILIO_TWIML_APP_SID;
    const fcmToken = req.query.fcmToken; 
    console.log("El token fcm: ", fcmToken);
    // Validar que las variables estén configuradas
    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
        return res.status(500).json({
            error: 'Variables de entorno de Twilio no configuradas'
        });
    }

    const token = new AccessToken(accountSid, apiKey, apiSecret, {
        identity: '8001',
        ttl: 3600 // token válido por 1 hora
    });

    const voiceGrant = new VoiceGrant({
        incomingAllow: true,               // puede recibir llamadas
        outgoingApplicationSid: twimlAppSid,
        pushCredentialSid: 'CRe04e9804aebdc00ea2a2bf7203b5069c', 
    });

    token.addGrant(voiceGrant);

    res.json({
        token: token.toJwt(),
        identity: '8001'
    });
});

module.exports = router;