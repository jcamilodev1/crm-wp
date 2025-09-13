const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const EventEmitter = require('events');

class WhatsAppService extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.isReady = false;
        this.qrString = null;
        this.initializeClient();
    }

    initializeClient() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: process.env.WA_SESSION_PATH || './sessions'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Evento cuando se genera el código QR
        this.client.on('qr', async (qr) => {
            console.log('📱 Código QR generado');
            this.qrString = qr;
            
            try {
                // Generar QR como string para mostrar en consola
                const qrString = await qrcode.toString(qr, { type: 'terminal' });
                console.log('Escanea este código QR con tu WhatsApp:');
                console.log(qrString);
                
                this.emit('qr', qr);
            } catch (error) {
                console.error('Error generando QR:', error);
            }
        });

        // Evento cuando el cliente está listo
        this.client.on('ready', () => {
            console.log('✅ Cliente de WhatsApp listo!');
            this.isReady = true;
            this.qrString = null;
            this.emit('ready');
            
            // Iniciar sincronización automática cada 5 minutos
            this.startAutoSync();
        });

        // Evento cuando se autentica
        this.client.on('authenticated', () => {
            console.log('🔐 Autenticado correctamente');
            this.emit('authenticated');
        });

        // Evento cuando falla la autenticación
        this.client.on('auth_failure', (msg) => {
            console.error('❌ Error de autenticación:', msg);
            this.emit('auth_failure', msg);
        });

        // Evento cuando se desconecta
        this.client.on('disconnected', (reason) => {
            console.log('🔌 Desconectado:', reason);
            this.isReady = false;
            this.emit('disconnected', reason);
        });

        // Evento cuando llega un mensaje
        this.client.on('message', async (message) => {
            try {
                console.log(`📨 Mensaje recibido de ${message.from}: ${message.body}`);
                this.emit('message', message);
            } catch (error) {
                console.error('Error procesando mensaje:', error);
            }
        });

        // Evento cuando se crea un mensaje (enviado o recibido)
        this.client.on('message_create', async (message) => {
            this.emit('message_create', message);
        });

        // Evento cuando cambia el estado del mensaje
        this.client.on('message_ack', (message, ack) => {
            this.emit('message_ack', message, ack);
        });

        // Eventos adicionales para mejor sincronización
        this.client.on('message_edit', (message, newBody, prevBody) => {
            console.log(`✏️ Mensaje editado en chat ${message.from}`);
            this.emit('message_edit', message, newBody, prevBody);
        });

        this.client.on('message_revoke_everyone', (message) => {
            console.log(`🗑️ Mensaje eliminado en chat ${message.from}`);
            this.emit('message_revoke_everyone', message);
        });

        this.client.on('message_revoke_me', (message) => {
            console.log(`🗑️ Mensaje eliminado para mí en chat ${message.from}`);
            this.emit('message_revoke_me', message);
        });

        // Eventos de chat
        this.client.on('chat_updated', (chat) => {
            console.log(`💬 Chat actualizado: ${chat.id._serialized}`);
            this.emit('chat_updated', chat);
        });

        this.client.on('chat_removed', (chat) => {
            console.log(`💬 Chat eliminado: ${chat.id._serialized}`);
            this.emit('chat_removed', chat);
        });

        // Eventos de contactos
        this.client.on('contact_changed', (message, oldId, newId, isContact) => {
            console.log(`👤 Contacto cambiado: ${oldId} -> ${newId}`);
            this.emit('contact_changed', message, oldId, newId, isContact);
        });

        // Eventos de estado de presencia
        this.client.on('change_state', (state) => {
            this.emit('change_state', state);
        });

        // Evento cuando alguien está escribiendo
        this.client.on('typing', (chatId, isTyping) => {
            this.emit('typing', chatId, isTyping);
        });

        // Evento de llamadas
        this.client.on('call', (call) => {
            console.log(`📞 Llamada recibida de ${call.from}`);
            this.emit('call', call);
        });

        // Evento de cambio de estado de conexión
        this.client.on('change_battery', (batteryInfo) => {
            this.emit('change_battery', batteryInfo);
        });
    }

    async initialize() {
        try {
            console.log('🚀 Inicializando cliente de WhatsApp...');
            await this.client.initialize();
        } catch (error) {
            console.error('Error inicializando cliente:', error);
            throw error;
        }
    }

    async sendMessage(to, message) {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            const response = await this.client.sendMessage(to, message);
            console.log(`📤 Mensaje enviado a ${to}: ${message}`);
            return response;
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            throw error;
        }
    }

    async getContacts(options = {}) {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            const { 
                page = 1, 
                limit = 50, 
                search = '', 
                onlyMyContacts = true 
            } = options;

            // Obtener todos los contactos primero
            let contacts = await this.client.getContacts();
            
            // Filtrar contactos
            if (onlyMyContacts) {
                contacts = contacts.filter(contact => contact.isMyContact);
            }

            // Aplicar búsqueda si se proporciona
            if (search) {
                const searchLower = search.toLowerCase();
                contacts = contacts.filter(contact => 
                    (contact.name && contact.name.toLowerCase().includes(searchLower)) ||
                    (contact.pushname && contact.pushname.toLowerCase().includes(searchLower)) ||
                    (contact.number && contact.number.includes(search))
                );
            }

            // Aplicar paginación
            const totalContacts = contacts.length;
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedContacts = contacts.slice(startIndex, endIndex);

            return {
                contacts: paginatedContacts,
                pagination: {
                    page,
                    limit,
                    total: totalContacts,
                    totalPages: Math.ceil(totalContacts / limit),
                    hasNextPage: endIndex < totalContacts,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            console.error('Error obteniendo contactos:', error);
            throw error;
        }
    }

    // Método auxiliar para obtener todos los contactos sin paginación
    async getAllContacts() {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            const contacts = await this.client.getContacts();
            return contacts.filter(contact => contact.isMyContact);
        } catch (error) {
            console.error('Error obteniendo contactos:', error);
            throw error;
        }
    }

    async getChats() {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            const chats = await this.client.getChats();
            return chats;
        } catch (error) {
            console.error('Error obteniendo chats:', error);
            throw error;
        }
    }

    async getChatById(chatId) {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            const chat = await this.client.getChatById(chatId);
            return chat;
        } catch (error) {
            console.error('Error obteniendo chat:', error);
            throw error;
        }
    }

    async markChatUnread(chatId) {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            const chat = await this.client.getChatById(chatId);
            await chat.markUnread();
        } catch (error) {
            console.error('Error marcando chat como no leído:', error);
            throw error;
        }
    }

    async getQRCode() {
        if (!this.qrString) {
            return null;
        }
        
        try {
            // Generar código QR como imagen base64
            const qrImage = await qrcode.toDataURL(this.qrString, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                width: 256
            });
            
            return qrImage;
        } catch (error) {
            console.error('Error generando imagen QR:', error);
            return null;
        }
    }

    getStatus() {
        return {
            isReady: this.isReady,
            hasQR: !!this.qrString
        };
    }

    async disconnect() {
        try {
            if (this.client) {
                await this.client.logout();
                console.log('🔌 Cliente de WhatsApp desconectado');
                this.isReady = false;
                this.qrString = null;
            }
        } catch (error) {
            console.error('Error desconectando cliente:', error);
            throw error;
        }
    }

    // Iniciar sincronización automática periódica optimizada
    startAutoSync() {
        console.log('🔄 Iniciando sincronización automática optimizada');
        
        // Sincronización de chats menos frecuente pero más inteligente
        this.chatSyncInterval = setInterval(async () => {
            if (this.isReady) {
                try {
                    console.log('🔄 Sincronización automática de chats iniciada');
                    this.emit('auto_sync_start');
                } catch (error) {
                    console.error('Error en sincronización automática:', error);
                }
            }
        }, 10 * 60 * 1000); // 10 minutos

        // Sincronización de contactos optimizada - solo cambios
        this.contactSyncInterval = setInterval(async () => {
            if (this.isReady) {
                try {
                    // Obtener solo los primeros 100 contactos para verificar cambios
                    const contactsData = await this.getContacts({ limit: 100 });
                    this.emit('contacts_update', contactsData.contacts);
                } catch (error) {
                    console.error('Error obteniendo contactos:', error);
                }
            }
        }, 5 * 60 * 1000); // 5 minutos

        // Verificación de estado cada 30 segundos
        this.statusCheckInterval = setInterval(() => {
            if (this.isReady) {
                this.emit('status_check', this.getStatus());
            }
        }, 30 * 1000); // 30 segundos

        // Sincronización completa de contactos cada hora
        this.fullContactSyncInterval = setInterval(async () => {
            if (this.isReady) {
                try {
                    console.log('🔄 Sincronización completa de contactos');
                    const allContacts = await this.getAllContacts();
                    this.emit('full_contacts_sync', allContacts);
                } catch (error) {
                    console.error('Error en sincronización completa de contactos:', error);
                }
            }
        }, 60 * 60 * 1000); // 1 hora
    }

    // Método para detener la sincronización automática
    stopAutoSync() {
        console.log('🛑 Deteniendo sincronización automática');
        
        if (this.chatSyncInterval) {
            clearInterval(this.chatSyncInterval);
            this.chatSyncInterval = null;
        }
        
        if (this.contactSyncInterval) {
            clearInterval(this.contactSyncInterval);
            this.contactSyncInterval = null;
        }
        
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
        
        if (this.fullContactSyncInterval) {
            clearInterval(this.fullContactSyncInterval);
            this.fullContactSyncInterval = null;
        }
    }

    // Método para sincronización manual inmediata
    async forceSyncNow() {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            console.log('🔄 Forzando sincronización inmediata');
            
            // Sincronizar chats
            this.emit('auto_sync_start');
            
            // Sincronizar contactos
            const contactsData = await this.getContacts();
            this.emit('contacts_update', contactsData.contacts);
            
            console.log('✅ Sincronización forzada completada');
            return { success: true, message: 'Sincronización completada' };
        } catch (error) {
            console.error('Error en sincronización forzada:', error);
            throw error;
        }
    }

    async destroy() {
        // Detener sincronización automática
        this.stopAutoSync();
        
        if (this.client) {
            await this.client.destroy();
            this.isReady = false;
            console.log('🛑 Cliente de WhatsApp destruido');
        }
    }
}

module.exports = WhatsAppService;
