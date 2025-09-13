class WhatsAppController {
    constructor(whatsappService, messageHandler) {
        this.whatsapp = whatsappService;
        this.messageHandler = messageHandler;
        this.syncStatus = {
            isRunning: false,
            progress: 0,
            totalChats: 0,
            syncedChats: 0,
            errors: [],
            startTime: null,
            endTime: null
        };
    }

    // Obtener estado del cliente WhatsApp
    getStatus = (req, res) => {
        try {
            const status = this.whatsapp.getStatus();
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener código QR
    getQRCode = async (req, res) => {
        try {
            const qr = await this.whatsapp.getQRCode();
            if (qr) {
                res.json({
                    success: true,
                    data: { qr }
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'No hay código QR disponible'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Enviar mensaje
    sendMessage = async (req, res) => {
        try {
            const { to, message } = req.body;

            if (!to || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'Los campos "to" y "message" son requeridos'
                });
            }

            const result = await this.messageHandler.sendMessage(to, message);
            
            res.json({
                success: true,
                data: {
                    id: result.id._serialized,
                    to: result.to,
                    message: message,
                    timestamp: result.timestamp
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Inicializar cliente WhatsApp
    initialize = async (req, res) => {
        try {
            await this.whatsapp.initialize();
            res.json({
                success: true,
                message: 'Cliente WhatsApp inicializado'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Desconectar cliente WhatsApp
    disconnect = async (req, res) => {
        try {
            await this.whatsapp.disconnect();
            res.json({
                success: true,
                message: 'Cliente WhatsApp desconectado'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener contactos desde WhatsApp
    getContacts = async (req, res) => {
        try {
            const contacts = await this.whatsapp.getContacts();
            
            res.json({
                success: true,
                data: contacts.map(contact => ({
                    id: contact.id._serialized,
                    name: contact.name || contact.pushname,
                    number: contact.number,
                    isMyContact: contact.isMyContact,
                    isBlocked: contact.isBlocked,
                    isBusiness: contact.isBusiness
                }))
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener chats
    getChats = async (req, res) => {
        try {
            const chats = await this.whatsapp.getChats();
            
            res.json({
                success: true,
                data: chats.map(chat => ({
                    id: chat.id._serialized,
                    name: chat.name,
                    isGroup: chat.isGroup,
                    isReadOnly: chat.isReadOnly,
                    unreadCount: chat.unreadCount,
                    timestamp: chat.timestamp,
                    archived: chat.archived,
                    pinned: chat.pinned,
                    isMuted: chat.isMuted
                }))
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Sincronizar chats de WhatsApp con la base de datos
    syncChats = async (req, res) => {
        try {
            const { batchSize = 10, delay = 1000 } = req.query;
            const chats = await this.whatsapp.getChats();
            const individualChats = chats.filter(chat => !chat.isGroup);
            
            // Responder inmediatamente con el estado inicial
            res.json({
                success: true,
                data: {
                    message: `Iniciando sincronización de ${individualChats.length} chats en lotes de ${batchSize}`,
                    totalChats: individualChats.length,
                    batchSize: parseInt(batchSize),
                    status: 'started'
                }
            });

            // Procesar en segundo plano
            this.processChatsBatch(individualChats, parseInt(batchSize), parseInt(delay));

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Procesar chats en lotes de manera asíncrona
    async processChatsBatch(chats, batchSize, delay) {
        console.log(`🔄 Iniciando sincronización de ${chats.length} chats en lotes de ${batchSize}`);
        
        // Actualizar estado inicial
        this.syncStatus = {
            isRunning: true,
            progress: 0,
            totalChats: chats.length,
            syncedChats: 0,
            errors: [],
            startTime: new Date().toISOString(),
            endTime: null
        };
        
        let syncedCount = 0;
        let errors = [];
        const totalBatches = Math.ceil(chats.length / batchSize);

        for (let i = 0; i < chats.length; i += batchSize) {
            const batch = chats.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            
            console.log(`📦 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} chats)`);
            
            // Procesar el lote actual en paralelo
            const batchPromises = batch.map(async (chat) => {
                try {
                    return await this.syncSingleChat(chat);
                } catch (error) {
                    console.error(`❌ Error sincronizando chat ${chat.id._serialized}:`, error.message);
                    return {
                        chatId: chat.id._serialized,
                        success: false,
                        error: error.message
                    };
                }
            });

            // Esperar a que termine el lote actual
            const batchResults = await Promise.allSettled(batchPromises);
            
            // Contar resultados del lote
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value.success) {
                    syncedCount++;
                } else {
                    const chat = batch[index];
                    errors.push({
                        chatId: chat.id._serialized,
                        error: result.status === 'rejected' ? result.reason : result.value.error
                    });
                }
            });

            // Actualizar progreso
            this.syncStatus.syncedChats = syncedCount;
            this.syncStatus.progress = Math.round((syncedCount / chats.length) * 100);
            this.syncStatus.errors = errors;

            console.log(`✅ Lote ${batchNumber}/${totalBatches} completado. Total sincronizados: ${syncedCount}`);
            
            // Esperar antes del siguiente lote (para no sobrecargar)
            if (i + batchSize < chats.length) {
                console.log(`⏱️  Esperando ${delay}ms antes del siguiente lote...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // Finalizar estado
        this.syncStatus.isRunning = false;
        this.syncStatus.endTime = new Date().toISOString();
        this.syncStatus.progress = 100;

        console.log(`🎉 Sincronización completada! ${syncedCount}/${chats.length} chats sincronizados exitosamente`);
        
        if (errors.length > 0) {
            console.log(`⚠️  ${errors.length} errores encontrados:`, errors);
        }

        // Aquí podrías emitir un evento o actualizar el estado en tiempo real
        // Por ejemplo, usando WebSockets o Server-Sent Events
    }

    // Sincronizar un chat individual
    async syncSingleChat(chat) {
        try {
            // Obtener contacto
            const contact = await chat.getContact();
            
            // Crear o actualizar contacto en la base de datos
            let dbContact = await this.messageHandler.getOrCreateContact({
                from: chat.id._serialized,
                fromMe: false
            });

            // Crear o actualizar conversación
            const conversation = await this.messageHandler.getOrCreateConversation({
                from: chat.id._serialized
            }, dbContact.id);

            // Obtener mensajes del chat (últimos 20 para no sobrecargar)
            const messages = await chat.fetchMessages({ limit: 20 });
            
            let messageCount = 0;
            for (const message of messages) {
                try {
                    await this.messageHandler.saveMessage(message, conversation.id, dbContact.id);
                    messageCount++;
                } catch (msgError) {
                    console.warn(`⚠️  Error guardando mensaje en chat ${chat.id._serialized}:`, msgError.message);
                }
            }

            return {
                chatId: chat.id._serialized,
                success: true,
                messagesProcessed: messageCount
            };

        } catch (error) {
            throw new Error(`Error procesando chat ${chat.id._serialized}: ${error.message}`);
        }
    }

    // Obtener estado de la sincronización
    getSyncStatus = async (req, res) => {
        try {
            res.json({
                success: true,
                data: this.syncStatus
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = WhatsAppController;