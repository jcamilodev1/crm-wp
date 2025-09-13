import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { conversationsApi, whatsappApi } from '@/lib/api';
import { useRealTime } from '@/hooks/useRealTime';
import { MessageMedia } from '@/components/MessageMedia';
import type { Message } from '@/types';
import { 
  ArrowLeft, 
  Send, 
  User, 
  Phone, 
  MoreVertical,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
  ChevronUp
} from 'lucide-react';
import { safeFormatDistanceToNow } from '@/lib/utils';

export function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Tiempo real para esta conversación
  useRealTime({
    onNewMessage: (message) => {
      if (message.conversationId === parseInt(id || '0')) {
        queryClient.invalidateQueries({ queryKey: ['conversation-messages', id] });
        // Auto-scroll solo si el usuario está cerca del final
        setTimeout(scrollToBottom, 100);
      }
    },
    enableToasts: false // No mostrar toasts en la página de conversación
  });

  // Query infinita para mensajes paginados
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: messagesLoading,
    error: messagesError
  } = useInfiniteQuery({
    queryKey: ['conversation-messages', id],
    queryFn: async ({ pageParam = 1 }) => {
      if (!id) throw new Error('ID de conversación requerido');
      const response = await conversationsApi.getConversation(id, {
        page: pageParam,
        limit: 50
      });
      return response.data.data;
    },
    enabled: !!id,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      const response = await whatsappApi.sendMessage(phone, message);
      return response.data;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['conversation', id] });
      scrollToBottom();
    },
  });

  // Procesar mensajes de todas las páginas
  const allMessages = messagesData?.pages.flatMap(page => page.messages || []) || [];
  const conversation = messagesData?.pages[0]?.conversation;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop } = messagesContainerRef.current;
      // Si el usuario hace scroll hacia arriba y está cerca del inicio, cargar más mensajes
      if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  useEffect(() => {
    // Auto-scroll solo en la primera carga
    if (allMessages.length > 0 && messagesData?.pages.length === 1) {
      setTimeout(scrollToBottom, 100);
    }
  }, [allMessages.length, messagesData?.pages.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation?.contact_phone) return;

    sendMessageMutation.mutate({
      phone: conversation.contact_phone,
      message: newMessage.trim(),
    });
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  if (messagesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/conversations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-48"></div>
          </div>
        </div>
        <Card className="h-96">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/conversations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Conversación</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error cargando conversación: {messagesError?.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!conversation || !allMessages) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/conversations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {conversation.contact_name || conversation.contact_phone}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="h-3 w-3" />
                {conversation.contact_phone}
              </p>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat Container */}
      <Card className="h-[calc(100vh-200px)] flex flex-col">
        {/* Messages Area */}
        <CardContent 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          onScroll={handleScroll}
        >
          {/* Botón de cargar más mensajes */}
          {hasNextPage && (
            <div className="flex justify-center py-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2"
              >
                {isFetchingNextPage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                {isFetchingNextPage ? 'Cargando...' : 'Cargar mensajes anteriores'}
              </Button>
            </div>
          )}

          {Array.isArray(allMessages) && allMessages.length > 0 ? (
            allMessages.map((message: Message) => (
              <div
                key={message.id}
                className={`flex ${message.from_me ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md rounded-lg ${
                    message.from_me
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  } ${message.media_url ? 'p-2' : 'px-4 py-2'}`}
                >
                  {/* Mostrar media si existe */}
                  {message.media_url && (
                    <MessageMedia
                      mediaUrl={message.media_url}
                      mediaType={message.message_type}
                      fileName={message.media_filename}
                      fileSize={message.media_size}
                      mimetype={message.media_mimetype}
                      className="mb-2"
                    />
                  )}
                  
                  {/* Mostrar texto si existe */}
                  {message.content && (
                    <p className={`text-sm ${message.media_url ? 'px-2' : ''}`}>
                      {message.content}
                    </p>
                  )}
                  
                  <div className={`flex items-center justify-end gap-1 mt-1 ${message.media_url ? 'px-2' : ''}`}>
                    <span className="text-xs opacity-70">
                      {safeFormatDistanceToNow(message.timestamp)}
                    </span>
                    {message.from_me && getMessageStatusIcon(message.status)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No hay mensajes en esta conversación
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Message Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1"
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              type="submit" 
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="px-6"
            >
              {sendMessageMutation.isPending ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}