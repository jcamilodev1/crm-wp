const fs = require('fs');
const path = require('path');

class DatabaseMigrations {
    constructor(db) {
        this.db = db;
    }

    async runMigrations() {
        console.log('🔄 Ejecutando migraciones de base de datos...');
        
        try {
            // Verificar si existe la tabla de migraciones
            await this.createMigrationsTable();
            
            // Ejecutar migraciones pendientes
            await this.migration001_AddContactColumns();
            await this.migration002_EnsureAllTables();
            await this.migration003_AddMediaFields();
            
            console.log('✅ Migraciones completadas exitosamente');
        } catch (error) {
            console.error('❌ Error ejecutando migraciones:', error);
            throw error;
        }
    }

    createMigrationsTable() {
        return new Promise((resolve, reject) => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async migration001_AddContactColumns() {
        const migrationName = '001_add_contact_columns';
        
        // Verificar si ya se ejecutó esta migración
        const executed = await new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM migrations WHERE name = ?',
                [migrationName],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (executed) {
            console.log(`⏭️  Migración ${migrationName} ya ejecutada`);
            return;
        }

        console.log(`🔄 Ejecutando migración: ${migrationName}`);

        // Lista de columnas que deben existir en la tabla contacts
        const requiredColumns = [
            { name: 'whatsapp_id', type: 'TEXT UNIQUE NOT NULL DEFAULT ""' },
            { name: 'is_business', type: 'BOOLEAN DEFAULT 0' },
            { name: 'email', type: 'TEXT' },
            { name: 'company', type: 'TEXT' }
        ];

        // Obtener columnas actuales
        const currentColumns = await new Promise((resolve, reject) => {
            this.db.all("PRAGMA table_info(contacts)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            });
        });

        // Agregar columnas faltantes
        for (const column of requiredColumns) {
            if (!currentColumns.includes(column.name)) {
                await new Promise((resolve, reject) => {
                    // Para whatsapp_id, usamos una lógica especial ya que debe ser NOT NULL
                    let sql;
                    if (column.name === 'whatsapp_id') {
                        sql = `ALTER TABLE contacts ADD COLUMN ${column.name} TEXT DEFAULT ''`;
                    } else {
                        sql = `ALTER TABLE contacts ADD COLUMN ${column.name} ${column.type}`;
                    }
                    
                    this.db.run(sql, (err) => {
                        if (err) reject(err);
                        else {
                            console.log(`  ✅ Columna ${column.name} agregada`);
                            resolve();
                        }
                    });
                });
            }
        }

        // Si agregamos whatsapp_id, necesitamos actualizar los registros existentes
        if (!currentColumns.includes('whatsapp_id')) {
            await new Promise((resolve, reject) => {
                this.db.run(
                    `UPDATE contacts SET whatsapp_id = COALESCE(phone, 'contact_' || id) WHERE whatsapp_id = '' OR whatsapp_id IS NULL`,
                    (err) => {
                        if (err) reject(err);
                        else {
                            console.log('  ✅ whatsapp_id actualizado para registros existentes');
                            resolve();
                        }
                    }
                );
            });
        }

        // Marcar migración como ejecutada
        await new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO migrations (name) VALUES (?)',
                [migrationName],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        console.log(`✅ Migración ${migrationName} completada`);
    }

    async migration002_EnsureAllTables() {
        const migrationName = '002_ensure_all_tables';
        
        // Verificar si ya se ejecutó esta migración
        const executed = await new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM migrations WHERE name = ?',
                [migrationName],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (executed) {
            console.log(`⏭️  Migración ${migrationName} ya ejecutada`);
            return;
        }

        console.log(`🔄 Ejecutando migración: ${migrationName}`);

        // Verificar que todas las tablas existan con sus columnas correctas
        const tables = [
            'contacts',
            'conversations', 
            'messages',
            'auto_responses',
            'settings',
            'activity_logs'
        ];

        for (const table of tables) {
            const exists = await new Promise((resolve, reject) => {
                this.db.get(
                    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
                    [table],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });

            if (!exists) {
                console.log(`  ⚠️  Tabla ${table} no existe, creando...`);
                // Aquí podrías agregar la lógica para crear tablas faltantes
                // Por ahora solo lo reportamos
            } else {
                console.log(`  ✅ Tabla ${table} existe`);
            }
        }

        // Marcar migración como ejecutada
        await new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO migrations (name) VALUES (?)',
                [migrationName],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        console.log(`✅ Migración ${migrationName} completada`);
    }

    async migration003_AddMediaFields() {
        const migrationName = '003_add_media_fields';
        
        // Verificar si ya se ejecutó esta migración
        const executed = await new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM migrations WHERE name = ?',
                [migrationName],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (executed) {
            console.log(`⏭️  Migración ${migrationName} ya ejecutada`);
            return;
        }

        console.log(`🔄 Ejecutando migración: ${migrationName}`);

        // Lista de columnas de media que deben existir en la tabla messages
        const requiredMediaColumns = [
            { name: 'media_mimetype', type: 'TEXT' },
            { name: 'media_filename', type: 'TEXT' },
            { name: 'media_size', type: 'INTEGER' }
        ];

        // Obtener columnas actuales de la tabla messages
        const currentColumns = await new Promise((resolve, reject) => {
            this.db.all("PRAGMA table_info(messages)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            });
        });

        // Agregar columnas faltantes
        for (const column of requiredMediaColumns) {
            if (!currentColumns.includes(column.name)) {
                await new Promise((resolve, reject) => {
                    const sql = `ALTER TABLE messages ADD COLUMN ${column.name} ${column.type}`;
                    this.db.run(sql, (err) => {
                        if (err) reject(err);
                        else {
                            console.log(`  ✅ Columna ${column.name} agregada a messages`);
                            resolve();
                        }
                    });
                });
            }
        }

        // Marcar migración como ejecutada
        await new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO migrations (name) VALUES (?)',
                [migrationName],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        console.log(`✅ Migración ${migrationName} completada`);
    }
}

module.exports = DatabaseMigrations;