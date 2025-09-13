#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de la base de datos
const dbPath = process.env.DB_PATH || './data/crm.db';

console.log('🔧 Agregando columnas faltantes a la tabla contacts...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error abriendo base de datos:', err);
        process.exit(1);
    } else {
        console.log('📊 Conectado a la base de datos SQLite');
        addMissingColumns();
    }
});

function addMissingColumns() {
    // Lista de columnas que deben existir
    const requiredColumns = [
        { name: 'whatsapp_id', sql: 'ALTER TABLE contacts ADD COLUMN whatsapp_id TEXT' },
        { name: 'profile_pic_url', sql: 'ALTER TABLE contacts ADD COLUMN profile_pic_url TEXT' },
        { name: 'first_contact_date', sql: 'ALTER TABLE contacts ADD COLUMN first_contact_date DATETIME DEFAULT CURRENT_TIMESTAMP' },
        { name: 'last_contact_date', sql: 'ALTER TABLE contacts ADD COLUMN last_contact_date DATETIME' }
    ];
    
    // Verificar columnas existentes
    db.all("PRAGMA table_info(contacts)", (err, columns) => {
        if (err) {
            console.error('❌ Error obteniendo información de columnas:', err);
            return;
        }
        
        const existingColumns = columns.map(col => col.name);
        console.log('📋 Columnas existentes:', existingColumns);
        
        // Encontrar columnas faltantes
        const missingColumns = requiredColumns.filter(req => !existingColumns.includes(req.name));
        
        if (missingColumns.length === 0) {
            console.log('✅ Todas las columnas requeridas ya existen');
            updateUniqueConstraint();
            return;
        }
        
        console.log('⚠️  Columnas faltantes:', missingColumns.map(col => col.name));
        
        // Agregar columnas faltantes una por una
        let completed = 0;
        missingColumns.forEach(column => {
            db.run(column.sql, (err) => {
                if (err) {
                    console.error(`❌ Error agregando columna ${column.name}:`, err);
                } else {
                    console.log(`✅ Columna ${column.name} agregada exitosamente`);
                }
                
                completed++;
                if (completed === missingColumns.length) {
                    updateUniqueConstraint();
                }
            });
        });
    });
}

function updateUniqueConstraint() {
    console.log('🔧 Actualizando restricciones...');
    
    // Como SQLite no permite agregar UNIQUE constraint fácilmente a una columna existente,
    // vamos a crear un índice único
    db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_whatsapp_id ON contacts(whatsapp_id)", (err) => {
        if (err) {
            console.log('⚠️  Índice único ya existe o hubo un problema:', err.message);
        } else {
            console.log('✅ Índice único para whatsapp_id creado');
        }
        
        testFinalDatabase();
    });
}

function testFinalDatabase() {
    console.log('🧪 Verificación final...');
    
    db.all("PRAGMA table_info(contacts)", (err, columns) => {
        if (err) {
            console.error('❌ Error en verificación final:', err);
            return;
        }
        
        console.log('📋 Estructura final de la tabla contacts:');
        columns.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
        });
        
        // Probar consulta de estadísticas
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
                    console.log('🎉 Actualización completada exitosamente');
                }
            });
        });
    });
}

// Manejo de errores
process.on('SIGINT', () => {
    console.log('\n🛑 Proceso interrumpido');
    db.close();
    process.exit(0);
});