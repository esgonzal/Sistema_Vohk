const axios = require('axios');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_CLIENT_SECRET = '33b556bdb803763f2e647fc7a357dedf';

async function login(username, password) {
    try {
        console.log(username,password)
        const response = await axios.post('https://euapi.ttlock.com/oauth2/token',
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, clientSecret: TTLOCK_CLIENT_SECRET, username, password }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded', }, }
        );
        console.log(response.data)
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