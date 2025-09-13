const Database = require('../database/Database');

class CRMUtils {
    constructor() {
        this.db = new Database();
    }

    // Crear respuesta automática desde línea de comandos
    async createAutoResponse(trigger, response, matchType = 'contains', priority = 1) {
        try {
            const result = await new Promise((resolve, reject) => {
                this.db.db.run(`
                    INSERT INTO auto_responses (trigger_text, response_text, match_type, priority)
                    VALUES (?, ?, ?, ?)
                `, [trigger, response, matchType, priority], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });

            console.log(`✅ Respuesta automática creada con ID: ${result}`);
            return result;
        } catch (error) {
            console.error('❌ Error creando respuesta automática:', error);
            throw error;
        }
    }

    // Listar respuestas automáticas
    async listAutoResponses() {
        try {
            const responses = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT * FROM auto_responses 
                    ORDER BY priority DESC, created_at DESC
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            console.log('\n📋 Respuestas Automáticas:');
            console.log('=' .repeat(50));
            
            responses.forEach(response => {
                console.log(`ID: ${response.id}`);
                console.log(`Trigger: "${response.trigger_text}"`);
                console.log(`Response: "${response.response_text}"`);
                console.log(`Match Type: ${response.match_type}`);
                console.log(`Priority: ${response.priority}`);
                console.log(`Active: ${response.is_active ? 'Yes' : 'No'}`);
                console.log('-'.repeat(30));
            });

            return responses;
        } catch (error) {
            console.error('❌ Error listando respuestas automáticas:', error);
            throw error;
        }
    }

    // Obtener estadísticas del CRM
    async getStats() {
        try {
            const contactStats = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT 
                        COUNT(*) as total_contacts,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contacts,
                        COUNT(CASE WHEN is_business = 1 THEN 1 END) as business_contacts
                    FROM contacts
                `, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            const messageStats = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT 
                        COUNT(*) as total_messages,
                        COUNT(CASE WHEN from_me = 1 THEN 1 END) as sent_messages,
                        COUNT(CASE WHEN from_me = 0 THEN 1 END) as received_messages
                    FROM messages
                `, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            const conversationStats = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT 
                        COUNT(*) as total_conversations,
                        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_conversations
                    FROM conversations
                `, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            console.log('\n📊 Estadísticas del CRM:');
            console.log('=' .repeat(30));
            console.log(`👥 Contactos: ${contactStats.total_contacts} (${contactStats.active_contacts} activos)`);
            console.log(`🏢 Empresas: ${contactStats.business_contacts}`);
            console.log(`💬 Conversaciones: ${conversationStats.total_conversations} (${conversationStats.open_conversations} abiertas)`);
            console.log(`📨 Mensajes: ${messageStats.total_messages} (${messageStats.sent_messages} enviados, ${messageStats.received_messages} recibidos)`);

            return {
                contacts: contactStats,
                messages: messageStats,
                conversations: conversationStats
            };
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    close() {
        this.db.close();
    }
}

// Si se ejecuta directamente
if (require.main === module) {
    const utils = new CRMUtils();
    const command = process.argv[2];

    switch (command) {
        case 'stats':
            utils.getStats().then(() => utils.close());
            break;
        case 'list-responses':
            utils.listAutoResponses().then(() => utils.close());
            break;
        case 'add-response':
            const trigger = process.argv[3];
            const response = process.argv[4];
            const matchType = process.argv[5] || 'contains';
            const priority = parseInt(process.argv[6]) || 1;
            
            if (!trigger || !response) {
                console.log('Uso: node utils/crmUtils.js add-response "trigger" "response" [matchType] [priority]');
                utils.close();
                return;
            }
            
            utils.createAutoResponse(trigger, response, matchType, priority).then(() => utils.close());
            break;
        default:
            console.log('Comandos disponibles:');
            console.log('- stats: Mostrar estadísticas del CRM');
            console.log('- list-responses: Listar respuestas automáticas');
            console.log('- add-response: Agregar nueva respuesta automática');
            utils.close();
    }
}

module.exports = CRMUtils;