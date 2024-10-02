const express = require('express');
const axios = require('axios');
const router = express.Router();
const MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjQxODQ0NDM2MSwiYWFpIjoxMSwidWlkIjo2Njg1Nzc0MiwiaWFkIjoiMjAyNC0xMC0wMlQxMzoxNjo1Ny41MTZaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjU3NzE2MjQsInJnbiI6InVzZTEifQ.xSFp7Dl1hEqHj9vvijISAVTJpEJtZrse8JDdp0P3FqU';

async function obtenerDatosElemento(pulseId) {
    const query = `
        query {
            items(ids: [${pulseId}]) {
                name
                column_values {
                    id
                    text
                    column {
                        title
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
                    'Content-Type': 'application/json',
                },
            }
        );
        const itemData = response.data.data.items[0]; // Cambia aquí para acceder al primer elemento
        return itemData;
    } catch (error) {
        console.error('Error obteniendo datos del elemento:', error.response ? error.response.data : error.message);
    }
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses en JS son base 0
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

async function enviarDatosAPI(startDate, endDate, comentario, direccion) {
    const data = {
        type_document: 1001,
        start_date: startDate,
        end_date: endDate,
        comment: comentario, // Usando la variable comentario
        ware_house_id: 1718,
        type_document_sii: 33,
        customer_id: 4327931,
        address: direccion, // Usando la variable direccion
        products: [{
            product_id: 5757143,
            price: 1,
            quantity: 1,
            tax_affected: true
        }],
        references: [{
            reference_id: 12345678,
            folio_ref: "string",
            date_ref: startDate,
            razon_ref: "Referencia de prueba",
            rut_otr: "string"
        }]
    };

    try {
        const response = await axios.post('https://api.relbase.cl/api/v1/dtes', data, {
            headers: {
                'accept': 'application/json',
                'Authorization': 'XBKEscqiybHhdkbT5KZ1d4Nh',
                'Company': 'CX67HbYo9xKSaW1YNZ5x2KUV',
                'Content-Type': 'application/json'
            }
        });
        console.log('Respuesta de la API:', response.data);
    } catch (error) {
        console.error('Error al enviar la solicitud a la API:', error.response ? error.response.data : error.message);
    }
}

router.post('/', async(req, res) => {
    const data = req.body;
    if (data.challenge) {
        res.status(200).send({ challenge: data.challenge });
    } else {
        const pulseId = data.event.pulseId;
        try {
            const itemData = await obtenerDatosElemento(pulseId);
            const startDate = formatDate(data.event.triggerTime); // Formato de fecha
            const endDate = formatDate(data.event.triggerTime);
            let direccion = '';
            let comentario = '';
            const direccionCol = itemData.column_values.find(col => col.column && col.column.title === 'Direccion');
            if (direccionCol) {
                direccion = direccionCol.text || '';
            }
            const comentarioCol = itemData.column_values.find(col => col.column && col.column.title === 'Comentario');
            if (comentarioCol) {
                comentario = comentarioCol.text || '';
            }

            const relbaseData = await enviarDatosAPI(startDate, endDate, comentario, direccion);
            res.status(200).send('Webhook recibido');
        } catch (error) {
            console.error('Error procesando la solicitud:', error);
            res.status(500).send('Error procesando la solicitud');
        }
    }
});

module.exports = router;