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
        //await printBoardColumns(boardId);
        if (!item) {
            console.error('❌ Item not found');
            return;
        }
        const parsed = parseItemName(item.name);
        if (!parsed) {
            console.error('❌ Invalid item name format:', item.name);
            return;
        }
        const { folio, dteLabel } = parsed;
        const dte = await getRelbaseDteByFolio({ folio, dteLabel });
        if (!dte) return;
        const seller = await getRelbaseSeller(dte.seller_id);
        const sellerName = formatSellerName(seller);
        // FECHA EMISION
        await updateDateColumn({
            boardId,
            itemId: item.id,
            columnId: 'date',
            date: dte.start_date // "2025-12-18"
        });
        // ESTADO PAGO
        await updateStatusColumn({
            boardId,
            itemId: item.id,
            columnId: 'color_mkyryrxb',
            statusLabel: mapDteStatus(dte)
        });
        // VALOR FACTURA
        await updateNumberColumn({
            boardId,
            itemId: item.id,
            columnId: 'numeric_mkyr63qj',
            numberValue: Number(dte.real_amount_total)
        });
        // TIPO DOC
        await updateStatusColumn({
            boardId,
            itemId: item.id,
            columnId: 'color_mkyr7e09',
            statusLabel: mapTipoDoc(dte)
        });
        // VENDEDOR
        await updateDropdownColumn({
            boardId,
            itemId: item.id,
            columnId: 'dropdown_mkyrk2t1',
            labels: [sellerName]
        });
        // FECHA FINAL
        await updateDateColumn({
            boardId,
            itemId: item.id,
            columnId: 'date_mkyvc0pp',
            date: dte.end_date // "2025-12-18"
        });
    } catch (error) {
        console.error(
            '🔥 Error processing Monday webhook:',
            error.response?.data || error
        );
    }
});

