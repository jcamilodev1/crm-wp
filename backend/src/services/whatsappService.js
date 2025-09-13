const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const EventEmitter = require('events');

class WhatsAppService extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.isReady = false;
        this.qrString = null;
        this.initializeClient();
    }

    initializeClient() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: process.env.WA_SESSION_PATH || './sessions'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Evento cuando se genera el código QR
        this.client.on('qr', async (qr) => {
            console.log('📱 Código QR generado');
            this.qrString = qr;
            
            try {
                // Generar QR como string para mostrar en consola
                const qrString = await qrcode.toString(qr, { type: 'terminal' });
                console.log('Escanea este código QR con tu WhatsApp:');
                console.log(qrString);
                
                this.emit('qr', qr);
            } catch (error) {
                console.error('Error generando QR:', error);
            }
        });

        // Evento cuando el cliente está listo
        this.client.on('ready', () => {
            console.log('✅ Cliente de WhatsApp listo!');
            this.isReady = true;
            this.qrString = null;
            this.emit('ready');
        });

        // Evento cuando se autentica
        this.client.on('authenticated', () => {
            console.log('🔐 Autenticado correctamente');
            this.emit('authenticated');
        });

        // Evento cuando falla la autenticación
        this.client.on('auth_failure', (msg) => {
            console.error('❌ Error de autenticación:', msg);
            this.emit('auth_failure', msg);
        });

        // Evento cuando se desconecta
        this.client.on('disconnected', (reason) => {
            console.log('🔌 Desconectado:', reason);
            this.isReady = false;
            this.emit('disconnected', reason);
        });

        // Evento cuando llega un mensaje
        this.client.on('message', async (message) => {
            try {
                console.log(`📨 Mensaje recibido de ${message.from}: ${message.body}`);
                this.emit('message', message);
            } catch (error) {
                console.error('Error procesando mensaje:', error);
            }
        });

        // Evento cuando se crea un mensaje (enviado o recibido)
        this.client.on('message_create', async (message) => {
            this.emit('message_create', message);
        });

        // Evento cuando cambia el estado del mensaje
        this.client.on('message_ack', (message, ack) => {
            this.emit('message_ack', message, ack);
        });
    }

    async initialize() {
        try {
            console.log('🚀 Inicializando cliente de WhatsApp...');
            await this.client.initialize();
        } catch (error) {
            console.error('Error inicializando cliente:', error);
            throw error;
        }
    }

    async sendMessage(to, message) {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            const response = await this.client.sendMessage(to, message);
            console.log(`📤 Mensaje enviado a ${to}: ${message}`);
            return response;
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            throw error;
        }
    }

    async getContacts() {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            const contacts = await this.client.getContacts();
            return contacts.filter(contact => contact.isMyContact);
        } catch (error) {
            console.error('Error obteniendo contactos:', error);
            throw error;
        }
    }

    async getChats() {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            const chats = await this.client.getChats();
            return chats;
        } catch (error) {
            console.error('Error obteniendo chats:', error);
            throw error;
        }
    }

    async getChatById(chatId) {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            const chat = await this.client.getChatById(chatId);
            return chat;
        } catch (error) {
            console.error('Error obteniendo chat:', error);
            throw error;
        }
    }

    async markChatUnread(chatId) {
        if (!this.isReady) {
            throw new Error('Cliente de WhatsApp no está listo');
        }

        try {
            const chat = await this.client.getChatById(chatId);
            await chat.markUnread();
        } catch (error) {
            console.error('Error marcando chat como no leído:', error);
            throw error;
        }
    }

    async getQRCode() {
        if (!this.qrString) {
            return null;
        }
        
        try {
            // Generar código QR como imagen base64
            const qrImage = await qrcode.toDataURL(this.qrString, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                width: 256
            });
            
            return qrImage;
        } catch (error) {
            console.error('Error generando imagen QR:', error);
            return null;
        }
    }

    getStatus() {
        return {
            isReady: this.isReady,
            hasQR: !!this.qrString
        };
    }

    async disconnect() {
        try {
            if (this.client) {
                await this.client.logout();
                console.log('🔌 Cliente de WhatsApp desconectado');
                this.isReady = false;
                this.qrString = null;
            }
        } catch (error) {
            console.error('Error desconectando cliente:', error);
            throw error;
        }
    }

    async destroy() {
        if (this.client) {
            await this.client.destroy();
            this.isReady = false;
            console.log('🛑 Cliente de WhatsApp destruido');
        }
    }
}

module.exports = WhatsAppService;