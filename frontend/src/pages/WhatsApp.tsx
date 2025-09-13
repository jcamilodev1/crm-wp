import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { whatsappApi } from '@/lib/api';
import type { WhatsAppStatus } from '@/types';
import { Phone, QrCode, RefreshCw, Smartphone, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function WhatsApp() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery<WhatsAppStatus>({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const response = await whatsappApi.getStatus();
      console.log('WhatsApp Status:', response.data);
      return response.data;
    },
    refetchInterval: 5000, // Refrescar cada 5 segundos
  });

  const { data: qrData } = useQuery<{ success: boolean; data: { qr: string } }>({
    queryKey: ['whatsapp-qr'],
    queryFn: async () => {
      console.log('Fetching QR Code...');
      const response = await whatsappApi.getQRCode();
      console.log('QR Response:', response.data);
      return response.data;
    },
    enabled: status?.hasQR && !status?.isReady,
    refetchInterval: 15000, // Refrescar cada 15 segundos
    retry: 3,
  });

  const initializeMutation = useMutation({
    mutationFn: whatsappApi.initialize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: whatsappApi.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });

  const handleInitialize = () => {
    initializeMutation.mutate();
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const getStatusIcon = () => {
    if (!status) return <AlertCircle className="h-5 w-5 text-gray-500" />;
    
    if (status.isReady) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (status.hasQR) {
      return <QrCode className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (!status) return 'Verificando estado...';
    
    if (status.isReady) {
      return 'Conectado y listo';
    } else if (status.hasQR) {
      return 'Esperando escaneo de código QR';
    } else {
      return 'Desconectado';
    }
  };

  const getStatusColor = () => {
    if (!status) return 'border-gray-200';
    
    if (status.isReady) {
      return 'border-green-200 bg-green-50';
    } else if (status.hasQR) {
      return 'border-yellow-200 bg-yellow-50';
    } else {
      return 'border-red-200 bg-red-50';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">WhatsApp</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Verificando estado de WhatsApp...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Phone className="h-8 w-8" />
          WhatsApp
        </h1>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Debug Info
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-4">
            <div>
              <div className="font-semibold mb-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Status:
              </div>
              <pre className="bg-white p-2 rounded text-xs overflow-auto border">
                {JSON.stringify(status, null, 2)}
              </pre>
            </div>
            
            <div>
              <div className="font-semibold mb-1 flex items-center gap-1">
                <QrCode className="h-3 w-3" />
                QR Code:
              </div>
              {qrData?.data?.qr ? (
                <div className="space-y-2">
                  <img 
                    src={qrData.data.qr} 
                    alt="WhatsApp QR Code" 
                    className="max-w-[200px] max-h-[200px] border-2 rounded-lg shadow-md bg-white p-3 mx-auto block"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="text-xs text-green-700 bg-green-100 p-2 rounded flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    QR Code generado correctamente
                  </div>
                  <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                    <strong>Tipo:</strong> {qrData.data.qr.includes('data:image/png') ? 'PNG Base64' : 'Desconocido'}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 p-3 rounded text-gray-500 text-center">
                  <XCircle className="h-4 w-4 mx-auto mb-1" />
                  No QR disponible
                </div>
              )}
            </div>
            
            <div>
              <div className="font-semibold mb-1 flex items-center gap-1">
                <Smartphone className="h-3 w-3" />
                Query State:
              </div>
              <div className="bg-white p-2 rounded text-xs border">
                Query Enabled: {String(status?.hasQR && !status?.isReady)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado de Conexión */}
      <Card className={`${getStatusColor()}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getStatusIcon()}
            Estado de Conexión
          </CardTitle>
          <CardDescription>
            Estado actual de la conexión con WhatsApp Web
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-lg font-medium">
              {getStatusText()}
            </div>
            
            <div className="flex gap-2">
              {!status?.isReady && (
                <Button 
                  onClick={handleInitialize}
                  disabled={initializeMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {initializeMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Smartphone className="h-4 w-4" />
                  )}
                  {initializeMutation.isPending ? 'Conectando...' : 'Conectar WhatsApp'}
                </Button>
              )}
              
              {status?.isReady && (
                <Button 
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {disconnectMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {disconnectMutation.isPending ? 'Desconectando...' : 'Desconectar'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de conexión */}
      {status?.hasQR && !status?.isReady && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
              <div>
                <p className="font-medium text-yellow-800">
                  Esperando conexión...
                </p>
                <p className="text-sm text-yellow-700">
                  Escanea el código QR con tu teléfono para continuar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Código QR */}
      {status?.hasQR && !status?.isReady && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <QrCode className="h-5 w-5" />
              Código QR
            </CardTitle>
            <CardDescription>
              Escanea este código QR con tu aplicación de WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Instrucciones para conectar:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Abre WhatsApp en tu teléfono</li>
                  <li>Ve a <strong>Menú (⋮)</strong> → <strong>Dispositivos vinculados</strong></li>
                  <li>Toca <strong>"Vincular un dispositivo"</strong></li>
                  <li>Apunta la cámara hacia este código QR</li>
                  <li>Espera a que se establezca la conexión</li>
                </ol>
              </div>
              
              {qrData?.data?.qr ? (
                <div className="flex justify-center">
                  <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-dashed border-gray-300">
                    <img 
                      src={qrData.data.qr} 
                      alt="WhatsApp QR Code" 
                      className="w-64 h-64 rounded-lg"
                    />
                    <div className="text-center mt-4">
                      <p className="text-sm text-gray-600">
                        Código QR válido por 2 minutos
                      </p>
                      <div className="text-xs text-gray-400 mt-1">
                        Se actualiza automáticamente cada 15 segundos
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="bg-gray-100 p-4 rounded-lg w-64 h-64 flex items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">Generando código QR...</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-center space-y-3">
                <Button 
                  variant="outline" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['whatsapp-qr'] })}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Generar nuevo código QR
                </Button>
                
                <div className="text-xs text-gray-500">
                  Si el código QR no funciona, haz clic para generar uno nuevo
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información Adicional */}
      {status?.isReady && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              ¡Conexión exitosa!
            </CardTitle>
            <CardDescription className="text-green-700">
              Tu WhatsApp está conectado y listo para usar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-green-700">Estado:</span>
                <span className="text-sm font-medium text-green-800">Conectado y activo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-green-700">Dispositivo:</span>
                <span className="text-sm font-medium text-green-800">WhatsApp Web</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-green-700">Última verificación:</span>
                <span className="text-sm font-medium text-green-800">Hace menos de 1 minuto</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje de ayuda */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Consejos importantes:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Mantén tu teléfono conectado a internet</li>
                <li>No cierres WhatsApp en tu teléfono</li>
                <li>La sesión puede expirar después de inactividad prolongada</li>
                <li>Si tienes problemas, intenta desconectar y reconectar</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}