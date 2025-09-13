class MessageHandler {
    constructor(database, whatsappService, io) {
        this.db = database;
        this.whatsapp = whatsappService;
        this.io = io;
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
        
        // Escuchar actualizaciones de contactos
        this.whatsapp.on('contacts_update', async (contacts) => {
            await this.handleContactsUpdate(contacts);
        });

        // Escuchar sincronización inicial de chats
        this.whatsapp.on('initial_chats_sync', async (chats) => {
            console.log('🔄 Procesando sincronización inicial de chats...');
            await this.handleInitialChatsSync(chats);
        });

        // Escuchar sincronización inicial de contactos
        this.whatsapp.on('initial_contacts_sync', async (contacts) => {
            console.log('🔄 Procesando sincronización inicial de contactos...');
            await this.handleContactsUpdate(contacts);
        });

        // Escuchar cambios en chats
        this.whatsapp.on('chat_updated', async (chat) => {
            await this.handleChatUpdate(chat);
        });

        // Escuchar mensajes editados
        this.whatsapp.on('message_edit', async (message, newBody, prevBody) => {
            await this.handleMessageEdit(message, newBody, prevBody);
        });

        // Escuchar mensajes eliminados
        this.whatsapp.on('message_revoke_everyone', async (message) => {
            await this.handleMessageRevoke(message);
        });

        // Escuchar cuando el usuario está escribiendo
        this.whatsapp.on('change_state', async (state) => {
            this.emitTypingStatus(state);
        });
    }

    // Manejar sincronización inicial de chats
    async handleInitialChatsSync(chats) {
        try {
            console.log(`🔄 Sincronizando ${chats.length} chats iniciales...`);
            
            for (const chat of chats) {
                try {
                    // Procesar cada chat de forma similar a como se hace en whatsappController
                    const contact = await chat.getContact();
                    const contactData = {
                        whatsapp_id: contact.id._serialized,
                        name: contact.name || contact.pushname || contact.formattedName || contact.shortName || null,
                        phone: contact.number || null,
                        profile_pic_url: contact.profilePicUrl || null,
                        is_business: contact.isBusiness || false,
                        status: 'active',
                        first_contact_date: new Date().toISOString(),
                        last_contact_date: new Date().toISOString()
                    };

                    // Buscar o crear contacto
                    let dbContact = await this.db.findContactByWhatsAppId(contact.id._serialized);
                    if (!dbContact) {
                        const contactId = await this.db.createContact(contactData);
                        dbContact = await this.db.findContactByWhatsAppId(contact.id._serialized);
                    }

                    // Crear o actualizar conversación
                    const conversationData = {
                        contact_id: dbContact.id,
                        whatsapp_chat_id: chat.id._serialized,
                        is_group: chat.isGroup || false,
                        status: 'open',
                        last_message_at: chat.timestamp ? new Date(chat.timestamp * 1000).toISOString() : new Date().toISOString()
                    };

                    let conversation = await this.db.findConversationByChatId(chat.id._serialized);
                    if (!conversation) {
                        await this.db.createConversation(conversationData);
                        conversation = await this.db.findConversationByChatId(chat.id._serialized);
                    }

                    // NUEVO: Sincronizar mensajes del chat (últimos 50)
                    await this.syncChatMessages(chat, conversation, dbContact);

                    console.log(`✅ Chat sincronizado: ${contact.name || contact.number}`);
                } catch (error) {
                    console.error(`❌ Error sincronizando chat ${chat.id._serialized}:`, error.message);
                }
            }

            console.log('✅ Sincronización inicial de chats completada');
            
            // Emitir evento para actualizar frontend
            if (this.io) {
                this.io.emit('initial_sync_completed', { 
                    type: 'chats_and_messages', 
                    chats_count: chats.length,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('❌ Error en sincronización inicial de chats:', error);
        }
    }

    // Sincronizar mensajes de un chat específico
    async syncChatMessages(chat, conversation, contact) {
        try {
            console.log(`📨 Sincronizando mensajes del chat: ${contact.name || contact.phone}`);
            
            // Obtener los últimos 20 mensajes del chat (para sincronización inicial)
            const messages = await chat.fetchMessages({ limit: 20 });
            console.log(`📊 ${messages.length} mensajes encontrados en ${contact.name || contact.phone}`);
            
            let syncedCount = 0;
            
            for (const message of messages.reverse()) { // Procesar del más antiguo al más nuevo
                try {
                    // Verificar si el mensaje ya existe
                    const existingMessage = await this.db.findMessageByWhatsAppId(message.id._serialized);
                    if (existingMessage) {
                        continue; // Skip if already exists
                    }

                    // Preparar datos del mensaje
                    const messageData = {
                        whatsapp_message_id: message.id._serialized,
                        conversation_id: conversation.id,
                        contact_id: contact.id,
                        from_me: message.fromMe,
                        message_type: message.type || 'text',
                        content: message.body || '',
                        timestamp: new Date(message.timestamp * 1000).toISOString(),
                        status: 'delivered'
                    };

                    // Procesar media si existe
                    if (message.hasMedia) {
                        try {
                            const mediaInfo = await this.processMessageMedia(message);
                            if (mediaInfo) {
                                messageData.media_url = mediaInfo.url;
                                messageData.media_mimetype = mediaInfo.mimetype;
                                messageData.media_filename = mediaInfo.filename;
                                messageData.media_size = mediaInfo.size;
                            }
                        } catch (mediaError) {
                            console.warn(`⚠️ Error procesando media del mensaje ${message.id._serialized}:`, mediaError.message);
                            // Continuar sin media
                        }
                    }

                    // Guardar mensaje en la base de datos
                    await this.db.createMessage(messageData);
                    syncedCount++;

                } catch (messageError) {
                    console.error(`❌ Error sincronizando mensaje ${message.id._serialized}:`, messageError.message);
                }
            }

            console.log(`✅ ${syncedCount} mensajes sincronizados para ${contact.name || contact.phone}`);
            
        } catch (error) {
            console.error(`❌ Error sincronizando mensajes del chat ${chat.id._serialized}:`, error.message);
        }
    }

    async handleContactsUpdate(contacts) {
        try {
            console.log(`🔄 Actualizando ${contacts.length} contactos`);
            let updatedCount = 0;
            
            for (const contact of contacts) {
                try {
                    // Verificar si el contacto ya existe
                    let dbContact = await this.db.findContactByWhatsAppId(contact.id._serialized);
                    
                    if (dbContact) {
                        // Actualizar contacto existente
                        const contactData = {
                            name: contact.name || contact.pushname || dbContact.name,
                            phone: contact.number || dbContact.phone,
                            is_business: contact.isBusiness || dbContact.is_business,
                            updated_at: new Date().toISOString()
                        };
                        
                        await this.db.updateContact(dbContact.id, contactData);
                        updatedCount++;
                    } else {
                        // Crear nuevo contacto
                        const contactData = {
                            whatsapp_id: contact.id._serialized,
                            name: contact.name || contact.pushname || null,
                            phone: contact.number || null,
                            is_business: contact.isBusiness || false,
                            status: 'active'
                        };
                        
                        await this.db.createContact(contactData);
                        updatedCount++;
                    }
                } catch (error) {
                    console.warn(`⚠️  Error actualizando contacto ${contact.id._serialized}:`, error.message);
                }
            }
            
            console.log(`✅ ${updatedCount}/${contacts.length} contactos actualizados`);
        } catch (error) {
            console.error('Error en actualización de contactos:', error);
        }
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

            // Emitir mensaje en tiempo real
            this.emitNewMessage(message, conversation, contact);

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
                
                // Emitir mensaje enviado en tiempo real
                this.emitNewMessage(message, conversation, contact);
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
            // Obtener información de media
            const mediaInfo = await this.processMessageMedia(message);
            
            const messageData = {
                whatsapp_message_id: message.id._serialized,
                conversation_id: conversationId,
                contact_id: contactId,
                from_me: message.fromMe,
                message_type: this.getMessageType(message),
                content: message.body || (mediaInfo.caption || null),
                media_url: mediaInfo.url,
                timestamp: new Date(message.timestamp * 1000).toISOString(),
                status: 'received',
                reply_to: message.hasQuotedMsg ? message.quotedMsgId : null,
                // Campos adicionales para media
                media_mimetype: mediaInfo.mimetype,
                media_filename: mediaInfo.filename,
                media_size: mediaInfo.size
            };

            await this.db.createMessage(messageData);
            console.log(`💾 Mensaje guardado en BD: ${message.id._serialized} ${mediaInfo.url ? '📎' : '💬'}`);

        } catch (error) {
            console.error('Error guardando mensaje:', error);
            throw error;
        }
    }

    async processMessageMedia(message) {
        const defaultResult = {
            url: null,
            mimetype: null,
            filename: null,
            size: null,
            caption: null
        };

        try {
            if (!message.hasMedia) {
                return defaultResult;
            }

            const media = await message.downloadMedia();
            if (!media) {
                return defaultResult;
            }

            // Crear directorio para media si no existe
            const fs = require('fs');
            const path = require('path');
            const mediaDir = path.join(process.cwd(), 'media', new Date().getFullYear().toString(), 
                                      String(new Date().getMonth() + 1).padStart(2, '0'));
            
            if (!fs.existsSync(mediaDir)) {
                fs.mkdirSync(mediaDir, { recursive: true });
            }

            // Generar nombre de archivo único
            const fileExtension = this.getFileExtension(media.mimetype);
            const fileName = `${message.id._serialized}${fileExtension}`;
            const filePath = path.join(mediaDir, fileName);
            
            // Guardar archivo
            const buffer = Buffer.from(media.data, 'base64');
            fs.writeFileSync(filePath, buffer);
            
            // Retornar información completa
            const relativePath = path.relative(process.cwd(), filePath);
            return {
                url: `/${relativePath.replace(/\\/g, '/')}`,
                mimetype: media.mimetype,
                filename: media.filename || fileName,
                size: buffer.length,
                caption: message.body || null
            };

        } catch (error) {
            console.error('Error procesando media:', error);
            return defaultResult;
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
                
                if (media) {
                    // Crear directorio para media si no existe
                    const fs = require('fs');
                    const path = require('path');
                    const mediaDir = path.join(process.cwd(), 'media', new Date().getFullYear().toString(), 
                                              String(new Date().getMonth() + 1).padStart(2, '0'));
                    
                    if (!fs.existsSync(mediaDir)) {
                        fs.mkdirSync(mediaDir, { recursive: true });
                    }

                    // Generar nombre de archivo único
                    const fileExtension = this.getFileExtension(media.mimetype);
                    const fileName = `${message.id._serialized}${fileExtension}`;
                    const filePath = path.join(mediaDir, fileName);
                    
                    // Guardar archivo
                    fs.writeFileSync(filePath, media.data, 'base64');
                    
                    // Retornar URL relativa
                    const relativePath = path.relative(process.cwd(), filePath);
                    return `/${relativePath.replace(/\\/g, '/')}`;
                }
            }
            return null;
        } catch (error) {
            console.error('Error obteniendo media URL:', error);
            return null;
        }
    }

    getFileExtension(mimetype) {
        const extensions = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'audio/mpeg': '.mp3',
            'audio/mp4': '.m4a',
            'audio/ogg': '.ogg',
            'video/mp4': '.mp4',
            'video/quicktime': '.mov',
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'text/plain': '.txt'
        };
        
        return extensions[mimetype] || '.bin';
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

    // Nuevos métodos para eventos en tiempo real

    async handleChatUpdate(chat) {
        try {
            console.log(`💬 Chat actualizado: ${chat.id._serialized}`);
            
            // Emitir actualización del chat
            if (this.io) {
                this.io.emit('chat_updated', {
                    chatId: chat.id._serialized,
                    name: chat.name,
                    unreadCount: chat.unreadCount,
                    lastMessage: chat.lastMessage,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error manejando actualización de chat:', error);
        }
    }

    async handleMessageEdit(message, newBody, prevBody) {
        try {
            console.log(`✏️ Mensaje editado: ${message.id._serialized}`);
            
            // Actualizar mensaje en la base de datos
            const query = `
                UPDATE messages 
                SET content = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE whatsapp_message_id = ?
            `;
            
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [newBody, message.id._serialized], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });

            // Emitir edición en tiempo real
            if (this.io) {
                this.io.emit('message_edited', {
                    messageId: message.id._serialized,
                    newContent: newBody,
                    previousContent: prevBody,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error manejando edición de mensaje:', error);
        }
    }

    async handleMessageRevoke(message) {
        try {
            console.log(`🗑️ Mensaje eliminado: ${message.id._serialized}`);
            
            // Marcar mensaje como eliminado en la base de datos
            const query = `
                UPDATE messages 
                SET content = '[Mensaje eliminado]', status = 'revoked', updated_at = CURRENT_TIMESTAMP 
                WHERE whatsapp_message_id = ?
            `;
            
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [message.id._serialized], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });

            // Emitir eliminación en tiempo real
            if (this.io) {
                this.io.emit('message_revoked', {
                    messageId: message.id._serialized,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error manejando eliminación de mensaje:', error);
        }
    }

    emitNewMessage(message, conversation, contact) {
        try {
            if (this.io) {
                const messageData = {
                    id: message.id._serialized,
                    conversationId: conversation.id,
                    contactId: contact.id,
                    contactName: contact.name,
                    fromMe: message.fromMe,
                    content: message.body,
                    type: this.getMessageType(message),
                    timestamp: new Date(message.timestamp * 1000).toISOString(),
                    chatId: message.fromMe ? message.to : message.from
                };

                // Emitir nuevo mensaje
                this.io.emit('new_message', messageData);
                
                // Emitir actualización de conversación
                this.io.emit('conversation_updated', {
                    conversationId: conversation.id,
                    lastMessage: message.body,
                    lastMessageDate: messageData.timestamp,
                    unreadCount: message.fromMe ? 0 : 1
                });
            }
        } catch (error) {
            console.error('Error emitiendo nuevo mensaje:', error);
        }
    }

    emitTypingStatus(state) {
        try {
            if (this.io && state && state.chatId) {
                this.io.emit('typing_status', {
                    chatId: state.chatId,
                    isTyping: state.isTyping || false,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error emitiendo estado de escritura:', error);
        }
    }

    // Método para emitir actualizaciones de contactos
    emitContactsUpdate(contacts) {
        try {
            if (this.io) {
                this.io.emit('contacts_updated', {
                    contacts: contacts.map(contact => ({
                        id: contact.whatsapp_id,
                        name: contact.name,
                        phone: contact.phone,
                        isOnline: contact.isOnline || false,
                        lastSeen: contact.lastSeen || null
                    })),
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error emitiendo actualización de contactos:', error);
        }
    }

    // Verificar si un mensaje ya existe en la base de datos
    async checkMessageExists(whatsappMessageId) {
        try {
            const query = `
                SELECT id FROM messages 
                WHERE whatsapp_message_id = ? 
                LIMIT 1
            `;

            return new Promise((resolve, reject) => {
                this.db.db.get(query, [whatsappMessageId], (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                });
            });
        } catch (error) {
            console.error('Error verificando existencia de mensaje:', error);
            return false;
        }
    }

    // Persistir mensaje de tiempo real si no existe
    async persistRealtimeMessage(messageData) {
        try {
            const exists = await this.checkMessageExists(messageData.id);
            if (exists) {
                console.log(`📨 Mensaje ${messageData.id} ya existe en BD`);
                return;
            }

            console.log(`💾 Persistiendo mensaje de tiempo real: ${messageData.id}`);

            // Obtener o crear contacto
            const contact = await this.getOrCreateContactFromRealtime(messageData);
            
            // Obtener o crear conversación
            const conversation = await this.getOrCreateConversationFromRealtime(messageData, contact.id);

            // Crear mensaje en BD
            const dbMessageData = {
                whatsapp_message_id: messageData.id,
                conversation_id: conversation.id,
                contact_id: contact.id,
                from_me: messageData.fromMe,
                message_type: messageData.type || 'text',
                content: messageData.content,
                timestamp: messageData.timestamp,
                status: messageData.fromMe ? 'sent' : 'received'
            };

            await this.db.createMessage(dbMessageData);
            console.log(`✅ Mensaje persistido en BD: ${messageData.id}`);

        } catch (error) {
            console.error('Error persistiendo mensaje de tiempo real:', error);
        }
    }

    // Obtener o crear contacto desde datos de tiempo real
    async getOrCreateContactFromRealtime(messageData) {
        try {
            const chatId = messageData.chatId;
            let contact = await this.db.findContactByWhatsAppId(chatId);

            if (!contact) {
                const contactData = {
                    whatsapp_id: chatId,
                    name: messageData.contactName || null,
                    phone: null, // Se actualizará cuando se sincronice
                    status: 'active'
                };

                const contactDbId = await this.db.createContact(contactData);
                contact = await this.db.findContactByWhatsAppId(chatId);
                console.log(`👤 Nuevo contacto creado desde tiempo real: ${chatId}`);
            }

            return contact;
        } catch (error) {
            console.error('Error obteniendo/creando contacto desde tiempo real:', error);
            throw error;
        }
    }

    // Obtener o crear conversación desde datos de tiempo real
    async getOrCreateConversationFromRealtime(messageData, contactId) {
        try {
            const chatId = messageData.chatId;
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
                console.log(`💬 Nueva conversación creada desde tiempo real: ${chatId}`);
            }

            return conversation;
        } catch (error) {
            console.error('Error obteniendo/creando conversación desde tiempo real:', error);
            throw error;
        }
    }
}

module.exports = MessageHandler;
