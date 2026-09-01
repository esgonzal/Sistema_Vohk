const express = require('express');
const {
    getMondayItem,
    parseItemName,
    synchronizeDte,
} = require('../../services/automation/dteSyncService');

const router = express.Router();

function acknowledgeMonday(req, res) {
    if (req.body?.challenge) {
        res.status(200).send({ challenge: req.body.challenge });
        return true;
    }
    res.status(200).send('ok');
    return false;
}

async function synchronizeMondayItem(event, { force = false } = {}) {
    if (!event?.pulseId || !event?.boardId) return;
    const item = await getMondayItem(event.pulseId);
    if (!item) throw new Error(`Monday item ${event.pulseId} was not found`);
    const parsed = parseItemName(item.name);
    if (!parsed) throw new Error(`Unsupported DTE item name: ${item.name}`);
    const result = await synchronizeDte({
        boardId: event.boardId,
        itemId: event.pulseId,
        typeDocument: parsed.typeDocument,
        folio: parsed.folio,
        force,
    });
    if (result.status === 'duplicate') {
        console.warn(`[DTE WEBHOOK] ${parsed.typeDocument}-${parsed.folio} is already linked to item ${result.itemId}`);
    }
}

router.post('/consult', async (req, res) => {
    if (acknowledgeMonday(req, res)) return;
    try {
        if (req.body?.event?.type !== 'create_pulse') return;
        await synchronizeMondayItem(req.body.event);
    } catch (error) {
        console.error('[DTE WEBHOOK] Create item failed:', error.response?.data || error.message);
    }
});

router.post('/update', async (req, res) => {
    if (acknowledgeMonday(req, res)) return;
    try {
        await synchronizeMondayItem(req.body?.event, { force: true });
    } catch (error) {
        console.error('[DTE WEBHOOK] Update item failed:', error.response?.data || error.message);
    }
});

module.exports = router;
