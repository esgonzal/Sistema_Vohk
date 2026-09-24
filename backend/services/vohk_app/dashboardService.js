const dashboardRepository = require('../../repositories/dashboardRepository');

async function getDashboard(userId, role) {
    const adminUserId = role === 'admin' ? userId : null;
    const staffUserId = role === 'staff' ? userId : null;
    const [summary, condominiums, deviceSummary, recentResidents, recentCondominiums] = await Promise.all([
        dashboardRepository.getSummary(adminUserId, staffUserId),
        dashboardRepository.getCondominiums(adminUserId, staffUserId),
        dashboardRepository.getDeviceSummary(adminUserId, staffUserId),
        dashboardRepository.getRecentResidents(adminUserId, staffUserId),
        dashboardRepository.getRecentCondominiums(adminUserId, staffUserId)
    ]);
    return { summary, condominiums, deviceSummary, recentResidents, recentCondominiums };
}

module.exports = { getDashboard };
