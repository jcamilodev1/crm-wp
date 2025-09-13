
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { WhatsApp } from '@/pages/WhatsApp';
import { Contacts } from '@/pages/Contacts';
import { Conversations } from '@/pages/Conversations';
import { ConversationDetail } from '@/pages/ConversationDetail';
import { useRealTime } from '@/hooks/useRealTime';

// Crear cliente de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

// Componente interno para manejar tiempo real
function AppContent() {
  // Inicializar conexión de tiempo real para toda la app
  useRealTime({
    enableToasts: true,
    onWhatsAppStatusChange: (status) => {
      console.log('📱 Estado de WhatsApp cambió:', status);
    }
  });

  return (
    <>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/conversations/:id" element={<ConversationDetail />} />
            <Route path="/auto-responses" element={<div className="p-6">Auto Responses - En desarrollo</div>} />
            <Route path="/reports" element={<div className="p-6">Reports - En desarrollo</div>} />
            <Route path="/logs" element={<div className="p-6">Logs - En desarrollo</div>} />
            <Route path="/settings" element={<div className="p-6">Settings - En desarrollo</div>} />
          </Routes>
        </Layout>
      </Router>
      
      {/* Toaster para notificaciones en tiempo real */}
      <Toaster 
        position="top-right" 
        richColors 
        expand={true}
        duration={4000}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
