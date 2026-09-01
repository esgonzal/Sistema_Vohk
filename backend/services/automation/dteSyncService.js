const axios = require('axios');
const repository = require('../../repositories/dteSyncRepository');

const MONDAY_API_URL = 'https://api.monday.com/v2';
const DTE_TYPE_CONFIG = {
    33: { prefix: 'FE', label: 'Factura' },
    39: { prefix: 'BE', label: 'Boleta' },
    1001: { prefix: 'NV', label: 'Nota de Venta' },
};
const MONDAY_COLUMNS = {
    issueDate: 'date',
    status: 'color_mkyryrxb',
    amount: 'numeric_mkyr63qj',
    documentType: 'color_mkyr7e09',
    seller: 'dropdown_mkyrk2t1',
    dueDate: 'date_mkyvc0pp',
    xml: 'link_mm0ekked',
};

function requiredEnvironment() {
    const values = {
        mondayToken: process.env.MONDAY_API_TOKEN,
        relbaseUser: process.env.RELBASE_API_USER,
        relbaseCompany: process.env.RELBASE_API_COMPANY,
    };
    const environmentNames = {
        mondayToken: 'MONDAY_API_TOKEN',
        relbaseUser: 'RELBASE_API_USER',
        relbaseCompany: 'RELBASE_API_COMPANY',
    };
    const missing = Object.entries(values)
        .filter(([, value]) => !value)
        .map(([key]) => environmentNames[key]);
    if (missing.length) throw new Error(`Missing DTE automation environment: ${missing.join(', ')}`);
    return values;
}

async function mondayGraphql(query, variables) {
    const { mondayToken } = requiredEnvironment();
    const response = await axios.post(
        MONDAY_API_URL,
        { query, variables },
        {
            timeout: 30_000,
            headers: { Authorization: mondayToken, 'Content-Type': 'application/json' },
        },
    );
    if (response.data?.errors?.length) {
        throw new Error(`Monday GraphQL: ${response.data.errors.map(error => error.message).join('; ')}`);
    }
    return response.data?.data;
}

async function createMondayItem({ boardId, itemName }) {
    const data = await mondayGraphql(`
        mutation CreateItem($boardId: ID!, $itemName: String!) {
            create_item(board_id: $boardId, item_name: $itemName) { id }
        }
    `, { boardId: String(boardId), itemName });
    return data?.create_item || null;
}

async function getMondayItem(itemId) {
    const data = await mondayGraphql(`
        query GetItem($itemIds: [ID!]!) {
            items(ids: $itemIds) {
                id
                name
                column_values { id text value column { title } }
            }
        }
    `, { itemIds: [String(itemId)] });
    return data?.items?.[0] || null;
}

async function getRelbaseDte(typeDocument, folio) {
    const { relbaseUser, relbaseCompany } = requiredEnvironment();
    let page = 1;
    let totalPages = 1;
    try {
        while (page <= totalPages) {
            const response = await axios.get('https://api.relbase.cl/api/v1/dtes', {
                timeout: 30_000,
                params: { type_document: typeDocument, query: folio, page },
                headers: {
                    accept: 'application/json',
                    Authorization: relbaseUser,
                    Company: relbaseCompany,
                },
            });
            totalPages = response.data?.meta?.total_pages ?? 1;
            const matches = (response.data?.data?.dtes || []).filter(dte =>
                Number(dte.folio) === Number(folio)
                && Number(dte.type_document) === Number(typeDocument));
            matches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            if (matches.length) return matches[0];
            page += 1;
        }
        return null;
    } catch (error) {
        console.error(`[DTE SYNC] Relbase lookup failed for ${typeDocument}-${folio}:`,
            error.response?.data || error.message);
        return null;
    }
}

async function getRelbaseSeller(sellerId) {
    if (!sellerId) return null;
    const { relbaseUser, relbaseCompany } = requiredEnvironment();
    try {
        const response = await axios.get(`https://api.relbase.cl/api/v1/vendedores/${sellerId}`, {
            timeout: 30_000,
            headers: {
                accept: 'application/json',
                Authorization: relbaseUser,
                Company: relbaseCompany,
            },
        });
        return response.data?.data || null;
    } catch (error) {
        console.error('[DTE SYNC] Relbase seller lookup failed:', error.response?.data || error.message);
        return null;
    }
}

