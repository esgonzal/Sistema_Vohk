const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const corsOptions = {
    origin: ['https://www.vohkapp.com', 'https://vohkapp.com', /^http:\/\/localhost:\d+$/],
};
app.use(cors(corsOptions));

// API v0
const { accessTokenStorage, storeAccessToken } = require('../backend/routes/v0/accessTokenStorage.js');
const logoutInterval = 30 * 60 * 1000; // 30 minutes
const checkAndLogoutExpiredSessions = () => {
    const currentTime = Date.now();
    for (const userId in accessTokenStorage) {
        const user = accessTokenStorage[userId];
        if (user && user.loginTime && currentTime - user.loginTime >= logoutInterval) {
            delete accessTokenStorage[userId];
            console.log(`Logged out user with ID: ${userId}`);
        }
    }
};
const logoutIntervalId = setInterval(checkAndLogoutExpiredSessions, logoutInterval);
//Base de datos Tabla Usuarios
const UserDB = require('./routes/database/UsersTable.js');
app.use('/DB/usuarios', UserDB);
//Base de datos Tabla eKey
const EkeyDB = require('./routes/database/eKeyTable.js');
app.use('/DB/ekeys', EkeyDB);
//API de Usuario de TTLock
const UserRouterV0 = require('../backend/routes/v0/UserAPI.js');
app.use('/v0/user', UserRouterV0);
//API de eKeys de TTLock
const ekeyRouterV0 = require('../backend/routes/v0/ekeyAPI.js')
app.use('/v0/ekey', ekeyRouterV0);
//API de Passcodes de TTLock
const passcodeRouterV0 = require('../backend/routes/v0/passcodeAPI.js')
app.use('/v0/passcode', passcodeRouterV0);
//API de Cards de TTLock
const cardRouterV0 = require('../backend/routes/v0/cardAPI.js')
app.use('/v0/card', cardRouterV0);
//API de Fingerprints de TTLock
const fingerprintRouterV0 = require('../backend/routes/v0/fingerprintAPI.js')
app.use('/v0/fingerprint', fingerprintRouterV0);
//API de Records de TTLock
const recordRouterV0 = require('../backend/routes/v0/recordAPI.js')
app.use('/v0/record', recordRouterV0);
//API de Gateway de TTLock
const gatewayRouterV0 = require('../backend/routes/v0/gatewayAPI.js')
app.use('/v0/gateway', gatewayRouterV0);
//API de Grupo de TTLock
const groupRouterV0 = require('../backend/routes/v0/groupAPI.js')
app.use('/v0/group', groupRouterV0);
//API de Lock de TTLock
const lockRouterV0 = require('../backend/routes/v0/lockAPI.js')
app.use('/v0/lock', lockRouterV0);

// API v1
const UserRouter = require('../backend/routes/v1/userAPI');
app.use('/v1/user', UserRouter);
const LockRouter = require('../backend/routes/v1/lockAPI');
app.use('/v1/lock', LockRouter);
const EkeyRouter = require('../backend/routes/v1/ekeyAPI');
app.use('/v1/ekey', EkeyRouter);
const PasscodeRouter = require('../backend/routes/v1/passcodeAPI');
app.use('/v1/passcode', PasscodeRouter);
const RecordRouter = require('../backend/routes/v1/recordAPI.js');
app.use('v1/lockRecord', RecordRouter);
const GroupRouter = require('../backend/routes/v1/groupAPI');
app.use('/v1/group', GroupRouter);

//Email
const emailRouter = require('../backend/routes/nodemailer/emailRoutes.js');
app.use('/mail', emailRouter);

// HTTP Configuration
const httpPort = 8080;
const httpServer = http.createServer(app);

httpServer.listen(httpPort, () => {
    console.log(`HTTP Server is running on port ${httpPort}`);
});