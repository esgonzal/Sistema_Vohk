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
    'Guía de Despacho': 52,
    'Nota de crédito': 61,
    'Nota de débito': 56
};

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
    const pdfResponse = await axios.get(pdfUrl, {
        responseType: 'arraybuffer'
    });

    const buffer = Buffer.from(pdfResponse.data);
    const form = new FormData();

    const mutation =
        'mutation ($file: File!) { add_file_to_column(item_id: ' +
        itemId +
        ', column_id: "' +
        columnId +
        '", file: $file) { id } }';

    form.append(
        'operations',
        JSON.stringify({
            query: mutation,
            variables: { file: null }
        })
    );
    form.append(
        'map',
        JSON.stringify({
            '0': ['variables.file']
        })
    );
    form.append('0', buffer, {
        filename: 'DTE.pdf',
        contentType: 'application/pdf'
    });
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
        if (dte?.pdf_file?.url) {
            console.log("file will try to be uploaded")
            await uploadPdfToMonday({
                itemId: item.id,
                columnId: 'archivo', // ⚠️ must be the column ID, not the title
                pdfUrl: dte.pdf_file.url
            });
            console.log('📤 PDF uploaded to Monday');
        }
    } catch (error) {
        console.error(
            '🔥 Error processing Monday webhook:',
            error.response?.data || error
        );
    }
});

module.exports = router;