router.post('/update', async (req, res) => {
    const data = req.body;
    // Monday webhook handshake
    if (data.challenge) {
        return res.status(200).send({ challenge: data.challenge });
    }
    res.status(200).send('ok');
    try {
        const event = data.event;
        if (!event) return;
        const itemId = event.pulseId;
        const boardId = event.boardId;
        await printBoardColumns(boardId, itemId);
        // 1️⃣ Get Monday item
        const item = await getMondayItem(itemId);
        if (!item) {
            console.error('❌ Item not found');
            return;
        }
        // 2️⃣ Parse item name: FE 2257 / BE 991 / NV 123
        const parsed = parseItemName(item.name);
        if (!parsed) {
            console.error('❌ Invalid item name format:', item.name);
            return;
        }
        const { folio, dteLabel } = parsed;
        console.log('🔄 [UPDATE] Triggered for ', dteLabel, ': ', folio);
        // 3️⃣ Fetch DTE again from Relbase
        const dte = await getRelbaseDteByFolio({ folio, dteLabel });
        if (!dte) return;
        const seller = await getRelbaseSeller(dte.seller_id);
        const sellerName = formatSellerName(seller);
        // 4️⃣ Update columns (same logic as create)
        // FECHA EMISION
        await updateDateColumn({
            boardId,
            itemId: item.id,
            columnId: 'date',
            date: dte.start_date // "2025-12-18"
        });
        // ESTADO PAGO
        await updateStatusColumn({
            boardId,
            itemId: item.id,
            columnId: 'color_mkyryrxb',
            statusLabel: mapDteStatus(dte)
        });
        // VALOR FACTURA
        await updateNumberColumn({
            boardId,
            itemId: item.id,
            columnId: 'numeric_mkyr63qj',
            numberValue: Number(dte.real_amount_total)
        });
        // TIPO DOC
        await updateStatusColumn({
            boardId,
            itemId: item.id,
            columnId: 'color_mkyr7e09',
            statusLabel: mapTipoDoc(dte)
        });
        // VENDEDOR
        await updateDropdownColumn({
            boardId,
            itemId: item.id,
            columnId: 'dropdown_mkyrk2t1',
            labels: [sellerName]
        });
        // FECHA FINAL
        await updateDateColumn({
            boardId,
            itemId: item.id,
            columnId: 'date_mkyvc0pp',
            date: dte.end_date // "2025-12-18"
        });
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
        mutation {
            create_item(
                board_id: ${boardId},
                item_name: "${itemName}"
            ) {
                id
            }
        }
    `;
    const response = await axios.post(
        MONDAY_API_URL,
        { query: mutation },
        {
            headers: {
                Authorization: MONDAY_API_TOKEN,
                'Content-Type': 'application/json'
            }
        }
    );

    return response.data?.data?.create_item || null;
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

async function getExistingItemNames(boardId) {
    const query = `
      query {
        boards(ids: [${boardId}]) {
          items_page(limit: 500) {
            items {
              name
            }
          }
        }
      }
    `;
    const res = await axios.post(
        MONDAY_API_URL,
        { query },
        { headers: { Authorization: MONDAY_API_TOKEN } }
    );
    const items =
        res.data?.data?.boards?.[0]?.items_page?.items || [];
    return new Set(items.map(i => i.name.trim()));
}

//RELBASE FUNCTIONS
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

async function checkForNewDtes2(boardId) {
    //console.log('⏱️ [DTE CHECK] Starting scan');
    const lastFolios = readLastFolios();
    let updated = false;
    for (const typeDocument of Object.keys(DTE_TYPE_CONFIG)) {
        const config = DTE_TYPE_CONFIG[typeDocument];
        let folio = lastFolios[typeDocument] + 1;
        //console.log(`🔎 Checking ${config.prefix} starting at folio ${folio}`);
        while (true) {
            const dte = await getRelbaseDteByTypeAndFolio(typeDocument, folio);
            if (!dte || Number(dte.folio) !== Number(folio)) {
                console.log(`⛔ No DTE found for ${config.prefix} ${folio}`);
                break;
            }
            //console.log(`🧾 Found DTE ${typeDocument} folio ${folio}, pushing to Monday`);
            const itemName = `${config.prefix} ${folio}`;
            console.log(`✅ New DTE found → ${itemName}`);
            // 🔐 Guardrail: check Monday first
            const exists = await mondayItemExists({ boardId, itemName });
            if (exists) {
                console.log(`⏭️ ${itemName} already exists, skipping`);
                folio++;
                continue;
            }
            //console.log(`➕ Creating ${itemName}`);
            await createMondayItem({ boardId, itemName });
            // Only advance stored folio when we actually created something
            lastFolios[typeDocument] = folio;
            updated = true;
            folio++;
            // ⏳ Be nice to Monday
            await new Promise(r => setTimeout(r, 300));
        }
    }
    if (updated) {
        writeLastFolios(lastFolios);
        console.log('💾 Folios updated:', lastFolios);
    }
    //console.log('🏁 [DTE CHECK] Finished');
}

async function checkForNewDtes(boardId) {
    const lastFolios = readLastFolios();
    const existingNames = await getExistingItemNames(boardId);
    let updated = false;
    for (const typeDocument of Object.keys(DTE_TYPE_CONFIG)) {
        const config = DTE_TYPE_CONFIG[typeDocument];
        let folio = lastFolios[typeDocument] + 1;
        while (true) {
            const dte = await getRelbaseDteByTypeAndFolio(
                typeDocument,
                folio
            );
            if (!dte || Number(dte.folio) !== Number(folio)) {
                console.log(`⛔ No DTE for ${config.prefix} ${folio}`);
                break;
            }
            const itemName = `${config.prefix} ${folio}`;
            if (existingNames.has(itemName)) {
                console.log(`⏭️ Exists: ${itemName}`);
                lastFolios[typeDocument] = folio;
                folio++;
                updated = true;
                continue;
            }
            console.log(`➕ Creating ${itemName}`);
            const item = await createMondayItem({
                boardId,
                itemName
            });
            if (!item?.id) {
                console.error(`❌ Failed to create ${itemName}`);
                break;
            }
            // ⛓️ Populate synchronously
            await populateItemFromDte({
                boardId,
                itemId: item.id,
                dte
            });
            existingNames.add(itemName);
            lastFolios[typeDocument] = folio;
            updated = true;
            folio++;
            // throttle
            await new Promise(r => setTimeout(r, 400));
        }
    }
    if (updated) {
        writeLastFolios(lastFolios);
        console.log('💾 Folios updated:', lastFolios);
    }
}

async function getRelbaseDteByFolio({ folio, dteLabel }) {
    if (!folio || !dteLabel) return null;
    const typeDocument = DTE_TYPE_MAP[dteLabel];
    if (!typeDocument) {
        console.error('❌ Unknown DTE type:', dteLabel);
        return null;
    }
    try {
        const response = await axios.get(
            'https://api.relbase.cl/api/v1/dtes',
            {
                params: {
                    type_document: typeDocument,
                    query: folio
                },
                headers: {
                    accept: 'application/json',
                    Authorization: USER,
                    Company: COMPANY
                }
            }
        );
        const dtes = response.data?.data?.dtes || [];
        const dte = pickExactDte(dtes, folio, typeDocument);
        if (!dte) {
            console.warn(`⚠️ No DTE found for folio ${folio} (${typeDocument})`);
            return null;
        }
        return dte;
    } catch (error) {
        console.error(
            '🔥 Relbase DTE lookup failed:',
            error.response?.data || error
        );
        return null;
    }
}

async function getRelbaseDteByTypeAndFolio(typeDocument, folio) {
    try {
        const response = await axios.get(
            'https://api.relbase.cl/api/v1/dtes',
            {
                params: {
                    type_document: typeDocument,
                    query: folio
                },
                headers: {
                    accept: 'application/json',
                    Authorization: USER,
                    Company: COMPANY
                }
            }
        );
        const dtes = response.data?.data?.dtes || [];
        const dte = pickExactDte(dtes, folio, typeDocument);
        if (!dte) {
            console.warn(`⛔ No exact match for ${typeDocument}-${folio}`);
            return null;
        }
        return dte;
    } catch (error) {
        console.error(
            `🔥 Relbase lookup failed for ${typeDocument}-${folio}`,
            error.response?.data || error.message
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

async function populateItemFromDte({ boardId, itemId, dte }) {
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
}

//HELPER FUNCTIONS
setTimeout(() => {
    /*
    setInterval(() => {
        checkForNewDtes(18392646892);
    }, 5 * 60 * 1000);
    */
    setTimeout(async () => {
        console.log('🕰️ Starting ONE-TIME DTE backfill');
        await checkForNewDtes(18392646892);
        console.log('✅ Backfill finished');
    }, 10_000);
}, 10_000); // wait 10s after boot

const DTE_TYPE_MAP = {
    'Factura': 33,
    'Boleta': 39,
    'Nota de Venta': 1001,
};

const DTE_TYPE_CONFIG = {
    33: { prefix: 'FE', label: 'Factura' },
    39: { prefix: 'BE', label: 'Boleta' },
    1001: { prefix: 'NV', label: 'Nota de Venta' }
};

function readLastFolios() {
    return JSON.parse(fs.readFileSync(FOLIO_FILE, 'utf8'));
}

function writeLastFolios(folios) {
    fs.writeFileSync(FOLIO_FILE, JSON.stringify(folios, null, 2));
}

function mapDteStatus(dte) {
    const today = new Date();
    const endDate = new Date(dte.end_date);
    if (dte.status === 'paid') return 'Pagado';
    if (dte.status === 'partial') return 'Abono';
    if (dte.status === 'cancel') return 'Anulada';
    if (!dte.status || dte.status === 'pending') {
        if (today > endDate) return 'Vencida';
        return 'Pendiente';
    }
    return 'No Aplica';
}

function parseItemName(name) {
    if (!name) return null;
    const match = name.trim().match(/^(FE|BE|NV)\s*(\d+)$/i);
    if (!match) return null;
    const [, type, folio] = match;
    let dteLabel;
    switch (type.toUpperCase()) {
        case 'FE':
            dteLabel = 'Factura';
            break;
        case 'BE':
            dteLabel = 'Boleta';
            break;
        case 'NV':
            dteLabel = 'Nota de Venta';
            break;
        default:
            return null;
    }
    return {
        dteLabel,
        folio
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

async function printBoardColumns(boardId, itemId) {
    const query = `
      query {
        boards(ids: [${boardId}]) {
          id
          name
          columns {
            id
            title
            type
          }
        }
        items(ids: [${itemId}]) {
          id
          name
          column_values {
            id
            text
            value
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
    const board = response.data?.data?.boards?.[0];
    const item = response.data?.data?.items?.[0];
    if (!board) {
        console.error('❌ Board not found');
        return;
    }
    if (!item) {
        console.error('❌ Item not found');
        return;
    }
    console.log(`📋 Board: ${board.name} (${board.id})`);
    console.log('🧱 Columns:');
    board.columns.forEach(col => {
        console.log(`• ${col.id} | ${col.title} | ${col.type}`);
    });
    console.log(`📦 Item: ${item.name} (${item.id})`);
    console.log('🧩 Column values:');
    item.column_values.forEach(col => {
        console.log(
            `• ${col.id} → text="${col.text}" value=${col.value}`
        );
    });
}

function pickExactDte(dtes, folio, typeDocument) {
    if (!Array.isArray(dtes)) return null;
    // Exact match only
    const exact = dtes.filter(d =>
        Number(d.folio) === Number(folio) &&
        Number(d.type_document) === Number(typeDocument)
    );
    if (exact.length === 0) return null;
    // If somehow multiple exist, pick the newest
    exact.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return exact[0];
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function backfillDtes({ boardId, fromFolios, toFolios }) {
    for (const typeDocument of Object.keys(DTE_TYPE_CONFIG)) {
        const config = DTE_TYPE_CONFIG[typeDocument];
        let folio = fromFolios[typeDocument];
        while (folio <= toFolios[typeDocument]) {
            const dte = await getRelbaseDteByTypeAndFolio(typeDocument, folio);
            if (!dte || Number(dte.folio) !== Number(folio)) {
                folio++;
                continue;
            }
            const itemName = `${config.prefix} ${folio}`;
            await createMondayItem({ boardId, itemName });
            await sleep(300);
            folio++;
        }
    }
}

async function runBackfillOnce() {
    console.log('🕰️ Starting DTE backfill (ONE TIME ONLY)');
    await backfillDtes({
        boardId: 18392646892,
        fromFolios: {
            "33": 1195,
            "39": 930,
            "1001": 1465
        },
        toFolios: {
            "33": 2254,
            "39": 1637,
            "1001": 1466
        }
    });
    console.log('✅ Backfill finished');
}

module.exports = router;