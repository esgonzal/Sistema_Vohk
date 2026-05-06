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
    const twiml = new twilio.twiml.VoiceResponse();
    const dial = twiml.dial();

    // Identificar qué videoportero llamó (para mostrarlo en la UI)
    const origen = req.body.From || 'Desconocido';
    console.log(`📞 Llamada entrante desde: ${origen}`);

    // Conectar al cliente web registrado
    dial.client({
        identity: 'operador-vohk'
    });

    res.type('text/xml');
    res.send(twiml.toString());
});

// ─── GET /twilio/token ──────────────────────────────────────────
// El frontend llama aquí para obtener el token de acceso
// Necesario para que el navegador pueda recibir llamadas
router.get('/token', (req, res) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    // Validar que las variables estén configuradas
    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
        return res.status(500).json({
            error: 'Variables de entorno de Twilio no configuradas'
        });
    }

    const token = new AccessToken(accountSid, apiKey, apiSecret, {
        identity: 'operador-vohk',
        ttl: 3600 // token válido por 1 hora
    });

    const voiceGrant = new VoiceGrant({
        incomingAllow: true,               // puede recibir llamadas
        outgoingApplicationSid: twimlAppSid
    });

    token.addGrant(voiceGrant);

    res.json({
        token: token.toJwt(),
        identity: 'operador-vohk'
    });
});

module.exports = router;