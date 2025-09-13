#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configuración de la base de datos
const dbPath = process.env.DB_PATH || './data/crm.db';

console.log('🔧 Iniciando corrección de base de datos...');

// Crear directorio si no existe
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error abriendo base de datos:', err);
        process.exit(1);
    } else {
        console.log('📊 Conectado a la base de datos SQLite');
        fixDatabase();
    }
});

function fixDatabase() {
    console.log('🔍 Verificando estructura de la tabla contacts...');
    
    // Verificar si existe la tabla contacts
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='contacts'", (err, row) => {
        if (err) {
            console.error('❌ Error verificando tabla contacts:', err);
            return;
        }
        
        if (!row) {
            console.log('📝 Tabla contacts no existe, creando tabla completa...');
            createContactsTable();
        } else {
            console.log('✅ Tabla contacts existe, verificando columnas...');
            checkColumns();
        }
    });
}

function createContactsTable() {
    db.run(`
        CREATE TABLE contacts (
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
    `, (err) => {
        if (err) {
            console.error('❌ Error creando tabla contacts:', err);
        } else {
            console.log('✅ Tabla contacts creada exitosamente');
            createOtherTables();
        }
    });
}

function checkColumns() {
    db.all("PRAGMA table_info(contacts)", (err, columns) => {
        if (err) {
            console.error('❌ Error obteniendo información de columnas:', err);
            return;
        }
        
        console.log('📋 Columnas encontradas:');
        columns.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
        });
        
        const hasIsBusiness = columns.some(col => col.name === 'is_business');
        
        if (!hasIsBusiness) {
            console.log('⚠️  Columna is_business no encontrada, agregando...');
            addIsBusinessColumn();
        } else {
            console.log('✅ Columna is_business ya existe');
            verifyOtherTables();
        }
    });
}

function addIsBusinessColumn() {
    db.run("ALTER TABLE contacts ADD COLUMN is_business BOOLEAN DEFAULT 0", (err) => {
        if (err) {
            console.error('❌ Error agregando columna is_business:', err);
        } else {
            console.log('✅ Columna is_business agregada exitosamente');
            verifyOtherTables();
        }
    });
}

function verifyOtherTables() {
    console.log('🔍 Verificando otras tablas...');
    
    const tables = [
        {
            name: 'conversations',
            sql: `CREATE TABLE IF NOT EXISTS conversations (
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
            )`
        },
        {
            name: 'messages',
            sql: `CREATE TABLE IF NOT EXISTS messages (
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
            )`
        },
        {
            name: 'auto_responses',
            sql: `CREATE TABLE IF NOT EXISTS auto_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trigger_text TEXT NOT NULL,
                response_text TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                match_type TEXT DEFAULT 'exact',
                priority INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        }
    ];
    
    let completed = 0;
    tables.forEach(table => {
        db.run(table.sql, (err) => {
            if (err) {
                console.error(`❌ Error verificando tabla ${table.name}:`, err);
            } else {
                console.log(`✅ Tabla ${table.name} verificada`);
            }
            
            completed++;
            if (completed === tables.length) {
                testDatabase();
            }
        });
    });
}

function createOtherTables() {
    verifyOtherTables();
}

function testDatabase() {
    console.log('🧪 Probando consulta de estadísticas...');
    
    db.get(`
        SELECT 
            COUNT(*) as total_contacts,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contacts,
            COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_contacts,
            COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_contacts,
            COUNT(CASE WHEN is_business = 1 THEN 1 END) as business_contacts
        FROM contacts
    `, (err, row) => {
        if (err) {
            console.error('❌ Error en consulta de prueba:', err);
        } else {
            console.log('✅ Consulta de estadísticas funcionando correctamente');
            console.log('📊 Estadísticas actuales:', row);
        }
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error cerrando base de datos:', err);
            } else {
                console.log('✅ Base de datos cerrada');
                console.log('🎉 Corrección de base de datos completada exitosamente');
            }
        });
    });
}

// Manejo de errores y cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Proceso interrumpido');
    db.close();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
    db.close();
    process.exit(1);
});