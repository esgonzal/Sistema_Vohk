const express = require('express');
const axios = require('axios');
const router = express.Router();

// Define tu token de API de Monday.com
const MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjQxMTQ2Njk1OSwiYWFpIjoxMSwidWlkIjo2NjIwMTYyNSwiaWFkIjoiMjAyNC0wOS0xNlQyMDoyMDozNy4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjU0OTM0MzksInJnbiI6InVzZTEifQ.fNmvWweIy7JWcaOWhggW_HbIc_hJk6weiuM_-HjGys8';

async function obtenerDatosElemento(boardId, pulseId) {
    const query = `
        query {
            boards(ids: ${boardId}) {
                items(ids: ${pulseId}) {
                    name
                    column_values {
                        id
                        text
                    }
                }
            }
        }
    `;

    try {
        const response = await axios.post(
            'https://api.monday.com/v2', { query }, {
                headers: {
                    Authorization: MONDAY_API_TOKEN,
                },
            }
        );

        const itemData = response.data.data.boards[0].items[0];
        return itemData;
    } catch (error) {
        console.error('Error obteniendo datos del elemento:', error);
    }
}

// Ruta para procesar el webhook desde Monday.com
router.post('/', async(req, res) => {
    // Obtener los datos que llegan del webhook de Monday.com
    const data = req.body;

    // Imprimir los datos para asegurarse de que están llegando correctamente
    console.log('Datos recibidos del webhook:', data);
    // Obtén los ids del board y del elemento (pulse)
    const boardId = data.event.boardId;
    const pulseId = data.event.pulseId;

    try {
        const itemData = await obtenerDatosElemento(boardId, pulseId);
        console.log(itemData);

    } catch (error) {
        console.error('Error procesando la solicitud:', error);
        res.status(500).send('Error procesando la solicitud');
    }

});

module.exports = router;