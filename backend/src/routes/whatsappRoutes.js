const express = require('express');
const router = express.Router();

function createWhatsAppRoutes(whatsappController) {
    // Obtener estado del cliente
    router.get('/status', whatsappController.getStatus);

    // Obtener código QR
    router.get('/qr', whatsappController.getQRCode);

    // Inicializar cliente WhatsApp
    router.post('/initialize', whatsappController.initialize);

    // Desconectar cliente WhatsApp
    router.post('/disconnect', whatsappController.disconnect);

    // Enviar mensaje
    router.post('/send-message', whatsappController.sendMessage);

    // Obtener contactos desde WhatsApp
    router.get('/contacts', whatsappController.getContacts);

    // Obtener chats desde WhatsApp
    router.get('/chats', whatsappController.getChats);

    // Sincronizar chats de WhatsApp con la base de datos
    router.post('/sync-chats', whatsappController.syncChats);

    // Obtener estado de sincronización
    router.get('/sync-status', whatsappController.getSyncStatus);

    // Forzar sincronización inmediata
    router.post('/force-sync', whatsappController.forceSync);

    // Obtener contactos con paginación
    router.get('/contacts-paginated', whatsappController.getContactsPaginated);

    return router;
}

module.exports = createWhatsAppRoutes;