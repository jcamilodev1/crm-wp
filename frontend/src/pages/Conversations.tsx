import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { conversationsApi } from '@/lib/api';
import type { Conversation } from '@/types';
import { 
  MessageSquare, 
  Search, 
  Filter,
  User,
  Clock,
  CheckCircle,
  Circle,
  Archive,
  MoreVertical
} from 'lucide-react';
import { safeFormatDistanceToNow } from '@/lib/utils';

export function Conversations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed' | 'pending'>('all');

  const { data: conversations, isLoading, error } = useQuery<Conversation[]>({
    queryKey: ['conversations', searchTerm, filterStatus],
    queryFn: async () => {
      const response = await conversationsApi.getConversations({
        page: 1,
        limit: 50,
      });
      return response.data;
    },
    refetchInterval: 10000, // Refrescar cada 10 segundos
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Circle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      case 'pending':
        return <Archive className="h-4 w-4 text-yellow-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { color: 'bg-green-100 text-green-800', label: 'Abierta' },
      closed: { color: 'bg-gray-100 text-gray-800', label: 'Cerrada' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendiente' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { color: 'bg-gray-100 text-gray-800', label: status };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Conversaciones</h1>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Conversaciones</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error cargando conversaciones: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquare className="h-8 w-8" />
          Conversaciones
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Archive className="h-4 w-4 mr-2" />
            Archivar Seleccionadas
          </Button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Todas</option>
                <option value="open">Abiertas</option>
                <option value="closed">Cerradas</option>
                <option value="pending">Pendientes</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de conversaciones */}
      <div className="space-y-4">
        {conversations?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay conversaciones</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No se encontraron conversaciones con los filtros aplicados'
                  : 'Aún no hay conversaciones registradas'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          conversations?.map((conversation) => (
            <Card 
              key={conversation.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer ${
                conversation.status === 'open' ? 'border-l-4 border-l-green-500' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-lg">
                          Conversación #{conversation.id}
                        </h3>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(conversation.status)}
                          {getStatusBadge(conversation.status)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Chat ID: {conversation.whatsapp_chat_id}
                      </div>
                      
                      <div className="bg-gray-50 rounded-md p-3">
                        <p className="text-sm">
                          {conversation.is_group ? 'Conversación de grupo' : 'Conversación individual'}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>
                            Prioridad: {conversation.priority}
                          </span>
                          {conversation.last_message_at && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {safeFormatDistanceToNow(conversation.last_message_at, 'recientemente')}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          ID: {conversation.id}
                        </span>
                        <span>
                          Actualizada {safeFormatDistanceToNow(conversation.updated_at, 'recientemente')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Estadísticas rápidas */}
      {conversations && conversations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{conversations.length}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {conversations.filter(c => c.status === 'open').length}
                </div>
                <div className="text-sm text-muted-foreground">Abiertas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {conversations.filter(c => c.status === 'closed').length}
                </div>
                <div className="text-sm text-muted-foreground">Cerradas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}