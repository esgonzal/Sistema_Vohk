const express = require('express');
const axios = require('axios');
const router = express.Router();
const FormData = require('form-data');
const stream = require('stream');

const USER = 'XBKEscqiybHhdkbT5KZ1d4Nh';
const COMPANY = 'CX67HbYo9xKSaW1YNZ5x2KUV';

const MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjMxNjI3NTAwOCwiYWFpIjoxMSwidWlkIjoyNTE4MTczNSwiaWFkIjoiMjAyNC0wMS0zMVQxNjo1OTowNy4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6NzA2NDk3NiwicmduIjoidXNlMSJ9.7r5JDi4lOgur0OCjM-DpB5ZSd31kEF0LG6ytFyihIkE'
const MONDAY_API_URL = 'https://api.monday.com/v2';

const DTE_TYPE_MAP = {
    'factura': 33,
    'Factura': 33,
    'Boleta': 39,
    'Boleta electrónica': 39,
    'Nota de Venta': 1001,
    'Guía de Despacho': 52,
    'Nota de crédito': 61,
    'Nota de débito': 56
};

function mapDteStatus(dte) {
    const today = new Date();
    const endDate = new Date(dte.end_date);
    if (dte.status === 'paid') return 'Pagado';
    if (dte.status === 'partial') return 'Abono';
    if (!dte.status || dte.status === 'pending') {
        if (today > endDate) return 'Vencida';
        return 'Pendiente';
    }
    return 'No Aplica';
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

async function uploadPdfToMonday({ itemId, columnId, pdfUrl }) {
    // 1. Download the PDF
    const pdfResponse = await axios.get(pdfUrl, {
        responseType: 'arraybuffer'
    });
    const buffer = Buffer.from(pdfResponse.data);
    // 2. Build multipart form
    const form = new FormData();
    // 3. GraphQL mutation (NO inline values)
    const mutation = `
    mutation addFile($itemId: Int!, $columnId: String!, $file: File!) {
        add_file_to_column(
            item_id: $itemId,
            column_id: $columnId,
            file: $file
        ) {
            id
        }
    }
    `;
    // 4. operations
    form.append(
        'operations',
        JSON.stringify({
            query: mutation,
            variables: {
                itemId: Number(itemId),
                columnId,
                file: null
            }
        })
    );
    // 5. map (multipart spec)
    form.append(
        'map',
        JSON.stringify({
            '0': ['variables.file']
        })
    );
    // 6. actual file
    form.append('0', buffer, {
        filename: 'DTE.pdf',
        contentType: 'application/pdf'
    });
    // 7. send request
    const response = await axios.post(
        'https://api.monday.com/v2/file',
        form,
        {
            headers: {
                Authorization: MONDAY_API_TOKEN,
                ...form.getHeaders()
            }
        }
    );
    console.log('📡 Monday response:', response.data);
    return response.data;
}

async function updateNumberColumn({ boardId, itemId, columnId, numberValue }) {
    const query = `
        mutation {
            change_column_value(
                board_id: ${boardId},
                item_id: ${itemId},
                column_id: "${columnId}",
                value: "${numberValue}"
            ) {
                id
            }
        }
    `;
    const response = await axios.post(MONDAY_API_URL, { query }, {
        headers: {
            Authorization: MONDAY_API_TOKEN,
            'Content-Type': 'application/json'
        }
    });
    console.log('📡 Monday response:', response.data);
    return response.data;
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
        console.log('📡 Monday status column updated:', response.data);
        return response.data;
    } catch (error) {
        console.error('🔥 Failed to update status column:', error.response?.data || error);
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
        if (event.type !== 'update_column_value') return;
        const pulseId = event.pulseId;
        const item = await getMondayItem(pulseId);
        const boardId = event.boardId;
        await printBoardColumns(boardId);
        if (!item) {
            console.error('❌ Item not found');
            return;
        }
        const folio = item.column_values.find(
            col => col.column?.title === 'Folio'
        )?.text;
        const dteLabel = item.column_values.find(
            col => col.column?.title == 'DTE emitido (intro)'
        )?.text;
        const dte = await getRelbaseDteByFolio({
            folio,
            dteLabel
        });
        if (dte) {
            console.log('📄 Relbase DTE ID:', dte.id);
            console.log('📎 PDF URL:', dte.pdf_file?.url);
        }
        if (dte.real_amount_total) {
            await updateNumberColumn({
                boardId: boardId,
                itemId: item.id,
                columnId: 'n_meros',
                numberValue: dte.real_amount_total
            });
        }
        if (dte.status) {
            await updateStatusColumn({
                boardId,
                itemId: item.id,
                columnId: 'estado',
                statusLabel: mapDteStatus(dte)
            });
        }
        /*
        if (dte?.pdf_file?.url) {
            console.log("file will try to be uploaded")
            await uploadPdfToMonday({
                itemId: item.id,
                columnId: 'archivo',
                pdfUrl: dte.pdf_file.url
            });
        }
        */
    } catch (error) {
        console.error(
            '🔥 Error processing Monday webhook:',
            error.response?.data || error
        );
    }
});

module.exports = router;