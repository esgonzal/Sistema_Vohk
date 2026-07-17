const dashboardRepository = require('../../repositories/dashboardRepository');

async function getDashboard(adminUserId) {
    const [summary, condominiums, deviceSummary, recentResidents, recentCondominiums] = await Promise.all([
        dashboardRepository.getSummary(adminUserId),
        dashboardRepository.getCondominiums(adminUserId),
        dashboardRepository.getDeviceSummary(adminUserId),
        dashboardRepository.getRecentResidents(adminUserId),
        dashboardRepository.getRecentCondominiums(adminUserId)
    ]);
    return { summary, condominiums, deviceSummary, recentResidents, recentCondominiums };
}

module.exports = { getDashboard };