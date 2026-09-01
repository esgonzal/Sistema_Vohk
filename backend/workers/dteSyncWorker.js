require('dotenv').config();
const cron = require('node-cron');
const {
    discoverNewDtes,
    refreshTrackedDtes,
} = require('../services/automation/dteSyncService');

function boardId() {
    const value = process.env.DTE_MONDAY_BOARD_ID;
    if (!value) throw new Error('DTE_MONDAY_BOARD_ID is required');
    return value;
}

async function runDiscovery() {
    const results = await discoverNewDtes(boardId());
    if (results.length) console.log('[DTE WORKER] Discovery:', JSON.stringify(results));
}

async function runRefresh() {
    const results = await refreshTrackedDtes();
    console.log(`[DTE WORKER] Refresh completed (${results.length} updates)`);
}

function report(label, operation) {
    operation().catch(error => console.error(`[DTE WORKER] ${label} failed:`, error.stack || error));
}

console.log('[DTE WORKER] Started');
setImmediate(() => report('Initial discovery', runDiscovery));
cron.schedule('*/5 * * * *', () => report('Discovery', runDiscovery));
cron.schedule('0 0,12 * * *', () => report('Refresh', runRefresh));

module.exports = { runDiscovery, runRefresh };