function mapDteStatus(dte, now = new Date()) {
    const endDate = new Date(dte.end_date);
    if (dte.status === 'paid' || dte.status === 'accepted') return 'Pagado';
    if (dte.status === 'partial' || dte.status === 'installment') return 'Abono';
    if (dte.status === 'cancel' || dte.status === 'canceled') return 'Anulada';
    if (dte.status === 'invoiced') return 'Facturada';
    if (dte.status === 'rejected') return 'Rechazada';
    if (!dte.status || dte.status === 'pending') return now > endDate ? 'Vencido' : 'Pendiente';
    return 'No Aplica';
}

function mapDocumentType(dte) {
    return DTE_TYPE_CONFIG[Number(dte.type_document)]?.label || 'Otro';
}

function formatSellerName(seller) {
    if (!seller) return null;
    return [seller.first_name, seller.last_name]
        .filter(value => typeof value === 'string' && value.trim())
        .map(value => value.trim())
        .join(' ') || null;
}

async function updateMondayItem({ boardId, itemId, dte }) {
    const sellerName = formatSellerName(await getRelbaseSeller(dte.seller_id));
    const columnValues = {
        [MONDAY_COLUMNS.issueDate]: dte.start_date ? { date: dte.start_date } : null,
        [MONDAY_COLUMNS.status]: { label: mapDteStatus(dte) },
        [MONDAY_COLUMNS.amount]: Number(dte.real_amount_total),
        [MONDAY_COLUMNS.documentType]: { label: mapDocumentType(dte) },
        [MONDAY_COLUMNS.seller]: sellerName ? { labels: [sellerName] } : null,
        [MONDAY_COLUMNS.dueDate]: dte.end_date ? { date: dte.end_date } : null,
    };
    for (const key of Object.keys(columnValues)) {
        if (columnValues[key] === null || Number.isNaN(columnValues[key])) delete columnValues[key];
    }
    await mondayGraphql(`
        mutation UpdateDte($boardId: ID!, $itemId: ID!, $values: JSON!) {
            change_multiple_column_values(
                board_id: $boardId,
                item_id: $itemId,
                column_values: $values
            ) { id }
        }
    `, {
        boardId: String(boardId),
        itemId: String(itemId),
        values: JSON.stringify(columnValues),
    });
    if (Number(dte.type_document) === 33 && dte.xml_inter_file?.url) {
        await mondayGraphql(`
            mutation UpdateXml($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
                change_column_value(
                    board_id: $boardId,
                    item_id: $itemId,
                    column_id: $columnId,
                    value: $value
                ) { id }
            }
        `, {
            boardId: String(boardId),
            itemId: String(itemId),
            columnId: MONDAY_COLUMNS.xml,
            value: JSON.stringify({ url: dte.xml_inter_file.url, text: 'XML' }),
        });
    }
}

function parseItemName(name) {
    const match = String(name || '').trim().match(/^(FE|BE|NV)\s*(\d+)$/i);
    if (!match) return null;
    const config = Object.entries(DTE_TYPE_CONFIG)
        .find(([, value]) => value.prefix === match[1].toUpperCase());
    if (!config) return null;
    return {
        prefix: config[1].prefix,
        typeDocument: Number(config[0]),
        folio: Number(match[2]),
    };
}

