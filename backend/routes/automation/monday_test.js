const express = require('express');
const axios = require('axios');
const router = express.Router();

const USER = 'XBKEscqiybHhdkbT5KZ1d4Nh';
const COMPANY = 'CX67HbYo9xKSaW1YNZ5x2KUV';

const MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjMxNjI3NTAwOCwiYWFpIjoxMSwidWlkIjoyNTE4MTczNSwiaWFkIjoiMjAyNC0wMS0zMVQxNjo1OTowNy4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6NzA2NDk3NiwicmduIjoidXNlMSJ9.7r5JDi4lOgur0OCjM-DpB5ZSd31kEF0LG6ytFyihIkE'
const MONDAY_API_URL = 'https://api.monday.com/v2';

const DTE_TYPE_MAP = {
    'Factura': 33,
    'Boleta': 39,
    'Nota de Venta': 1001,
};

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

async function printBoardColumns(boardId) {
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
    if (!board) {
        console.error('❌ Board not found');
        return;
    }
    console.log(`📋 Board: ${board.name} (${board.id})`);
    console.log('🧱 Columns:');
    board.columns.forEach(col => {
        console.log(`• ID: ${col.id} | Title: ${col.title} | Type: ${col.type}`);
    });
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
        const dte = response.data?.data?.dtes?.[0] || null;
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
    console.log('🟡 [Dropdown] START');
    console.log('🧾 Input params:', {
        boardId,
        itemId,
        columnId,
        labels,
        labelsType: typeof labels,
        isArray: Array.isArray(labels)
    });
    if (!Array.isArray(labels) || labels.length === 0) {
        console.warn('⚠️ [Dropdown] Labels invalid or empty, aborting');
        return;
    }
    // ⬇️ IMPORTANT: labels must be plain strings
    console.log('🧾 Using labels (strings only):', labels);
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
    console.log('🧾 GraphQL variables:', JSON.stringify(variables, null, 2));
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
        console.log('🟢 [Dropdown] RESPONSE:', JSON.stringify(response.data, null, 2));
        if (response.data?.errors) {
            console.error('🚨 [Dropdown] GraphQL errors:', response.data.errors);
        }
        return response.data;
    } catch (error) {
        console.error('🔴 [Dropdown] FAILED');
        console.error(error.response?.data || error.message || error);
    } finally {
        console.log('🟡 [Dropdown] END');
    }
}

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
    } catch (error) {
        console.error(
            '🔥 Error processing Monday webhook:',
            error.response?.data || error
        );
    }
});

module.exports = router;