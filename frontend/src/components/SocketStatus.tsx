import { useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export function SocketStatus() {
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Verificar estado inicial
    setIsConnected(socket.isConnected());

    // Escuchar cambios de estado
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const unsubscribeConnect = socket.on('connect', handleConnect);
    const unsubscribeDisconnect = socket.on('disconnect', handleDisconnect);

    // Verificar estado periódicamente
    const interval = setInterval(() => {
      setIsConnected(socket.isConnected());
    }, 1000);

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      clearInterval(interval);
    };
  }, [socket]);

  return (
    <Badge 
      variant={isConnected ? "default" : "destructive"}
      className="flex items-center gap-2"
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          Tiempo Real Activo
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Sin Conexión
        </>
      )}
    </Badge>
  );
}
