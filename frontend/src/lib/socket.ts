import { io, Socket } from 'socket.io-client';

interface ServerToClientEvents {
  // Eventos de WhatsApp
  whatsapp_status: (status: any) => void;
  new_message: (message: any) => void;
  message_edited: (data: any) => void;
  message_revoked: (data: any) => void;
  
  // Eventos de conversaciones
  conversation_updated: (data: any) => void;
  chat_updated: (data: any) => void;
  
  // Eventos de contactos
  contacts_updated: (data: any) => void;
  contacts_full_sync: (data: any) => void;
  
  // Eventos de sincronización
  sync_forced: (data: any) => void;
  sync_error: (data: any) => void;
  
  // Eventos de estado
  typing_status: (data: any) => void;
}

interface ClientToServerEvents {
  request_sync: () => void;
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private connected: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Conectado al servidor WebSocket');
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado del servidor WebSocket:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
    });

    // Configurar listeners para todos los eventos
    this.socket.on('whatsapp_status', (status) => {
      this.emitToListeners('whatsapp_status', status);
    });

    this.socket.on('new_message', (message) => {
      this.emitToListeners('new_message', message);
    });

    this.socket.on('message_edited', (data) => {
      this.emitToListeners('message_edited', data);
    });

    this.socket.on('message_revoked', (data) => {
      this.emitToListeners('message_revoked', data);
    });

    this.socket.on('conversation_updated', (data) => {
      this.emitToListeners('conversation_updated', data);
    });

    this.socket.on('chat_updated', (data) => {
      this.emitToListeners('chat_updated', data);
    });

    this.socket.on('contacts_updated', (data) => {
      this.emitToListeners('contacts_updated', data);
    });

    this.socket.on('contacts_full_sync', (data) => {
      this.emitToListeners('contacts_full_sync', data);
    });

    this.socket.on('sync_forced', (data) => {
      this.emitToListeners('sync_forced', data);
    });

    this.socket.on('sync_error', (data) => {
      this.emitToListeners('sync_error', data);
    });

    this.socket.on('typing_status', (data) => {
      this.emitToListeners('typing_status', data);
    });
  }

  private emitToListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error ejecutando listener para ${event}:`, error);
        }
      });
    }
  }

  // Método para subscribirse a eventos
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Retornar función para des-subscribirse
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  // Método para emitir eventos al servidor
  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event as any, data);
    } else {
      console.warn('Socket no conectado. No se puede emitir evento:', event);
    }
  }

  // Solicitar sincronización
  requestSync() {
    this.emit('request_sync');
  }

  // Obtener estado de conexión
  isConnected() {
    return this.connected;
  }

  // Desconectar
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }
}

// Crear instancia singleton
const socketService = new SocketService();

export default socketService;

// Hook de React para usar el socket
export function useSocket() {
  return socketService;
}
