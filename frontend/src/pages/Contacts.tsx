import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contactsApi, whatsappApi } from '@/lib/api';
import { useRealTime } from '@/hooks/useRealTime';
import type { Contact } from '@/types';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Building, 
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  User,
  RefreshCw,
  Download
} from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils';

export function Contacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked' | 'archived'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [syncingWhatsApp, setSyncingWhatsApp] = useState(false);
  const queryClient = useQueryClient();

  // Usar tiempo real para actualizaciones automáticas
  useRealTime({
    onContactUpdate: (data) => {
      console.log('📞 Contactos actualizados en tiempo real:', data);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    enableToasts: true
  });

  const { data: contactsResponse, isLoading, error } = useQuery({
    queryKey: ['contacts', searchTerm, filterStatus, currentPage, itemsPerPage],
    queryFn: async () => {
      const response = await contactsApi.getContacts({
        search: searchTerm,
        status: filterStatus === 'all' ? undefined : filterStatus,
        page: currentPage,
        limit: itemsPerPage,
      });
      return response.data;
    },
    refetchInterval: 30000,
  });

  const contacts = contactsResponse?.data?.contacts || [];
  const pagination = contactsResponse?.data?.pagination || {
    page: 1,
    limit: itemsPerPage,
    total: 0,
    totalPages: 1
  };

  const deleteMutation = useMutation({
    mutationFn: (contactId: number) => contactsApi.deleteContact(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      contactsApi.updateContact(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Sincronización desde WhatsApp
  const syncWhatsAppContactsMutation = useMutation({
    mutationFn: () => whatsappApi.getContactsPaginated({ limit: 100 }),
    onMutate: () => {
      setSyncingWhatsApp(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setSyncingWhatsApp(false);
    },
    onError: (error) => {
      console.error('Error sincronizando contactos:', error);
      setSyncingWhatsApp(false);
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Activo' },
      blocked: { color: 'bg-red-100 text-red-800', label: 'Bloqueado' },
      archived: { color: 'bg-gray-100 text-gray-800', label: 'Archivado' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { color: 'bg-gray-100 text-gray-800', label: status };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const handleStatusChange = (contactId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: contactId, status: newStatus });
  };

  const handleDelete = (contactId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      deleteMutation.mutate(contactId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Contactos</h1>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
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
        <h1 className="text-3xl font-bold">Contactos</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error cargando contactos: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="h-8 w-8" />
          Contactos
        </h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => syncWhatsAppContactsMutation.mutate()}
            disabled={syncingWhatsApp}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncingWhatsApp ? 'animate-spin' : ''}`} />
            {syncingWhatsApp ? 'Sincronizando...' : 'Sincronizar WhatsApp'}
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Contacto
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
                  placeholder="Buscar contactos..."
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
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="blocked">Bloqueados</option>
                <option value="archived">Archivados</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de contactos */}
      <div className="space-y-4">
        {!Array.isArray(contacts) || contacts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay contactos</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No se encontraron contactos con los filtros aplicados'
                  : 'Aún no tienes contactos registrados'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          Array.isArray(contacts) && contacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium text-lg">
                        {contact.name || 'Sin nombre'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {formatPhoneNumber(contact.phone)}
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        )}
                        {contact.company && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {contact.company}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(contact.status)}
                        {contact.is_business && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Empresa
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative group">
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      
                      {/* Menú desplegable simulado - en una implementación real usarías DropdownMenu */}
                      <div className="hidden group-hover:block absolute right-0 top-8 bg-white border rounded-md shadow-lg z-10 min-w-[150px]">
                        <button 
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {/* Editar contacto */}}
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </button>
                        
                        {contact.status === 'active' && (
                          <button 
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => handleStatusChange(contact.id, 'archived')}
                          >
                            <Archive className="h-3 w-3" />
                            Archivar
                          </button>
                        )}
                        
                        {contact.status === 'archived' && (
                          <button 
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => handleStatusChange(contact.id, 'active')}
                          >
                            <User className="h-3 w-3" />
                            Activar
                          </button>
                        )}
                        
                        <button 
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                          onClick={() => handleDelete(contact.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {contact.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground">{contact.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Estadísticas rápidas */}
      {Array.isArray(contacts) && contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{contacts.length}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {contacts.filter(c => c.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">Activos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {contacts.filter(c => c.is_business).length}
                </div>
                <div className="text-sm text-muted-foreground">Empresas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {contacts.filter(c => c.status === 'archived').length}
                </div>
                <div className="text-sm text-muted-foreground">Archivados</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
