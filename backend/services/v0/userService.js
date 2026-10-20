const axios = require('axios');
const TTLOCK_CLIENT_ID = process.env.TTLOCK_CLIENT_ID;
const TTLOCK_CLIENT_SECRET = process.env.TTLOCK_CLIENT_SECRET;

async function login(username, password) {
    try {
        const response = await axios.post('https://euapi.ttlock.com/oauth2/token',
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, clientSecret: TTLOCK_CLIENT_SECRET, username, password }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded', }, }
        );
        return response.data;
    } catch (error) {
        if (error.response) {
            const err = new Error('TTLock error');
            err.ttlockResponse = error.response.data;
            throw err;
        }
        throw error;
    }
}
module.exports = { login };
