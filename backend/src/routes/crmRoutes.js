const express = require('express');
const router = express.Router();

function createCRMRoutes(crmController) {
    // Gestión de respuestas automáticas
    router.get('/auto-responses', crmController.getAutoResponses);
    router.post('/auto-responses', crmController.createAutoResponse);
    router.put('/auto-responses/:id', crmController.updateAutoResponse);
    router.delete('/auto-responses/:id', crmController.deleteAutoResponse);

    // Gestión de configuraciones
    router.get('/settings', crmController.getSettings);
    router.put('/settings/:key', crmController.updateSetting);

    // Gestión de tags
    router.post('/contacts/:contactId/tags', crmController.addContactTag);
    router.delete('/contacts/:contactId/tags', crmController.removeContactTag);

    // Reportes y análisis
    router.get('/reports/activity', crmController.getActivityReport);
    router.get('/reports/top-contacts', crmController.getTopContacts);
    
    // Logs de actividad
    router.get('/logs', crmController.getActivityLogs);

    return router;
}

module.exports = createCRMRoutes;