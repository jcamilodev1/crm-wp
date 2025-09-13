require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Servicios
const Database = require('./database/Database');
const WhatsAppService = require('./services/whatsappService');
const MessageHandler = require('./services/messageHandler');

// Controladores
const WhatsAppController = require('./controllers/whatsappController');
const ContactController = require('./controllers/contactController');
const ConversationController = require('./controllers/conversationController');
const CRMController = require('./controllers/crmController');

// Rutas
const createWhatsAppRoutes = require('./routes/whatsappRoutes');
const createContactRoutes = require('./routes/contactRoutes');
const createConversationRoutes = require('./routes/conversationRoutes');
const createCRMRoutes = require('./routes/crmRoutes');

class CRMServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        
        // Inicializar servicios
        this.database = null;
        this.whatsappService = null;
        this.messageHandler = null;
        
        // Inicializar controladores
        this.whatsappController = null;
        this.contactController = null;
        this.conversationController = null;
        this.crmController = null;
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Iniciando servidor CRM...');
            
            // Configurar middleware
            this.setupMiddleware();
            
            // Inicializar base de datos
            await this.initDatabase();
            
            // Inicializar servicios de WhatsApp
            await this.initWhatsAppServices();
            
            // Configurar rutas
            this.setupRoutes();
            
            // Configurar manejo de errores
            this.setupErrorHandling();
            
            // Iniciar servidor
            this.startServer();
            
        } catch (error) {
            console.error('❌ Error iniciando servidor:', error);
            process.exit(1);
        }
    }

    setupMiddleware() {
        // Seguridad
        this.app.use(helmet());
        
        // CORS
        this.app.use(cors({
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true
        }));
        
        // Parser JSON
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Logging middleware
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    async initDatabase() {
        console.log('📊 Inicializando base de datos...');
        this.database = new Database();
        
        // Esperar a que la base de datos esté lista
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ Base de datos inicializada');
    }

    async initWhatsAppServices() {
        console.log('📱 Inicializando servicios de WhatsApp...');
        
        // Crear servicio de WhatsApp
        this.whatsappService = new WhatsAppService();
        
        // Crear manejador de mensajes
        this.messageHandler = new MessageHandler(this.database, this.whatsappService);
        
        // Crear controladores
        this.whatsappController = new WhatsAppController(this.whatsappService, this.messageHandler);
        this.contactController = new ContactController(this.database);
        this.conversationController = new ConversationController(this.database);
        this.crmController = new CRMController(this.database);
        
        // Inicializar cliente WhatsApp
        await this.whatsappService.initialize();
        
        console.log('✅ Servicios de WhatsApp inicializados');
    }

    setupRoutes() {
        console.log('🛣️ Configurando rutas...');
        
        // Ruta de salud
        this.app.get('/health', (req, res) => {
            res.json({
                success: true,
                message: 'Servidor CRM funcionando correctamente',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // Rutas de la API
        this.app.use('/api/whatsapp', createWhatsAppRoutes(this.whatsappController));
        this.app.use('/api/contacts', createContactRoutes(this.contactController));
        this.app.use('/api/conversations', createConversationRoutes(this.conversationController));
        this.app.use('/api/crm', createCRMRoutes(this.crmController));

        // Ruta para estadísticas generales
        this.app.get('/api/stats', async (req, res) => {
            try {
                const stats = await this.getGeneralStats();
                res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Ruta 404
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Ruta no encontrada'
            });
        });
        
        console.log('✅ Rutas configuradas');
    }

    setupErrorHandling() {
        // Manejo de errores global
        this.app.use((error, req, res, next) => {
            console.error('Error no manejado:', error);
            
            res.status(500).json({
                success: false,
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
            });
        });

        // Manejo de promesas rechazadas
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Promesa rechazada no manejada:', reason);
        });

        // Manejo de excepciones no capturadas
        process.on('uncaughtException', (error) => {
            console.error('Excepción no capturada:', error);
            this.gracefulShutdown();
        });

        // Manejo de señales del sistema
        process.on('SIGTERM', () => {
            console.log('Señal SIGTERM recibida');
            this.gracefulShutdown();
        });

        process.on('SIGINT', () => {
            console.log('Señal SIGINT recibida');
            this.gracefulShutdown();
        });
    }

    startServer() {
        this.server = this.app.listen(this.port, () => {
            console.log(`✅ Servidor corriendo en puerto ${this.port}`);
            console.log(`🌐 Health check: http://localhost:${this.port}/health`);
            console.log(`📡 API base URL: http://localhost:${this.port}/api`);
        });
    }

    async getGeneralStats() {
        try {
            // Estadísticas de la base de datos
            const contactStats = await new Promise((resolve, reject) => {
                this.database.db.get(`
                    SELECT 
                        COUNT(*) as total_contacts,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contacts,
                        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_contacts,
                        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_contacts,
                        COUNT(CASE WHEN is_business = 1 THEN 1 END) as business_contacts
                    FROM contacts
                `, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            const conversationStats = await new Promise((resolve, reject) => {
                this.database.db.get(`
                    SELECT 
                        COUNT(*) as total_conversations,
                        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_conversations
                    FROM conversations
                `, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            const messageStats = await new Promise((resolve, reject) => {
                this.database.db.get(`
                    SELECT 
                        COUNT(*) as total_messages,
                        COUNT(CASE WHEN from_me = 1 THEN 1 END) as sent_messages,
                        COUNT(CASE WHEN from_me = 0 THEN 1 END) as received_messages
                    FROM messages
                    WHERE DATE(timestamp) = DATE('now')
                `, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            // Estado de WhatsApp
            const whatsappStatus = this.whatsappService.getStatus();

            return {
                whatsapp: whatsappStatus,
                contacts: contactStats,
                conversations: conversationStats,
                messages_today: messageStats,
                uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                last_updated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    async gracefulShutdown() {
        console.log('🛑 Iniciando cierre graceful del servidor...');
        
        try {
            // Cerrar servidor HTTP
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(resolve);
                });
                console.log('✅ Servidor HTTP cerrado');
            }

            // Cerrar cliente WhatsApp
            if (this.whatsappService) {
                await this.whatsappService.destroy();
                console.log('✅ Cliente WhatsApp cerrado');
            }

            // Cerrar base de datos
            if (this.database) {
                this.database.close();
                console.log('✅ Base de datos cerrada');
            }

            console.log('✅ Cierre graceful completado');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error durante cierre graceful:', error);
            process.exit(1);
        }
    }
}

// Iniciar servidor
const server = new CRMServer();

module.exports = CRMServer;