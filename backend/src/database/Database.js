const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const DatabaseMigrations = require('./migrations');

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

        this.db = new sqlite3.Database(this.dbPath, async (err) => {
            if (err) {
                console.error('Error abriendo base de datos:', err);
            } else {
                console.log('📊 Conectado a la base de datos SQLite');
                await this.createTables();
                await this.runMigrations();
            }
        });
    }

    async createTables() {
        console.log('📋 Creando/verificando tablas de la base de datos...');
        
        const tables = [
            // Tabla de contactos
            `CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                whatsapp_id TEXT,
                name TEXT,
                phone TEXT,
                profile_pic_url TEXT,
                is_business BOOLEAN DEFAULT 0,
                tags TEXT,
                notes TEXT,
                status TEXT DEFAULT 'active',
                first_contact_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_contact_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Tabla de conversaciones
            `CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id INTEGER,
                whatsapp_chat_id TEXT UNIQUE NOT NULL,
                is_group BOOLEAN DEFAULT 0,
                status TEXT DEFAULT 'open',
                assigned_to TEXT,
                priority TEXT DEFAULT 'normal',
                last_message_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (contact_id) REFERENCES contacts (id)
            )`,
            
            // Tabla de mensajes
            `CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                whatsapp_message_id TEXT UNIQUE NOT NULL,
                conversation_id INTEGER,
                contact_id INTEGER,
                from_me BOOLEAN NOT NULL,
                message_type TEXT NOT NULL,
                content TEXT,
                media_url TEXT,
                timestamp DATETIME NOT NULL,
                status TEXT DEFAULT 'sent',
                is_starred BOOLEAN DEFAULT 0,
                reply_to TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id),
                FOREIGN KEY (contact_id) REFERENCES contacts (id)
            )`,
            
            // Tabla de respuestas automáticas
            `CREATE TABLE IF NOT EXISTS auto_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trigger_text TEXT NOT NULL,
                response_text TEXT NOT NULL,
                match_type TEXT DEFAULT 'exact',
                is_active BOOLEAN DEFAULT 1,
                priority INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Tabla de configuraciones
            `CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Tabla de logs de actividad
            `CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id INTEGER,
                old_values TEXT,
                new_values TEXT,
                user_id TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        // Ejecutar todas las consultas de creación de tablas
        for (let i = 0; i < tables.length; i++) {
            await new Promise((resolve, reject) => {
                this.db.run(tables[i], (err) => {
                    if (err) {
                        console.error(`❌ Error creando tabla ${i + 1}:`, err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        }
        
        console.log('✅ Todas las tablas creadas/verificadas exitosamente');
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

    // Método para actualizar contacto
    async updateContact(id, data) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];
            
            // Construir campos y valores dinámicamente
            for (const [key, value] of Object.entries(data)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
            
            // Agregar ID al final para la cláusula WHERE
            values.push(id);
            
            const query = `
                UPDATE contacts 
                SET ${fields.join(', ')}
                WHERE id = ?
            `;
            
            this.db.run(query, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    async runMigrations() {
        try {
            const migrations = new DatabaseMigrations(this.db);
            await migrations.runMigrations();
        } catch (error) {
            console.error('❌ Error ejecutando migraciones:', error);
            throw error;
        }
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
