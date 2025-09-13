class ContactController {
    constructor(database) {
        this.db = database;
    }

    // Obtener todos los contactos con paginación
    getContacts = async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', status = 'active' } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT c.*, 
                       COUNT(m.id) as message_count,
                       MAX(m.timestamp) as last_message_date
                FROM contacts c
                LEFT JOIN messages m ON c.id = m.contact_id
                WHERE c.status = ?
            `;
            const params = [status];

            if (search) {
                query += ` AND (c.name LIKE ? OR c.phone LIKE ?)`;
                params.push(`%${search}%`, `%${search}%`);
            }

            query += ` 
                GROUP BY c.id
                ORDER BY last_message_date DESC, c.updated_at DESC
                LIMIT ? OFFSET ?
            `;
            params.push(parseInt(limit), offset);

            const contacts = await new Promise((resolve, reject) => {
                this.db.db.all(query, params, (err, rows) => {
                    if (err) reject(err);
                    else {
                        // Parsear tags JSON
                        const processedRows = rows.map(row => ({
                            ...row,
                            tags: row.tags ? JSON.parse(row.tags) : []
                        }));
                        resolve(processedRows);
                    }
                });
            });

            // Contar total de contactos
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM contacts 
                WHERE status = ?
                ${search ? ' AND (name LIKE ? OR phone LIKE ?)' : ''}
            `;
            const countParams = search ? [status, `%${search}%`, `%${search}%`] : [status];

            const total = await new Promise((resolve, reject) => {
                this.db.db.get(countQuery, countParams, (err, row) => {
                    if (err) reject(err);
                    else resolve(row.total);
                });
            });

            res.json({
                success: true,
                data: {
                    contacts,
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

    // Obtener contacto por ID
    getContactById = async (req, res) => {
        try {
            const { id } = req.params;

            const contact = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT c.*, 
                           COUNT(m.id) as message_count,
                           MAX(m.timestamp) as last_message_date
                    FROM contacts c
                    LEFT JOIN messages m ON c.id = m.contact_id
                    WHERE c.id = ?
                    GROUP BY c.id
                `, [id], (err, row) => {
                    if (err) reject(err);
                    else {
                        if (row && row.tags) {
                            row.tags = JSON.parse(row.tags);
                        }
                        resolve(row);
                    }
                });
            });

            if (!contact) {
                return res.status(404).json({
                    success: false,
                    error: 'Contacto no encontrado'
                });
            }

            res.json({
                success: true,
                data: contact
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Actualizar contacto
    updateContact = async (req, res) => {
        try {
            const { id } = req.params;
            const { name, notes, tags, status } = req.body;

            const updateFields = [];
            const updateValues = [];

            if (name !== undefined) {
                updateFields.push('name = ?');
                updateValues.push(name);
            }
            if (notes !== undefined) {
                updateFields.push('notes = ?');
                updateValues.push(notes);
            }
            if (tags !== undefined) {
                updateFields.push('tags = ?');
                updateValues.push(JSON.stringify(tags));
            }
            if (status !== undefined) {
                updateFields.push('status = ?');
                updateValues.push(status);
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
                UPDATE contacts 
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
                    error: 'Contacto no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Contacto actualizado correctamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener estadísticas de contactos
    getContactStats = async (req, res) => {
        try {
            const stats = await new Promise((resolve, reject) => {
                this.db.db.get(`
                    SELECT 
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contacts,
                        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_contacts,
                        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_contacts,
                        COUNT(CASE WHEN is_business = 1 THEN 1 END) as business_contacts,
                        COUNT(*) as total_contacts
                    FROM contacts
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

module.exports = ContactController;