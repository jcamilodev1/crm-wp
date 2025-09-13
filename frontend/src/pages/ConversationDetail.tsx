import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { conversationsApi, whatsappApi } from '@/lib/api';
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
  AlertCircle
} from 'lucide-react';
import { safeFormatDistanceToNow } from '@/lib/utils';

export function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversationData, isLoading, error } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      if (!id) throw new Error('ID de conversación requerido');
      const response = await conversationsApi.getConversation(id);
      return response.data.data;
    },
    enabled: !!id,
    refetchInterval: 5000, // Refrescar cada 5 segundos
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationData?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationData?.conversation?.contact_phone) return;

    sendMessageMutation.mutate({
      phone: conversationData.conversation.contact_phone,
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

  if (isLoading) {
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

  if (error) {
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
            <p className="text-destructive">Error cargando conversación: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!conversationData) return null;

  const { conversation, messages } = conversationData;

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
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {Array.isArray(messages) && messages.length > 0 ? (
            messages.map((message: Message) => (
              <div
                key={message.id}
                className={`flex ${message.from_me ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.from_me
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
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