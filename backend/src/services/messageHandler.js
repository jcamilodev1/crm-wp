class MessageHandler {
    constructor(database, whatsappService) {
        this.db = database;
        this.whatsapp = whatsappService;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Escuchar mensajes entrantes
        this.whatsapp.on('message', async (message) => {
            await this.handleIncomingMessage(message);
        });

        // Escuchar mensajes creados (enviados y recibidos)
        this.whatsapp.on('message_create', async (message) => {
            await this.handleMessageCreate(message);
        });

        // Escuchar cambios de estado de mensajes
        this.whatsapp.on('message_ack', async (message, ack) => {
            await this.handleMessageAck(message, ack);
        });
    }

    async handleIncomingMessage(message) {
        try {
            // Solo procesar mensajes que no sean nuestros
            if (message.fromMe) return;

            console.log(`📨 Procesando mensaje entrante de ${message.from}`);

            // Obtener información del contacto
            const contact = await this.getOrCreateContact(message);
            
            // Obtener o crear conversación
            const conversation = await this.getOrCreateConversation(message, contact.id);

            // Guardar el mensaje en la base de datos
            await this.saveMessage(message, conversation.id, contact.id);

            // Verificar respuestas automáticas
            await this.checkAutoResponses(message);

            // Actualizar última actividad del contacto
            await this.updateContactActivity(contact.id);

        } catch (error) {
            console.error('Error procesando mensaje entrante:', error);
        }
    }

    async handleMessageCreate(message) {
        try {
            // Para mensajes enviados por nosotros, solo guardamos en BD
            if (message.fromMe) {
                const contact = await this.getOrCreateContact(message);
                const conversation = await this.getOrCreateConversation(message, contact.id);
                await this.saveMessage(message, conversation.id, contact.id);
            }
        } catch (error) {
            console.error('Error procesando mensaje creado:', error);
        }
    }

    async handleMessageAck(message, ack) {
        try {
            // Actualizar estado del mensaje en la base de datos
            const statusMap = {
                0: 'error',
                1: 'pending',
                2: 'sent',
                3: 'delivered',
                4: 'read'
            };

            const status = statusMap[ack] || 'unknown';
            console.log(`📊 Estado del mensaje ${message.id._serialized}: ${status}`);

            // Aquí podrías actualizar el estado en la base de datos si es necesario
            
        } catch (error) {
            console.error('Error procesando confirmación de mensaje:', error);
        }
    }

    async getOrCreateContact(message) {
        try {
            // Determinar el ID del contacto
            const contactId = message.fromMe ? message.to : message.from;
            
            // Buscar contacto existente
            let contact = await this.db.findContactByWhatsAppId(contactId);

            if (!contact) {
                // Obtener información del contacto desde WhatsApp
                const whatsappContact = await message.getContact();
                
                const contactData = {
                    whatsapp_id: contactId,
                    name: whatsappContact.name || whatsappContact.pushname || null,
                    phone: whatsappContact.number || null,
                    profile_pic_url: await this.getContactProfilePic(whatsappContact),
                    is_business: whatsappContact.isBusiness || false,
                    tags: [],
                    status: 'active'
                };

                const contactDbId = await this.db.createContact(contactData);
                contact = await this.db.findContactByWhatsAppId(contactId);
                
                console.log(`👤 Nuevo contacto creado: ${contactData.name || contactId}`);
            }

            return contact;
        } catch (error) {
            console.error('Error obteniendo/creando contacto:', error);
            throw error;
        }
    }

    async getOrCreateConversation(message, contactId) {
        try {
            const chatId = message.from.includes('@g.us') ? message.from : 
                          (message.fromMe ? message.to : message.from);

            // Buscar conversación existente
            let conversation = await this.db.findConversationByChatId(chatId);

            if (!conversation) {
                const conversationData = {
                    contact_id: contactId,
                    whatsapp_chat_id: chatId,
                    is_group: chatId.includes('@g.us'),
                    status: 'open',
                    priority: 'normal'
                };

                const conversationDbId = await this.db.createConversation(conversationData);
                conversation = await this.db.findConversationByChatId(chatId);
                
                console.log(`💬 Nueva conversación creada: ${chatId}`);
            }

            return conversation;
        } catch (error) {
            console.error('Error obteniendo/creando conversación:', error);
            throw error;
        }
    }

    async saveMessage(message, conversationId, contactId) {
        try {
            const messageData = {
                whatsapp_message_id: message.id._serialized,
                conversation_id: conversationId,
                contact_id: contactId,
                from_me: message.fromMe,
                message_type: this.getMessageType(message),
                content: message.body || null,
                media_url: await this.getMediaUrl(message),
                timestamp: new Date(message.timestamp * 1000).toISOString(),
                status: 'received',
                reply_to: message.hasQuotedMsg ? message.quotedMsgId : null
            };

            await this.db.createMessage(messageData);
            console.log(`💾 Mensaje guardado en BD: ${message.id._serialized}`);

        } catch (error) {
            console.error('Error guardando mensaje:', error);
            throw error;
        }
    }

    async checkAutoResponses(message) {
        try {
            // Verificar si las respuestas automáticas están habilitadas
            const autoResponseEnabled = await this.db.getSetting('auto_response_enabled');
            if (autoResponseEnabled !== 'true') return;

            // Solo responder a mensajes de texto
            if (message.type !== 'chat') return;

            const messageText = message.body.toLowerCase();

            // Buscar respuestas automáticas que coincidan
            const query = `
                SELECT * FROM auto_responses 
                WHERE is_active = 1 
                AND (
                    (match_type = 'exact' AND LOWER(trigger_text) = ?) OR
                    (match_type = 'contains' AND LOWER(?) LIKE '%' || LOWER(trigger_text) || '%')
                )
                ORDER BY priority DESC
                LIMIT 1
            `;

            const autoResponse = await new Promise((resolve, reject) => {
                this.db.db.get(query, [messageText, messageText], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (autoResponse) {
                // Esperar un momento antes de responder para parecer más natural
                setTimeout(async () => {
                    try {
                        await this.whatsapp.sendMessage(message.from, autoResponse.response_text);
                        console.log(`🤖 Respuesta automática enviada: "${autoResponse.response_text}"`);
                    } catch (error) {
                        console.error('Error enviando respuesta automática:', error);
                    }
                }, 1000 + Math.random() * 2000); // Entre 1-3 segundos
            }

        } catch (error) {
            console.error('Error verificando respuestas automáticas:', error);
        }
    }

    async updateContactActivity(contactId) {
        try {
            const query = `
                UPDATE contacts 
                SET last_contact_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;

            await new Promise((resolve, reject) => {
                this.db.db.run(query, [contactId], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });

        } catch (error) {
            console.error('Error actualizando actividad del contacto:', error);
        }
    }

    getMessageType(message) {
        const typeMap = {
            'chat': 'text',
            'image': 'image',
            'audio': 'audio',
            'video': 'video',
            'document': 'document',
            'sticker': 'sticker',
            'location': 'location',
            'vcard': 'contact',
            'multi_vcard': 'contact'
        };

        return typeMap[message.type] || 'unknown';
    }

    async getMediaUrl(message) {
        try {
            if (message.hasMedia) {
                const media = await message.downloadMedia();
                // Aquí podrías guardar el archivo y devolver la URL
                // Por ahora solo devolvemos el tipo de media
                return `media_${message.type}_${message.id._serialized}`;
            }
            return null;
        } catch (error) {
            console.error('Error obteniendo media URL:', error);
            return null;
        }
    }

    async getContactProfilePic(contact) {
        try {
            const profilePicUrl = await contact.getProfilePicUrl();
            return profilePicUrl;
        } catch (error) {
            // Si no se puede obtener la foto de perfil, no es un error crítico
            return null;
        }
    }

    // Método para enviar mensaje programado
    async sendMessage(to, content, options = {}) {
        try {
            const message = await this.whatsapp.sendMessage(to, content);
            
            // Obtener información para guardar en BD
            const contact = await this.getOrCreateContact({
                fromMe: true,
                to: to,
                from: to,
                getContact: async () => {
                    // Obtener contacto desde WhatsApp
                    const whatsappContact = await this.whatsapp.client.getContactById(to);
                    return whatsappContact;
                }
            });

            const conversation = await this.getOrCreateConversation({
                from: to,
                fromMe: true,
                to: to
            }, contact.id);

            // Guardar mensaje enviado
            const messageData = {
                whatsapp_message_id: message.id._serialized,
                conversation_id: conversation.id,
                contact_id: contact.id,
                from_me: true,
                message_type: 'text',
                content: content,
                timestamp: new Date().toISOString(),
                status: 'sent'
            };

            await this.db.createMessage(messageData);

            return message;
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            throw error;
        }
    }
}

module.exports = MessageHandler;