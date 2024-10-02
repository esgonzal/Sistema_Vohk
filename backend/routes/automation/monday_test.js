const express = require('express');
const axios = require('axios');
const router = express.Router();

// Define tu token de API de Monday.com
const MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjQxODQ0NDM2MSwiYWFpIjoxMSwidWlkIjo2Njg1Nzc0MiwiaWFkIjoiMjAyNC0xMC0wMlQxMzoxNjo1Ny41MTZaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjU3NzE2MjQsInJnbiI6InVzZTEifQ.xSFp7Dl1hEqHj9vvijISAVTJpEJtZrse8JDdp0P3FqU';

async function obtenerDatosElemento(pulseId) {
    const query = `
        query {
            items(ids: [${pulseId}]) {
                name
                column_values {
                    id
                    text
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

        // Imprimir la respuesta de la API para depuración
        console.log('Respuesta de la API de Monday:', response.data);

        const itemData = response.data.data.items[0]; // Cambia aquí para acceder al primer elemento
        return itemData;
    } catch (error) {
        console.error('Error obteniendo datos del elemento:', error.response ? error.response.data : error.message);
    }
}

// Ruta para procesar el webhook desde Monday.com
router.post('/', async(req, res) => {
    const data = req.body;
    if (data.challenge) {
        // Devolver el challenge recibido
        res.status(200).send({ challenge: data.challenge });
    } else {
        // Si no es un challenge, puedes procesar otros datos del webhook aquí
        console.log('Datos recibidos del webhook:', data);
        const pulseId = data.event.pulseId;
        try {
            const itemData = await obtenerDatosElemento(pulseId);
            console.log(itemData);
        } catch (error) {
            console.error('Error procesando la solicitud:', error);
            res.status(500).send('Error procesando la solicitud');
        }
    }
});

module.exports = router;