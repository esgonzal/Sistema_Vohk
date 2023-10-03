const accessTokenStorage = {};
const storeAccessToken = (userId, accessToken) => {
    accessTokenStorage[userId] = accessToken;
};

module.exports = { accessTokenStorage, storeAccessToken };
