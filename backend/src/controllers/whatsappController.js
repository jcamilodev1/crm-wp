class WhatsAppController {
    constructor(whatsappService, messageHandler) {
        this.whatsapp = whatsappService;
        this.messageHandler = messageHandler;
    }

    // Obtener estado del cliente WhatsApp
    getStatus = (req, res) => {
        try {
            const status = this.whatsapp.getStatus();
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener código QR
    getQRCode = async (req, res) => {
        try {
            const qr = await this.whatsapp.getQRCode();
            if (qr) {
                res.json({
                    success: true,
                    data: { qr }
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'No hay código QR disponible'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Enviar mensaje
    sendMessage = async (req, res) => {
        try {
            const { to, message } = req.body;

            if (!to || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'Los campos "to" y "message" son requeridos'
                });
            }

            const result = await this.messageHandler.sendMessage(to, message);
            
            res.json({
                success: true,
                data: {
                    id: result.id._serialized,
                    to: result.to,
                    message: message,
                    timestamp: result.timestamp
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Inicializar cliente WhatsApp
    initialize = async (req, res) => {
        try {
            await this.whatsapp.initialize();
            res.json({
                success: true,
                message: 'Cliente WhatsApp inicializado'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Desconectar cliente WhatsApp
    disconnect = async (req, res) => {
        try {
            await this.whatsapp.disconnect();
            res.json({
                success: true,
                message: 'Cliente WhatsApp desconectado'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener contactos desde WhatsApp
    getContacts = async (req, res) => {
        try {
            const contacts = await this.whatsapp.getContacts();
            
            res.json({
                success: true,
                data: contacts.map(contact => ({
                    id: contact.id._serialized,
                    name: contact.name || contact.pushname,
                    number: contact.number,
                    isMyContact: contact.isMyContact,
                    isBlocked: contact.isBlocked,
                    isBusiness: contact.isBusiness
                }))
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener chats
    getChats = async (req, res) => {
        try {
            const chats = await this.whatsapp.getChats();
            
            res.json({
                success: true,
                data: chats.map(chat => ({
                    id: chat.id._serialized,
                    name: chat.name,
                    isGroup: chat.isGroup,
                    isReadOnly: chat.isReadOnly,
                    unreadCount: chat.unreadCount,
                    timestamp: chat.timestamp,
                    archived: chat.archived,
                    pinned: chat.pinned,
                    isMuted: chat.isMuted
                }))
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = WhatsAppController;