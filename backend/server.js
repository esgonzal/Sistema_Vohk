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
app.use(cors());

const UserRouter = require('../backend/routes/v1/userAPI');
app.use('/v1/user', UserRouter);
const LockRouter = require('../backend/routes/v1/lockAPI');
app.use('/v1/lock', LockRouter);
const EkeyRouter = require('../backend/routes/v1/ekeyAPI');
app.use('/v1/ekey', EkeyRouter);
const PasscodeRouter = require('../backend/routes/v1/passcodeAPI');
app.use('/v1/passcode', PasscodeRouter);
const GroupRouter = require('../backend/routes/v1/groupAPI');
app.use('/v1/group', GroupRouter);

// HTTP Configuration
const httpPort = 8080;
const httpServer = http.createServer(app);

httpServer.listen(httpPort, () => {
  console.log(`HTTP Server is running on port ${httpPort}`);
});





//Base de datos Tabla Usuarios
//const UserDB = require('./routes/database/UsersTable.js');
//app.use('/api/DB/usuarios', UserDB);
//Base de datos Tabla eKey
//const EkeyDB = require('./routes/database/eKeyTable.js');
//app.use('/api/DB/ekeys', EkeyDB);
//API de Usuario de TTLock
//const UserRouter = require('./routes/TTLockAPI/UserAPI.js');
//app.use('/api/vohk/user', UserRouter);
//API de eKeys de TTLock
//const ekeyRouter = require('./routes/TTLockAPI/ekeyAPI.js')
//app.use('/api/vohk/ekey', ekeyRouter);
//API de Passcodes de TTLock
//const passcodeRouter = require('./routes/TTLockAPI/passcodeAPI.js')
//app.use('/api/vohk/passcode', passcodeRouter);
//API de Cards de TTLock
//const cardRouter = require('./routes/TTLockAPI/cardAPI.js')
//app.use('/api/vohk/card', cardRouter);
//API de Fingerprints de TTLock
//const fingerprintRouter = require('./routes/TTLockAPI/fingerprintAPI.js')
//app.use('/api/vohk/fingerprint', fingerprintRouter);
//API de Records de TTLock
//const recordRouter = require('./routes/TTLockAPI/recordAPI.js')
//app.use('/api/vohk/record', recordRouter);
//API de Gateway de TTLock
//const gatewayRouter = require('./routes/TTLockAPI/gatewayAPI.js')
//app.use('/api/vohk/gateway', gatewayRouter);
//API de PassageMode de TTLock
//const passageModeRouter = require('./routes/TTLockAPI/passageModeAPI.js')
//app.use('/api/vohk/passageMode', passageModeRouter);
//API de Grupo de TTLock
//const groupRouter = require('./routes/TTLockAPI/groupAPI.js')
//app.use('/api/vohk/group', groupRouter);
//API de Lock de TTLock
//const lockRouter = require('./routes/TTLockAPI/lockAPI.js')
//app.use('/api/vohk/lock', lockRouter);

/*const { accessTokenStorage, storeAccessToken } = require('./accessTokenStorage');

//const logoutInterval = 30 * 60 * 1000; // 30 minutes

// A function to check and log out users with expired sessions
//const checkAndLogoutExpiredSessions = () => {
//  const currentTime = Date.now();
//  for (const userId in accessTokenStorage) {
//    const user = accessTokenStorage[userId];
//    if (user && user.loginTime && currentTime - user.loginTime >= logoutInterval) {
//      // The user's session has expired, log them out
      delete accessTokenStorage[userId];
      console.log(`Logged out user with ID: ${userId}`);
    }
  }
};

// Set up a periodic task to check and log out expired sessions
const logoutIntervalId = setInterval(checkAndLogoutExpiredSessions, logoutInterval);
*/
