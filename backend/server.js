const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();


// Middleware
app.use(bodyParser.json());
app.use(cors());


//Base de datos Tabla Usuarios
const UserDB = require('./routes/database/UsersTable.js');
app.use('/api/usuarios', UserDB);
//Base de datos Tabla eKey
const EkeyDB = require('./routes/database/eKeyTable.js');
app.use('/api/ekeys', EkeyDB);
//API de Usuario de TTLock
const UserRouter = require('./routes/TTLockAPI/UserAPI.js');
app.use('/api/ttlock/user', UserRouter);
//API de eKeys de TTLock
const ekeyRouter = require('./routes/TTLockAPI/ekeyAPI.js')
app.use('/api/ttlock/ekey', ekeyRouter);
//API de Passcodes de TTLock
const passcodeRouter = require('./routes/TTLockAPI/passcodeAPI.js')
app.use('/api/ttlock/passcode', passcodeRouter);
//API de Cards de TTLock
const cardRouter = require('./routes/TTLockAPI/cardAPI.js')
app.use('/api/ttlock/card', cardRouter);
//API de Fingerprints de TTLock
const fingerprintRouter = require('./routes/TTLockAPI/fingerprintAPI.js')
app.use('/api/ttlock/fingerprint', fingerprintRouter);
//API de Records de TTLock
const recordRouter = require('./routes/TTLockAPI/recordAPI.js')
app.use('/api/ttlock/record', recordRouter);
//API de Gateway de TTLock
const gatewayRouter = require('./routes/TTLockAPI/gatewayAPI.js')
app.use('/api/ttlock/gateway', gatewayRouter);
//API de PassageMode de TTLock
const passageModeRouter = require('./routes/TTLockAPI/passageModeAPI.js')
app.use('/api/ttlock/passageMode', passageModeRouter);
//API de Grupo de TTLock
const groupRouter = require('./routes/TTLockAPI/groupAPI.js')
app.use('/api/ttlock/group', groupRouter);
//API de Lock de TTLock
const lockRouter = require('./routes/TTLockAPI/lockAPI.js')
app.use('/api/ttlock/lock', lockRouter);


// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});