const express = require('express');
const router = express.Router();

// Ruta para procesar el webhook desde Monday.com
router.post('/', (req, res) => {
    // Obtener los datos que llegan del webhook de Monday.com
    const data = req.body;

    // Imprimir los datos para asegurarse de que están llegando correctamente
    console.log('Datos recibidos del webhook:', data);

});

module.exports = router;