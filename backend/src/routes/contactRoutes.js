const express = require('express');
const router = express.Router();

function createContactRoutes(contactController) {
    // Obtener todos los contactos con paginación y filtros
    router.get('/', contactController.getContacts);

    // Obtener estadísticas de contactos
    router.get('/stats', contactController.getContactStats);

    // Obtener contacto por ID
    router.get('/:id', contactController.getContactById);

    // Actualizar contacto
    router.put('/:id', contactController.updateContact);

    return router;
}

module.exports = createContactRoutes;