const accessTokenStorage = {};
const storeAccessToken = (userId, accessToken) => {
    // Store user data with both accessToken and loginTime
    accessTokenStorage[userId] = {
        accessToken,
        loginTime: Date.now(), // Record the current time
    };
};

module.exports = { accessTokenStorage, storeAccessToken };