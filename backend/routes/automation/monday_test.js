const express = require('express');
const axios = require('axios');
const router = express.Router();

const USER = 'XBKEscqiybHhdkbT5KZ1d4Nh';
const COMPANY = 'CX67HbYo9xKSaW1YNZ5x2KUV';

const MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjMxNjI3NTAwOCwiYWFpIjoxMSwidWlkIjoyNTE4MTczNSwiaWFkIjoiMjAyNC0wMS0zMVQxNjo1OTowNy4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6NzA2NDk3NiwicmduIjoidXNlMSJ9.7r5JDi4lOgur0OCjM-DpB5ZSd31kEF0LG6ytFyihIkE'
const MONDAY_API_URL = 'https://api.monday.com/v2';

const fs = require('fs');
const path = require('path');
const FOLIO_FILE = path.join(__dirname, '../../data/last_folios.json');
const WATCHLIST_PATH = path.join(__dirname, '../../data/watchlist.json');

//ENDPOINTS
router.post('/', async (req, res) => {
    const data = req.body;
    if (data.challenge) {
        return res.status(200).send({ challenge: data.challenge });
    }
    res.status(200).send('ok');
    try {
        const event = data.event;
        if (!event) return;
        if (event.type !== 'create_pulse') return;
        const itemId = event.pulseId;
        const boardId = event.boardId;
        const item = await getMondayItem(itemId);
        if (!item) {
            console.error('❌ Item not found');
            return;
        }
        const parsed = parseItemName(item.name);
        if (!parsed) {
            console.error('❌ Invalid item name format:', item.name);
            return;
        }
        const { prefix, typeDocument, folio_number, dteLabel } = parsed;
        const dte = await getRelbaseDte(typeDocument, folio_number);
        if (!dte) return;
        await updateMondayItem({ boardId, itemId, dte });
        addDteToWatchlist({ boardId, itemId, dte });
    } catch (error) {
        console.error(
            '🔥 Error processing Monday webhook:',
            error.response?.data || error
        );
    }
});

router.post('/update', async (req, res) => {
    const data = req.body;
    if (data.challenge) {
        return res.status(200).send({ challenge: data.challenge });
    }
    res.status(200).send('ok');
    try {
        const event = data.event;
        if (!event) return;
        const itemId = event.pulseId;
        const boardId = event.boardId;
        const item = await getMondayItem(itemId);
        if (!item) {
            console.error('❌ Item not found');
            return;
        }
        const parsed = parseItemName(item.name);
        if (!parsed) {
            console.error('❌ Invalid item name format:', item.name);
            return;
        }
        const { prefix, typeDocument, folio_number, dteLabel } = parsed;
        const dte = await getRelbaseDte(typeDocument, folio_number);
        if (!dte) return;
        await updateMondayItem({ boardId, itemId, dte });
    } catch (error) {
        console.error(
            '🔥 [UPDATE] Error processing webhook:',
            error.response?.data || error
        );
    }
});

//GET or CREATE ITEMS IN MONDAY
async function createMondayItem({ boardId, itemName }) {
    const mutation = `
        mutation CreateItem($boardId: ID!, $itemName: String!) {
            create_item(
                board_id: $boardId,
                item_name: $itemName
            ) {
                id
            }
        }
    `;
    const variables = {
        boardId: String(boardId),
        itemName
    };
    try {
        const response = await axios.post(
            MONDAY_API_URL,
            { query: mutation, variables },
            {
                headers: {
                    Authorization: MONDAY_API_TOKEN,
                    "Content-Type": "application/json"
                }
            }
        );
        return response.data?.data?.create_item || null;
    } catch (error) {
        console.error(
            "🔥 Failed to create Monday item:",
            error.response?.data || error.message
        );
        return null;
    }
}