async function synchronizeDte({ boardId, itemId = null, typeDocument, folio, dte = null, force = false }) {
    const lock = await repository.withAdvisoryLock(`dte:${typeDocument}:${folio}`, async () => {
        const existing = await repository.findItem(typeDocument, folio);
        if (existing?.monday_item_id && itemId
            && String(existing.monday_item_id) !== String(itemId)) {
            return { status: 'duplicate', itemId: existing.monday_item_id };
        }
        if (existing?.sync_status === 'synced' && !force) {
            return { status: 'already-synced', itemId: existing.monday_item_id };
        }
        const relbaseDte = dte || await getRelbaseDte(typeDocument, folio);
        if (!relbaseDte || Number(relbaseDte.folio) !== Number(folio)) {
            return { status: 'not-found' };
        }
        await repository.savePending({
            typeDocument,
            folio,
            boardId,
            mondayItemId: itemId,
            dte: relbaseDte,
        });
        let resolvedItemId = itemId || existing?.monday_item_id;
        try {
            if (!resolvedItemId) {
                const config = DTE_TYPE_CONFIG[typeDocument];
                const created = await createMondayItem({
                    boardId,
                    itemName: `${config.prefix} ${folio}`,
                });
                resolvedItemId = created?.id;
                if (!resolvedItemId) throw new Error('Monday did not return a created item ID');
            }
            const assigned = await repository.setMondayItem(typeDocument, folio, resolvedItemId);
            if (!assigned) throw new Error('DTE is already linked to a different Monday item');
            await updateMondayItem({ boardId, itemId: resolvedItemId, dte: relbaseDte });
            await repository.markSynced(typeDocument, folio, relbaseDte);
            return { status: 'synced', itemId: resolvedItemId };
        } catch (error) {
            await repository.markFailed(typeDocument, folio, error);
            throw error;
        }
    });
    return lock.acquired ? lock.value : { status: 'busy' };
}

async function discoverNewDtes(boardId) {
    const globalLock = await repository.withAdvisoryLock('dte:discovery', async () => {
        const maximum = Math.max(1, Number(process.env.DTE_DISCOVERY_MAX_PER_TYPE) || 100);
        const results = [];
        for (const [typeText, config] of Object.entries(DTE_TYPE_CONFIG)) {
            const typeDocument = Number(typeText);
            let folio = await repository.getCursor(typeDocument) + 1;
            for (let count = 0; count < maximum; count += 1) {
                const dte = await getRelbaseDte(typeDocument, folio);
                if (!dte || Number(dte.folio) !== folio) break;
                const result = await synchronizeDte({ boardId, typeDocument, folio, dte });
                results.push({ key: `${config.prefix}-${folio}`, ...result });
                if (!['synced', 'already-synced'].includes(result.status)) break;
                await repository.advanceCursor(typeDocument, folio);
                folio += 1;
            }
        }
        return results;
    });
    return globalLock.acquired ? globalLock.value : [];
}

function daysBetween(first, second) {
    return Math.floor((second - first) / (24 * 60 * 60 * 1000));
}

function shouldDeleteTrackedItem(item, now = new Date()) {
    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);
    if (item.relbase_status === 'paid') return daysBetween(startDate, now) > 7;
    return daysBetween(endDate, now) > 30;
}

function dateOnly(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
}

async function refreshTrackedDtes() {
    const globalLock = await repository.withAdvisoryLock('dte:refresh', async () => {
        const items = await repository.listTrackedItems();
        const results = [];
        for (const item of items) {
            const typeDocument = Number(item.type_document);
            const folio = Number(item.folio);
            const dte = await getRelbaseDte(typeDocument, folio);
            if (!dte) continue;
            try {
                const changed = dte.status !== item.relbase_status
                    || dateOnly(dte.start_date) !== dateOnly(item.start_date)
                    || dateOnly(dte.end_date) !== dateOnly(item.end_date)
                    || item.sync_status !== 'synced';
                if (changed) {
                    results.push(await synchronizeDte({
                        boardId: item.board_id,
                        itemId: item.monday_item_id,
                        typeDocument,
                        folio,
                        dte,
                        force: true,
                    }));
                }
                if (shouldDeleteTrackedItem({
                    relbase_status: dte.status,
                    start_date: dte.start_date,
                    end_date: dte.end_date,
                })) {
                    await repository.removeItem(typeDocument, folio);
                }
            } catch (error) {
                console.error(`[DTE SYNC] Refresh failed for ${typeDocument}-${folio}:`, error.message);
            }
        }
        return results;
    });
    return globalLock.acquired ? globalLock.value : [];
}

module.exports = {
    DTE_TYPE_CONFIG,
    discoverNewDtes,
    getMondayItem,
    getRelbaseDte,
    mapDocumentType,
    mapDteStatus,
    parseItemName,
    refreshTrackedDtes,
    shouldDeleteTrackedItem,
    synchronizeDte,
};
