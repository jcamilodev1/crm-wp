const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DB_PATH || './data/crm.db';
        this.init();
    }

    init() {
        // Crear directorio si no existe
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Error abriendo base de datos:', err);
            } else {
                console.log('📊 Conectado a la base de datos SQLite');
                this.createTables();
            }
        });
    }

    createTables() {
        // Tabla de contactos
        this.db.run(`
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                whatsapp_id TEXT UNIQUE NOT NULL,
                name TEXT,
                phone TEXT,
                profile_pic_url TEXT,
                is_business BOOLEAN DEFAULT 0,
                tags TEXT, -- JSON array de tags
                notes TEXT,
                status TEXT DEFAULT 'active', -- active, blocked, archived
                first_contact_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_contact_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de conversaciones
        this.db.run(`
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id INTEGER,
                whatsapp_chat_id TEXT UNIQUE NOT NULL,
                is_group BOOLEAN DEFAULT 0,
                status TEXT DEFAULT 'open', -- open, closed, pending
                assigned_to TEXT, -- Usuario asignado
                priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
                last_message_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (contact_id) REFERENCES contacts (id)
            )
        `);

        // Tabla de mensajes
        this.db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                whatsapp_message_id TEXT UNIQUE NOT NULL,
                conversation_id INTEGER,
                contact_id INTEGER,
                from_me BOOLEAN NOT NULL,
                message_type TEXT NOT NULL, -- text, image, audio, video, document, etc.
                content TEXT, -- Contenido del mensaje
                media_url TEXT, -- URL del archivo multimedia
                timestamp DATETIME NOT NULL,
                status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
                is_starred BOOLEAN DEFAULT 0,
                reply_to TEXT, -- ID del mensaje al que responde
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id),
                FOREIGN KEY (contact_id) REFERENCES contacts (id)
            )
        `);

        // Tabla de respuestas automáticas
        this.db.run(`
            CREATE TABLE IF NOT EXISTS auto_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trigger_text TEXT NOT NULL,
                response_text TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                match_type TEXT DEFAULT 'exact', -- exact, contains, regex
                priority INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de logs de actividad
        this.db.run(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL, -- contact, conversation, message
                entity_id INTEGER NOT NULL,
                action TEXT NOT NULL, -- created, updated, deleted, sent, received
                details TEXT, -- JSON con detalles adicionales
                user_id TEXT, -- Usuario que realizó la acción
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de configuraciones
        this.db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insertar configuraciones por defecto
        this.insertDefaultSettings();

        console.log('✅ Tablas de base de datos creadas');
    }

    insertDefaultSettings() {
        const defaultSettings = [
            {
                key: 'auto_response_enabled',
                value: 'true',
                description: 'Habilitar respuestas automáticas'
            },
            {
                key: 'business_hours_start',
                value: '09:00',
                description: 'Hora de inicio de atención'
            },
            {
                key: 'business_hours_end',
                value: '18:00',
                description: 'Hora de fin de atención'
            },
            {
                key: 'welcome_message',
                value: '¡Hola! Gracias por contactarnos. Te responderemos pronto.',
                description: 'Mensaje de bienvenida automático'
            }
        ];

        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO settings (key, value, description) 
            VALUES (?, ?, ?)
        `);

        defaultSettings.forEach(setting => {
            stmt.run(setting.key, setting.value, setting.description);
        });

        stmt.finalize();
    }

    // Métodos para contactos
    async createContact(contactData) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO contacts 
                (whatsapp_id, name, phone, profile_pic_url, is_business, tags, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                contactData.whatsapp_id,
                contactData.name || null,
                contactData.phone || null,
                contactData.profile_pic_url || null,
                contactData.is_business || 0,
                JSON.stringify(contactData.tags || []),
                contactData.notes || null,
                contactData.status || 'active'
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            
            stmt.finalize();
        });
    }

    async findContactByWhatsAppId(whatsappId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM contacts WHERE whatsapp_id = ?',
                [whatsappId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        if (row && row.tags) {
                            try {
                                row.tags = JSON.parse(row.tags);
                            } catch (e) {
                                row.tags = [];
                            }
                        }
                        resolve(row);
                    }
                }
            );
        });
    }

    // Métodos para conversaciones
    async createConversation(conversationData) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO conversations 
                (contact_id, whatsapp_chat_id, is_group, status, assigned_to, priority)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                conversationData.contact_id,
                conversationData.whatsapp_chat_id,
                conversationData.is_group || 0,
                conversationData.status || 'open',
                conversationData.assigned_to || null,
                conversationData.priority || 'normal'
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            
            stmt.finalize();
        });
    }

    async findConversationByChatId(chatId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM conversations WHERE whatsapp_chat_id = ?',
                [chatId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    // Métodos para mensajes
    async createMessage(messageData) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO messages 
                (whatsapp_message_id, conversation_id, contact_id, from_me, message_type, 
                 content, media_url, timestamp, status, reply_to)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                messageData.whatsapp_message_id,
                messageData.conversation_id,
                messageData.contact_id,
                messageData.from_me ? 1 : 0,
                messageData.message_type,
                messageData.content || null,
                messageData.media_url || null,
                messageData.timestamp,
                messageData.status || 'sent',
                messageData.reply_to || null
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            
            stmt.finalize();
        });
    }

    async getMessagesByConversation(conversationId, limit = 50, offset = 0) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM messages 
                 WHERE conversation_id = ? 
                 ORDER BY timestamp DESC 
                 LIMIT ? OFFSET ?`,
                [conversationId, limit, offset],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    // Método para obtener configuraciones
    async getSetting(key) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT value FROM settings WHERE key = ?',
                [key],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row ? row.value : null);
                    }
                }
            );
        });
    }

    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO settings (key, value, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);
            
            stmt.run([key, value], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
            
            stmt.finalize();
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error cerrando base de datos:', err);
                } else {
                    console.log('🔐 Base de datos cerrada');
                }
            });
        }
    }
}

module.exports = Database;