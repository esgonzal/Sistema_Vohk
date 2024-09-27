const express = require('express');
const router = express.Router();

// Ruta para procesar el webhook desde Monday.com
router.post('/', (req, res) => {
    // Obtener los datos que llegan del webhook de Monday.com
    const data = req.body;

    // Imprimir los datos para asegurarse de que están llegando correctamente
    console.log('Datos recibidos del webhook:', data);

    // Puedes realizar el procesamiento de datos o enviarlos a una API externa aquí
    // Ejemplo de cómo podrías enviar a otra API o almacenar los datos

    res.status(200).send('Webhook procesado con éxito');
});

module.exports = router;