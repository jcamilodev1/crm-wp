class CRMController {
    constructor(database) {
        this.db = database;
    }

    // Gestión de respuestas automáticas
    getAutoResponses = async (req, res) => {
        try {
            const responses = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT * FROM auto_responses 
                    ORDER BY priority DESC, created_at DESC
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            res.json({
                success: true,
                data: responses
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    createAutoResponse = async (req, res) => {
        try {
            const { trigger_text, response_text, match_type = 'exact', priority = 0 } = req.body;

            if (!trigger_text || !response_text) {
                return res.status(400).json({
                    success: false,
                    error: 'Los campos trigger_text y response_text son requeridos'
                });
            }

            const result = await new Promise((resolve, reject) => {
                this.db.db.run(`
                    INSERT INTO auto_responses (trigger_text, response_text, match_type, priority)
                    VALUES (?, ?, ?, ?)
                `, [trigger_text, response_text, match_type, priority], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });

            res.status(201).json({
                success: true,
                data: { id: result },
                message: 'Respuesta automática creada correctamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    updateAutoResponse = async (req, res) => {
        try {
            const { id } = req.params;
            const { trigger_text, response_text, match_type, priority, is_active } = req.body;

            const updateFields = [];
            const updateValues = [];

            if (trigger_text !== undefined) {
                updateFields.push('trigger_text = ?');
                updateValues.push(trigger_text);
            }
            if (response_text !== undefined) {
                updateFields.push('response_text = ?');
                updateValues.push(response_text);
            }
            if (match_type !== undefined) {
                updateFields.push('match_type = ?');
                updateValues.push(match_type);
            }
            if (priority !== undefined) {
                updateFields.push('priority = ?');
                updateValues.push(priority);
            }
            if (is_active !== undefined) {
                updateFields.push('is_active = ?');
                updateValues.push(is_active ? 1 : 0);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No hay campos para actualizar'
                });
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(id);

            const result = await new Promise((resolve, reject) => {
                this.db.db.run(`
                    UPDATE auto_responses 
                    SET ${updateFields.join(', ')}
                    WHERE id = ?
                `, updateValues, function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });

            if (result === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Respuesta automática no encontrada'
                });
            }

            res.json({
                success: true,
                message: 'Respuesta automática actualizada correctamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    deleteAutoResponse = async (req, res) => {
        try {
            const { id } = req.params;

            const result = await new Promise((resolve, reject) => {
                this.db.db.run(`
                    DELETE FROM auto_responses WHERE id = ?
                `, [id], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });

            if (result === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Respuesta automática no encontrada'
                });
            }

            res.json({
                success: true,
                message: 'Respuesta automática eliminada correctamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Gestión de configuraciones
    getSettings = async (req, res) => {
        try {
            const settings = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT * FROM settings ORDER BY key
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    updateSetting = async (req, res) => {
        try {
            const { key } = req.params;
            const { value } = req.body;

            if (value === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'El campo value es requerido'
                });
            }

            await this.db.setSetting(key, value);

            res.json({
                success: true,
                message: 'Configuración actualizada correctamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Funciones de etiquetado
    addContactTag = async (req, res) => {
        try {
            const { contactId } = req.params;
            const { tag } = req.body;

            if (!tag) {
                return res.status(400).json({
                    success: false,
                    error: 'El campo tag es requerido'
                });
            }

            // Obtener tags actuales del contacto
            const contact = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT tags FROM contacts WHERE id = ?
                `, [contactId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!contact) {
                return res.status(404).json({
                    success: false,
                    error: 'Contacto no encontrado'
                });
            }

            let tags = [];
            try {
                tags = contact.tags ? JSON.parse(contact.tags) : [];
            } catch (e) {
                tags = [];
            }

            // Agregar nuevo tag si no existe
            if (!tags.includes(tag)) {
                tags.push(tag);

                await new Promise((resolve, reject) => {
                    this.db.db.run(`
                        UPDATE contacts 
                        SET tags = ?, updated_at = CURRENT_TIMESTAMP 
                        WHERE id = ?
                    `, [JSON.stringify(tags), contactId], function(err) {
                        if (err) reject(err);
                        else resolve(this.changes);
                    });
                });
            }

            res.json({
                success: true,
                data: { tags },
                message: 'Tag agregado correctamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    removeContactTag = async (req, res) => {
        try {
            const { contactId } = req.params;
            const { tag } = req.body;

            if (!tag) {
                return res.status(400).json({
                    success: false,
                    error: 'El campo tag es requerido'
                });
            }

            // Obtener tags actuales del contacto
            const contact = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT tags FROM contacts WHERE id = ?
                `, [contactId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!contact) {
                return res.status(404).json({
                    success: false,
                    error: 'Contacto no encontrado'
                });
            }

            let tags = [];
            try {
                tags = contact.tags ? JSON.parse(contact.tags) : [];
            } catch (e) {
                tags = [];
            }

            // Remover tag
            tags = tags.filter(t => t !== tag);

            await new Promise((resolve, reject) => {
                this.db.db.run(`
                    UPDATE contacts 
                    SET tags = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [JSON.stringify(tags), contactId], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });

            res.json({
                success: true,
                data: { tags },
                message: 'Tag removido correctamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Reportes y análisis
    getActivityReport = async (req, res) => {
        try {
            const { days = 7 } = req.query;

            const report = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT 
                        DATE(timestamp) as date,
                        COUNT(*) as total_messages,
                        COUNT(CASE WHEN from_me = 1 THEN 1 END) as sent_messages,
                        COUNT(CASE WHEN from_me = 0 THEN 1 END) as received_messages,
                        COUNT(DISTINCT contact_id) as active_contacts
                    FROM messages 
                    WHERE timestamp >= datetime('now', '-${parseInt(days)} days')
                    GROUP BY DATE(timestamp)
                    ORDER BY date DESC
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    getTopContacts = async (req, res) => {
        try {
            const { limit = 10 } = req.query;

            const topContacts = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT 
                        c.id,
                        c.name,
                        c.phone,
                        c.whatsapp_id,
                        COUNT(m.id) as message_count,
                        MAX(m.timestamp) as last_message_date
                    FROM contacts c
                    LEFT JOIN messages m ON c.id = m.contact_id
                    WHERE c.status = 'active'
                    GROUP BY c.id
                    HAVING message_count > 0
                    ORDER BY message_count DESC
                    LIMIT ?
                `, [parseInt(limit)], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            res.json({
                success: true,
                data: topContacts
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Logs de actividad
    getActivityLogs = async (req, res) => {
        try {
            const { page = 1, limit = 50, entity_type } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT * FROM activity_logs
            `;
            const params = [];

            if (entity_type) {
                query += ` WHERE entity_type = ?`;
                params.push(entity_type);
            }

            query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), offset);

            const logs = await new Promise((resolve, reject) => {
                this.db.db.all(query, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            res.json({
                success: true,
                data: logs
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = CRMController;