async function getMondayItem(pulseId) {
    const query = `
    query {
      items(ids: [${pulseId}]) {
        id
        name
        column_values {
          id
          text
          value
          column {
            title
          }
        }
      }
    }
  `;
    const response = await axios.post(
        MONDAY_API_URL,
        { query },
        {
            headers: {
                Authorization: MONDAY_API_TOKEN,
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data.data.items?.[0] || null;
}

async function mondayItemExists({ boardId, itemName }) {
    const query = `
        query {
            items_by_column_values(
                board_id: ${boardId},
                column_id: "name",
                column_value: "${itemName}"
            ) {
                id
            }
        }
    `;
    const response = await axios.post(
        MONDAY_API_URL,
        { query },
        {
            headers: {
                Authorization: MONDAY_API_TOKEN,
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data?.data?.items_by_column_values?.length > 0;
}

//RELBASE API FUNCTIONS
async function checkForNewDtes(boardId) {
    const lastFolios = readLastFolios();
    let updated = false;
    for (const typeDocument of Object.keys(DTE_TYPE_CONFIG)) {
        const config = DTE_TYPE_CONFIG[typeDocument];
        let folio = lastFolios[typeDocument] + 1;
        while (true) {
            const dte = await getRelbaseDte(typeDocument, folio);
            if (!dte || Number(dte.folio) !== Number(folio)) {
                break;
            }
            const itemName = `${config.prefix} ${folio}`;
            console.log(`✅ New DTE found → ${itemName}`);
            const exists = await mondayItemExists({ boardId, itemName });
            if (exists) {
                console.log(`⏭️ ${itemName} already exists, skipping`);
                folio++;
                continue;
            }
            const createdItem = await createMondayItem({ boardId, itemName });
            console.log('🧱 Created Monday item:', createdItem);
            if (!createdItem?.id) return;
            addDteToWatchlist({ dte, boardId, itemId: createdItem.id });
            lastFolios[typeDocument] = folio;
            updated = true;
            folio++;
            await new Promise(r => setTimeout(r, 300));
        }
    }
    if (updated) {
        writeLastFolios(lastFolios);
        console.log('💾 Folios updated:', lastFolios);
    }
}

async function getRelbaseDte(typeDocument, folio_number) {
    let page = 1;
    let totalPages = 1;
    try {
        while (page <= totalPages) {
            const response = await axios.get(
                'https://api.relbase.cl/api/v1/dtes',
                {
                    params: {
                        type_document: typeDocument,
                        query: folio_number,
                        page
                    },
                    headers: {
                        accept: 'application/json',
                        Authorization: USER,
                        Company: COMPANY
                    }
                }
            );
            const meta = response.data?.meta;
            const dtes = response.data?.data?.dtes || [];
            totalPages = meta?.total_pages ?? 1;
            const dte = pickExactDte(dtes, folio_number, typeDocument);
            if (dte) return dte;
            page++;
        }
        return null;
    } catch (error) {
        console.error(
            `Relbase lookup failed for ${typeDocument}-${folio_number}`,
            error.response?.data || error.message
        );
        return null;
    }
}

async function getRelbaseSeller(sellerId) {
    if (!sellerId) return null;
    try {
        const response = await axios.get(
            `https://api.relbase.cl/api/v1/vendedores/${sellerId}`,
            {
                headers: {
                    accept: 'application/json',
                    Authorization: USER,
                    Company: COMPANY
                }
            }
        );
        return response.data?.data || null;
    } catch (error) {
        console.error(
            '🔥 Relbase seller lookup failed:',
            error.response?.data || error
        );
        return null;
    }
}

//UPDATE COLUMNS IN MONDAY
async function updateDateColumn({ boardId, itemId, columnId, date }) {
    if (!date) return;
    const mutation = `
        mutation changeColumnValue(
            $boardId: ID!,
            $itemId: ID!,
            $columnId: String!,
            $value: JSON!
        ) {
            change_column_value(
                board_id: $boardId,
                item_id: $itemId,
                column_id: $columnId,
                value: $value
            ) {
                id
            }
        }
    `;
    const variables = {
        boardId: String(boardId),
        itemId: String(itemId),
        columnId,
        value: JSON.stringify({
            date // must be YYYY-MM-DD
        })
    };
    try {
        const response = await axios.post(
            MONDAY_API_URL,
            { query: mutation, variables },
            {
                headers: {
                    Authorization: MONDAY_API_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        //console.log('📅 Monday date column updated:', response.data);
        return response.data;
    } catch (error) {
        console.error(
            '🔥 Failed to update date column:',
            error.response?.data || error
        );
    }
}

async function updateNumberColumn({ boardId, itemId, columnId, numberValue }) {
    const mutation = `
        mutation changeColumnValue(
            $boardId: ID!,
            $itemId: ID!,
            $columnId: String!,
            $value: JSON!
        ) {
            change_column_value(
                board_id: $boardId,
                item_id: $itemId,
                column_id: $columnId,
                value: $value
            ) {
                id
            }
        }
    `;
    const variables = {
        boardId: String(boardId),
        itemId: String(itemId),
        columnId,
        value: JSON.stringify(numberValue)
    };
    return axios.post(
        MONDAY_API_URL,
        { query: mutation, variables },
        {
            headers: {
                Authorization: MONDAY_API_TOKEN,
                'Content-Type': 'application/json'
            }
        }
    );
}

async function updateStatusColumn({ boardId, itemId, columnId, statusLabel }) {
    const mutation = `
        mutation changeColumnValue($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
            change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
                id
            }
        }
    `;
    const variables = {
        boardId: String(boardId),
        itemId: String(itemId),
        columnId,
        value: JSON.stringify({ label: statusLabel })
    };
    try {
        const response = await axios.post(
            MONDAY_API_URL,
            { query: mutation, variables },
            { headers: { Authorization: MONDAY_API_TOKEN, 'Content-Type': 'application/json' } }
        );
        //console.log('📡 Monday status column updated:', response.data);
        return response.data;
    } catch (error) {
        console.error('🔥 Failed to update status column:', error.response?.data || error);
    }
}

async function updateDropdownColumn({ boardId, itemId, columnId, labels }) {
    if (!Array.isArray(labels) || labels.length === 0) {
        return;
    }
    // ⬇️ IMPORTANT: labels must be plain strings
    const mutation = `
        mutation changeColumnValue(
            $boardId: ID!,
            $itemId: ID!,
            $columnId: String!,
            $value: JSON!
        ) {
            change_column_value(
                board_id: $boardId,
                item_id: $itemId,
                column_id: $columnId,
                value: $value
            ) {
                id
            }
        }
    `;
    const variables = {
        boardId: String(boardId),
        itemId: String(itemId),
        columnId,
        value: JSON.stringify({
            labels // ← ARRAY OF STRINGS
        })
    };
    try {
        const response = await axios.post(
            MONDAY_API_URL,
            { query: mutation, variables },
            {
                headers: {
                    Authorization: MONDAY_API_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        if (response.data?.errors) {
            console.error('🚨 [Dropdown] GraphQL errors:', response.data.errors);
        }
        return response.data;
    } catch (error) {
        console.error('🔴 [Dropdown] FAILED');
        console.error(error.response?.data || error.message || error);
    }
}

async function updateLinkColumn({ boardId, itemId, columnId, url, text }) {
    if (!url) return;
    const mutation = `
        mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
            change_column_value(
                board_id: $boardId,
                item_id: $itemId,
                column_id: $columnId,
                value: $value
            ) {
                id
            }
        }
    `;
    const variables = {
        boardId: String(boardId),
        itemId: String(itemId),
        columnId,
        value: JSON.stringify({
            url,
            text: text || 'XML'
        })
    };
    await axios.post(
        MONDAY_API_URL,
        { query: mutation, variables },
        {
            headers: {
                Authorization: MONDAY_API_TOKEN,
                'Content-Type': 'application/json'
            }
        }
    );
}

async function updateMondayItem({ boardId, itemId, dte }) {
    const seller = await getRelbaseSeller(dte.seller_id);
    const sellerName = formatSellerName(seller);
    await updateDateColumn({
        boardId,
        itemId,
        columnId: 'date',
        date: dte.start_date
    });
    await updateStatusColumn({
        boardId,
        itemId,
        columnId: 'color_mkyryrxb',
        statusLabel: mapDteStatus(dte)
    });
    await updateNumberColumn({
        boardId,
        itemId,
        columnId: 'numeric_mkyr63qj',
        numberValue: Number(dte.real_amount_total)
    });
    await updateStatusColumn({
        boardId,
        itemId,
        columnId: 'color_mkyr7e09',
        statusLabel: mapTipoDoc(dte)
    });
    await updateDropdownColumn({
        boardId,
        itemId,
        columnId: 'dropdown_mkyrk2t1',
        labels: [sellerName]
    });
    await updateDateColumn({
        boardId,
        itemId,
        columnId: 'date_mkyvc0pp',
        date: dte.end_date
    });
    await updateLinkColumn({
        boardId,
        itemId,
        columnId: 'link_mm0ekked',
        url: dte.xml_inter_file.url,
        text: 'XML'
    });
}

//HELPER FUNCTIONS
setTimeout(() => {
    setInterval(() => {
        checkForNewDtes(18392646892);
    }, 5 * 60 * 1000);
    scheduleWatchlistScan();
}, 10_000);

const DTE_MAP = {
    FE: {
        typeDocument: 33,
        label: "Factura",
        prefix: "FE"
    },
    BE: {
        typeDocument: 39,
        label: "Boleta",
        prefix: "BE"
    },
    NV: {
        typeDocument: 1001,
        label: "Nota de Venta",
        prefix: "NV"
    }
};

const DTE_TYPE_CONFIG = {
    33: { prefix: 'FE', label: 'Factura' },
    39: { prefix: 'BE', label: 'Boleta' },
    1001: { prefix: 'NV', label: 'Nota de Venta' }
};

//READ OR WRITE JSON FILES
function readLastFolios() {
    return JSON.parse(fs.readFileSync(FOLIO_FILE, 'utf8'));
}

function writeLastFolios(folios) {
    fs.writeFileSync(FOLIO_FILE, JSON.stringify(folios, null, 2));
}

function readWatchlist() {
    if (!fs.existsSync(WATCHLIST_PATH)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(WATCHLIST_PATH, "utf8"));
}

function writeWatchlist(data) {
    fs.writeFileSync(
        WATCHLIST_PATH,
        JSON.stringify(data, null, 4),
        "utf8"
    );
}

//MAP VARIABLES
function mapDteStatus(dte) {
    const today = new Date();
    const endDate = new Date(dte.end_date);
    if (dte.status === 'paid') return 'Pagado';
    if (dte.status === 'partial') return 'Abono';
    if (dte.status === 'cancel') return 'Anulada';
    if (dte.status === 'accepted') return 'Pagado';
    if (!dte.status || dte.status === 'pending') {
        if (today > endDate) return 'Vencido';
        return 'Pendiente';
    }
    return 'No Aplica';
}

function parseItemName(name) {
    if (!name) return null;
    const match = name.trim().match(/^(FE|BE|NV)\s*(\d+)$/i);
    if (!match) return null;
    const [, prefix, folio] = match;
    const config = DTE_MAP[prefix.toUpperCase()];
    if (!config) return null;
    return {
        prefix: config.prefix,             // FE
        folio_number: Number(folio),       // 1409
        typeDocument: config.typeDocument, // 33
        dteLabel: config.label             // Factura
    };
}

function mapTipoDoc(dte) {
    if (!dte?.type_document_name) return 'No Aplica';
    if (dte.type_document_name === 'FACTURA ELECTRÓNICA') {
        return 'Factura';
    }
    if (dte.type_document_name === 'BOLETA ELECTRÓNICA') {
        return 'Boleta';
    }
    if (dte.type_document_name === 'NOTA DE VENTA') {
        return 'Nota de Venta';
    }
    return 'Otro';
}

function formatSellerName(vendedor) {
    if (!vendedor) return null;
    return `${vendedor.first_name.trim()} ${vendedor.last_name.trim()}`;
}

//MISC
function pickExactDte(dtes, folio, typeDocument) {
    if (!Array.isArray(dtes)) return null;
    const exact = dtes.filter(d =>
        Number(d.folio) === Number(folio) &&
        Number(d.type_document) === Number(typeDocument)
    );
    if (exact.length === 0) {
        return null;
    }
    exact.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return exact[0];
}

function addDteToWatchlist({ dte, boardId, itemId }) {
    console.log("trying to add the dte ", dte.folio, " to the watchlist");
    console.log("DTE: ", dte);
    console.log("boardId: ", boardId);
    console.log("itemId: ", itemId);
    const watchlist = readWatchlist();
    const key = `${dte.type_document}-${dte.folio}`;
    if (watchlist[key]) {
        return;
    }
    watchlist[key] = {
        type_document: dte.type_document,
        folio: dte.folio,
        boardId,
        itemId,
        start_date: dte.start_date,
        end_date: dte.end_date,
        status: dte.status
    };
    writeWatchlist(watchlist);
}

async function scanWatchlist() {
    const watchlist = readWatchlist();
    const today = new Date();
    let changed = false;
    for (const [key, dte] of Object.entries(watchlist)) {
        const relbaseDte = await getRelbaseDte(dte.type_document, dte.folio);
        if (!relbaseDte) {
            delete watchlist[key];
            changed = true;
            continue;
        }
        const newStatus = relbaseDte.status;
        const newEndDate = relbaseDte.end_date;
        const newStartDate = relbaseDte.start_date;
        let needsUpdate = false;
        if (newStatus && newStatus !== dte.status) {
            dte.status = newStatus;
            needsUpdate = true;
        }
        if (newEndDate && newEndDate !== dte.end_date) {
            dte.end_date = newEndDate;
            needsUpdate = true;
        }
        if (newStartDate && newStartDate !== dte.start_date) {
            dte.start_date = newStartDate;
            needsUpdate = true;
        }
        if (needsUpdate) {
            await updateMondayItem({ boardId: dte.boardId, itemId: dte.itemId, dte });
            changed = true;
        }
        if (shouldDeleteFromWatchlist(dte, today)) {
            delete watchlist[key];
            changed = true;
        }
    }
    if (changed) {
        writeWatchlist(watchlist);
    }
}

function daysBetween(date1, date2) {
    const ms = 1000 * 60 * 60 * 24;
    return Math.floor((date2 - date1) / ms);
}

function shouldDeleteFromWatchlist(dte, today) {
    const startDate = new Date(dte.start_date);
    const endDate = new Date(dte.end_date);
    if (dte.status === "paid") {
        return daysBetween(startDate, today) > 7;
    }
    return daysBetween(endDate, today) > 7;
}

function scheduleWatchlistScan() {
    const now = new Date();
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    if (now.getHours() < 12) {
        next.setHours(12, 0, 0, 0);
    } else {
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
    }
    const delay = next.getTime() - now.getTime();
    console.log(
        `⏰ scanWatchlist scheduled in ${Math.round(delay / 1000 / 60)} minutes`
    );
    setTimeout(() => {
        scanWatchlist();
        setInterval(() => {
            scanWatchlist();
        }, 12 * 60 * 60 * 1000);
    }, delay);
}

module.exports = router;