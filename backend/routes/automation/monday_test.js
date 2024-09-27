const express = require('express');
const router = express.Router();

// Ruta para procesar el webhook desde Monday.com
router.post('/', (req, res) => {
    // Obtener los datos que llegan del webhook de Monday.com
    const data = req.body;

    // Imprimir los datos para asegurarse de que están llegando correctamente
    console.log('Datos recibidos del webhook:', data);

    // Verificar si el webhook es un challenge y devolverlo en la respuesta
    if (data.challenge) {
        // Devolver el challenge recibido
        res.status(200).send({ challenge: data.challenge });
    } else {
        // Si no es un challenge, puedes procesar otros datos del webhook aquí
        res.status(200).send('Webhook procesado con éxito');
    }
});

module.exports = router;