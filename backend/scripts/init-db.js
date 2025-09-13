#!/usr/bin/env node

/**
 * Script de inicialización de la base de datos
 * Este script crea la base de datos SQLite y las tablas necesarias
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Configuración
const DB_PATH = process.env.DB_PATH || './data/crm.db';
const DATA_DIR = path.dirname(DB_PATH);

console.log('🚀 Iniciando configuración de la base de datos...');

// Crear directorio data si no existe
if (!fs.existsSync(DATA_DIR)) {
  console.log(`📁 Creando directorio: ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Crear directorio sessions si no existe
const SESSIONS_DIR = process.env.WA_SESSION_PATH || './sessions';
if (!fs.existsSync(SESSIONS_DIR)) {
  console.log(`📁 Creando directorio: ${SESSIONS_DIR}`);
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

try {
  // Crear conexión a la base de datos
  console.log(`🗄️ Conectando a la base de datos: ${DB_PATH}`);
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error al conectar con la base de datos:', err);
      process.exit(1);
    }
  });

  // Configurar WAL mode para mejor rendimiento
  db.serialize(() => {
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA foreign_keys = ON;');

    console.log('📋 Creando tablas...');

    // Tabla de contactos
    db.run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        email TEXT,
        status TEXT DEFAULT 'active',
        tags TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de conversaciones
    db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
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
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
      )
    `);

    // Tabla de mensajes
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
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
        FOREIGN KEY (conversation_id) REFERENCES conversations(id),
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
      )
    `);

    // Tabla de configuración
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de respuestas automáticas
    db.run(`
      CREATE TABLE IF NOT EXISTS auto_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trigger_text TEXT NOT NULL,
        response_text TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        match_type TEXT DEFAULT 'exact',
        priority INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de logs
    db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear índices para mejor rendimiento
    console.log('🔍 Creando índices...');
    
    db.run('CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);');
    db.run('CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);');
    db.run('CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_chat_id ON conversations(whatsapp_chat_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id ON messages(whatsapp_message_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);');
    db.run('CREATE INDEX IF NOT EXISTS idx_auto_responses_trigger ON auto_responses(trigger_text);');
    db.run('CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);');
    db.run('CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);');

    // Insertar configuraciones por defecto si no existen
    console.log('⚙️ Configurando valores por defecto...');
    
    const defaultSettings = [
      ['app_name', 'CRM WhatsApp', 'Nombre de la aplicación'],
      ['welcome_message', '¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?', 'Mensaje de bienvenida automático'],
      ['auto_response_enabled', 'false', 'Activar respuestas automáticas'],
      ['business_hours_start', '09:00', 'Hora de inicio del horario comercial'],
      ['business_hours_end', '18:00', 'Hora de fin del horario comercial'],
      ['timezone', 'America/Bogota', 'Zona horaria']
    ];

    defaultSettings.forEach(([key, value, description]) => {
      db.run(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`, 
        [key, value, description]);
    });

    // Insertar algunas respuestas automáticas de ejemplo
    const autoResponses = [
      ['hola', '¡Hola! 👋 Gracias por contactarnos. ¿En qué podemos ayudarte?', 1, 'contains', 1],
      ['horario', 'Nuestros horarios de atención son de Lunes a Viernes de 9:00 AM a 6:00 PM 🕘', 1, 'contains', 2],
      ['info', 'Para más información, puedes visitar nuestro sitio web o contactar a nuestro equipo de soporte.', 1, 'contains', 3]
    ];

    autoResponses.forEach(([trigger, response, active, match_type, priority]) => {
      db.run(`INSERT OR IGNORE INTO auto_responses (trigger_text, response_text, is_active, match_type, priority) VALUES (?, ?, ?, ?, ?)`, 
        [trigger, response, active, match_type, priority]);
    });

    console.log('✅ Base de datos inicializada correctamente!');
    console.log(`📊 Ubicación: ${path.resolve(DB_PATH)}`);
    
    // Mostrar estadísticas
    db.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'", (err, row) => {
      if (!err) {
        console.log(`📋 Tablas creadas: ${row.count}`);
      }
      
      db.close((err) => {
        if (err) {
          console.error('❌ Error al cerrar la base de datos:', err);
        } else {
          console.log('🎉 ¡Configuración completada exitosamente!');
        }
      });
    });
  });

} catch (error) {
  console.error('❌ Error al inicializar la base de datos:', error);
  process.exit(1);
}