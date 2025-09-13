const express = require('express');
const router = express.Router();

function createConversationRoutes(conversationController) {
    // Obtener todas las conversaciones con paginación
    router.get('/', conversationController.getConversations);

    // Obtener estadísticas de conversaciones
    router.get('/stats', conversationController.getConversationStats);

    // Obtener conversación por ID con mensajes
    router.get('/:id', conversationController.getConversationById);

    // Actualizar conversación
    router.put('/:id', conversationController.updateConversation);

    return router;
}

module.exports = createConversationRoutes;