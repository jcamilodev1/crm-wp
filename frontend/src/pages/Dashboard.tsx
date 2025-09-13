import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generalApi } from '@/lib/api';
import type { Stats } from '@/types';
import { Users, MessageSquare, Phone, Activity, TrendingUp, Clock } from 'lucide-react';
import { safeFormatDistanceToNow, formatBytes, formatUptime } from '@/lib/utils';

export function Dashboard() {
  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await generalApi.getStats();
      return response.data;
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error cargando estadísticas: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Actualizado {safeFormatDistanceToNow(stats?.last_updated, 'ahora')}
        </div>
      </div>

      {/* Estado de WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Estado de WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`h-3 w-3 rounded-full ${
              stats?.whatsapp?.isReady ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="font-medium">
              {stats?.whatsapp?.isReady ? 'Conectado' : 'Desconectado'}
            </span>
            {stats?.whatsapp?.hasQR && !stats?.whatsapp?.isReady && (
              <span className="text-sm text-muted-foreground">
                (Código QR disponible)
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contactos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.contacts?.total_contacts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.contacts?.active_contacts || 0} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversaciones</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversations?.total_conversations || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.conversations?.open_conversations || 0} abiertas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensajes Hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.messages_today?.total_messages || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.messages_today?.sent_messages || 0} enviados, {stats?.messages_today?.received_messages || 0} recibidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.contacts?.business_contacts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Contactos comerciales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Información del sistema */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado del Servidor</CardTitle>
            <CardDescription>Información del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tiempo activo:</span>
              <span className="text-sm font-medium">{formatUptime(stats?.uptime || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Memoria RSS:</span>
              <span className="text-sm font-medium">{formatBytes(stats?.memory_usage?.rss || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Heap usado:</span>
              <span className="text-sm font-medium">{formatBytes(stats?.memory_usage?.heapUsed || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de Contactos</CardTitle>
            <CardDescription>Estado de los contactos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Activos:</span>
              <span className="text-sm font-medium text-green-600">
                {stats?.contacts?.active_contacts || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Bloqueados:</span>
              <span className="text-sm font-medium text-red-600">
                {stats?.contacts?.blocked_contacts || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Archivados:</span>
              <span className="text-sm font-medium text-gray-600">
                {stats?.contacts?.archived_contacts || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}