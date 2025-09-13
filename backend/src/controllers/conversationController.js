class ConversationController {
    constructor(database) {
        this.db = database;
    }

    // Obtener todas las conversaciones
    getConversations = async (req, res) => {
        try {
            const { page = 1, limit = 20, status = 'open' } = req.query;
            const offset = (page - 1) * limit;

            const conversations = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT 
                        conv.*,
                        c.name as contact_name,
                        c.phone as contact_phone,
                        c.whatsapp_id as contact_whatsapp_id,
                        COUNT(m.id) as message_count,
                        MAX(m.timestamp) as last_message_date,
                        (SELECT content FROM messages WHERE conversation_id = conv.id ORDER BY timestamp DESC LIMIT 1) as last_message_content
                    FROM conversations conv
                    LEFT JOIN contacts c ON conv.contact_id = c.id
                    LEFT JOIN messages m ON conv.id = m.conversation_id
                    WHERE conv.status = ?
                    GROUP BY conv.id
                    ORDER BY last_message_date DESC, conv.updated_at DESC
                    LIMIT ? OFFSET ?
                `, [status, parseInt(limit), offset], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            // Contar total
            const total = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT COUNT(*) as total 
                    FROM conversations 
                    WHERE status = ?
                `, [status], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.total);
                });
            });

            res.json({
                success: true,
                data: {
                    conversations,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener conversación por ID con mensajes
    getConversationById = async (req, res) => {
        try {
            const { id } = req.params;
            const { page = 1, limit = 50 } = req.query;
            const offset = (page - 1) * limit;

            // Obtener información de la conversación
            const conversation = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT 
                        conv.*,
                        c.name as contact_name,
                        c.phone as contact_phone,
                        c.whatsapp_id as contact_whatsapp_id,
                        c.profile_pic_url as contact_profile_pic
                    FROM conversations conv
                    LEFT JOIN contacts c ON conv.contact_id = c.id
                    WHERE conv.id = ?
                `, [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    error: 'Conversación no encontrada'
                });
            }

            // Obtener mensajes de la conversación
            const messages = await new Promise((resolve, reject) => {
                this.db.db.all(`
                    SELECT * FROM messages
                    WHERE conversation_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ? OFFSET ?
                `, [id, parseInt(limit), offset], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            // Contar total de mensajes
            const totalMessages = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT COUNT(*) as total 
                    FROM messages 
                    WHERE conversation_id = ?
                `, [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.total);
                });
            });

            res.json({
                success: true,
                data: {
                    conversation,
                    messages,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: totalMessages,
                        totalPages: Math.ceil(totalMessages / limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Actualizar conversación
    updateConversation = async (req, res) => {
        try {
            const { id } = req.params;
            const { status, assigned_to, priority, notes } = req.body;

            const updateFields = [];
            const updateValues = [];

            if (status !== undefined) {
                updateFields.push('status = ?');
                updateValues.push(status);
            }
            if (assigned_to !== undefined) {
                updateFields.push('assigned_to = ?');
                updateValues.push(assigned_to);
            }
            if (priority !== undefined) {
                updateFields.push('priority = ?');
                updateValues.push(priority);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No hay campos para actualizar'
                });
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(id);

            const query = `
                UPDATE conversations 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `;

            const result = await new Promise((resolve, reject) => {
                this.db.db.run(query, updateValues, function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });

            if (result === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Conversación no encontrada'
                });
            }

            res.json({
                success: true,
                message: 'Conversación actualizada correctamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener estadísticas de conversaciones
    getConversationStats = async (req, res) => {
        try {
            const stats = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT 
                        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_conversations,
                        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_conversations,
                        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_conversations,
                        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_conversations,
                        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_conversations,
                        COUNT(*) as total_conversations
                    FROM conversations
                `, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = ConversationController;