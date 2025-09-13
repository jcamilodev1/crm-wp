const Database = require('./Database');

async function initializeDatabase() {
    console.log('🔧 Inicializando base de datos...');
    
    try {
        const db = new Database();
        
        // Esperar a que las tablas se creen
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('✅ Base de datos inicializada correctamente');
        
        // Opcional: crear algunos datos de prueba
        console.log('📝 Creando datos de ejemplo...');
        
        // Respuestas automáticas de ejemplo
        await new Promise((resolve, reject) => {
            db.db.run(`
                INSERT OR IGNORE INTO auto_responses (trigger_text, response_text, match_type, priority)
                VALUES 
                ('hola', '¡Hola! Bienvenido a nuestro CRM. ¿En qué puedo ayudarte?', 'contains', 1),
                ('gracias', 'De nada, ¡que tengas un excelente día!', 'contains', 1),
                ('horarios', 'Nuestros horarios de atención son de lunes a viernes de 9:00 AM a 6:00 PM', 'contains', 2)
            `, function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        
        console.log('✅ Datos de ejemplo creados');
        
        // Cerrar la conexión
        db.close();
        
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        process.exit(1);
    }
}

// Ejecutar si este archivo se llama directamente
if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;