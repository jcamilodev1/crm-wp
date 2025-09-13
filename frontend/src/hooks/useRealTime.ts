import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import socketService from '../lib/socket';
import { toast } from 'sonner';

interface UseRealTimeOptions {
  onNewMessage?: (message: any) => void;
  onConversationUpdate?: (data: any) => void;
  onContactUpdate?: (data: any) => void;
  onWhatsAppStatusChange?: (status: any) => void;
  enableToasts?: boolean;
}

export function useRealTime(options: UseRealTimeOptions = {}) {
  const queryClient = useQueryClient();
  const {
    onNewMessage,
    onConversationUpdate,
    onContactUpdate,
    onWhatsAppStatusChange,
    enableToasts = true
  } = options;

  // Conectar al socket al montar el hook
  useEffect(() => {
    socketService.connect();
    
    return () => {
      // No desconectar aquí porque puede ser usado por múltiples componentes
    };
  }, []);

  // Manejar nuevos mensajes
  useEffect(() => {
    const unsubscribe = socketService.on('new_message', (message: any) => {
      console.log('📨 Nuevo mensaje recibido:', message);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', message.conversationId] });
      
      // Ejecutar callback personalizado
      if (onNewMessage) {
        onNewMessage(message);
      }
      
      // Mostrar toast si está habilitado
      if (enableToasts && !message.fromMe) {
        toast.success(`Nuevo mensaje de ${message.contactName}`, {
          description: message.content?.slice(0, 50) + (message.content?.length > 50 ? '...' : ''),
          duration: 3000,
        });
      }
    });

    return unsubscribe;
  }, [queryClient, onNewMessage, enableToasts]);

  // Manejar actualizaciones de conversaciones
  useEffect(() => {
    const unsubscribe = socketService.on('conversation_updated', (data: any) => {
      console.log('💬 Conversación actualizada:', data);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
      
      // Ejecutar callback personalizado
      if (onConversationUpdate) {
        onConversationUpdate(data);
      }
    });

    return unsubscribe;
  }, [queryClient, onConversationUpdate]);

  // Manejar actualizaciones de contactos
  useEffect(() => {
    const unsubscribe = socketService.on('contacts_updated', (data: any) => {
      console.log('👥 Contactos actualizados:', data);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      
      // Ejecutar callback personalizado
      if (onContactUpdate) {
        onContactUpdate(data);
      }
    });

    return unsubscribe;
  }, [queryClient, onContactUpdate]);

  // Manejar cambios de estado de WhatsApp
  useEffect(() => {
    const unsubscribe = socketService.on('whatsapp_status', (status: any) => {
      console.log('📱 Estado de WhatsApp actualizado:', status);
      
      // Invalidar queries de estado
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      
      // Ejecutar callback personalizado
      if (onWhatsAppStatusChange) {
        onWhatsAppStatusChange(status);
      }
      
      // Mostrar toast para cambios importantes
      if (enableToasts) {
        if (status.isReady && !socketService.isConnected()) {
          toast.success('WhatsApp conectado', {
            description: 'La conexión con WhatsApp está activa',
            duration: 3000,
          });
        }
      }
    });

    return unsubscribe;
  }, [queryClient, onWhatsAppStatusChange, enableToasts]);

  // Manejar mensajes editados
  useEffect(() => {
    const unsubscribe = socketService.on('message_edited', (data: any) => {
      console.log('✏️ Mensaje editado:', data);
      
      // Invalidar conversación específica
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      if (enableToasts) {
        toast.info('Mensaje editado', {
          description: 'Un mensaje fue editado en la conversación',
          duration: 2000,
        });
      }
    });

    return unsubscribe;
  }, [queryClient, enableToasts]);

  // Manejar mensajes eliminados
  useEffect(() => {
    const unsubscribe = socketService.on('message_revoked', (data: any) => {
      console.log('🗑️ Mensaje eliminado:', data);
      
      // Invalidar conversación específica
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      if (enableToasts) {
        toast.info('Mensaje eliminado', {
          description: 'Un mensaje fue eliminado de la conversación',
          duration: 2000,
        });
      }
    });

    return unsubscribe;
  }, [queryClient, enableToasts]);

  // Manejar sincronización forzada
  useEffect(() => {
    const unsubscribe = socketService.on('sync_forced', (data: any) => {
      console.log('🔄 Sincronización forzada:', data);
      
      // Invalidar todas las queries principales
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      
      if (enableToasts) {
        toast.success('Sincronización completada', {
          description: 'Los datos han sido actualizados',
          duration: 3000,
        });
      }
    });

    return unsubscribe;
  }, [queryClient, enableToasts]);

  // Manejar errores de sincronización
  useEffect(() => {
    const unsubscribe = socketService.on('sync_error', (data: any) => {
      console.error('❌ Error de sincronización:', data);
      
      if (enableToasts) {
        toast.error('Error de sincronización', {
          description: data.error || 'Ha ocurrido un error durante la sincronización',
          duration: 5000,
        });
      }
    });

    return unsubscribe;
  }, [enableToasts]);

  // Manejar estado de escritura
  useEffect(() => {
    const unsubscribe = socketService.on('typing_status', (data: any) => {
      console.log('⌨️ Estado de escritura:', data);
      
      // Aquí podrías actualizar el estado de "está escribiendo" en la UI
      // Por ejemplo, usando un estado global o context
    });

    return unsubscribe;
  }, []);

  // Manejar sincronización inicial completada
  useEffect(() => {
    const unsubscribe = socketService.on('initial_sync_completed', (data: any) => {
      console.log('✅ Sincronización inicial completada:', data);
      
      // Invalidar todas las queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      
      if (enableToasts) {
        toast.success('Sincronización inicial completada', {
          description: data.type === 'chats_and_messages' 
            ? `${data.chats_count} chats y mensajes sincronizados`
            : `${data.count || data.chats_count} ${data.type} sincronizados exitosamente`,
          duration: 4000,
        });
      }
    });

    return unsubscribe;
  }, [queryClient, enableToasts]);

  // Función para solicitar sincronización
  const requestSync = useCallback(() => {
    socketService.requestSync();
    
    if (enableToasts) {
      toast.info('Sincronización solicitada', {
        description: 'Actualizando datos desde WhatsApp...',
        duration: 2000,
      });
    }
  }, [enableToasts]);

  // Función para verificar estado de conexión
  const isConnected = useCallback(() => {
    return socketService.isConnected();
  }, []);

  return {
    requestSync,
    isConnected,
    socketService
  };
}
