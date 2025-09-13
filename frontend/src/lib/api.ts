import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptors para manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// General API
export const generalApi = {
  getStats: () => api.get('/stats'),
  getHealth: () => api.get('/health'),
};

// WhatsApp API
export const whatsappApi = {
  getStatus: () => api.get('/whatsapp/status'),
  getQR: () => api.get('/whatsapp/qr'),
  getQRCode: () => api.get('/whatsapp/qr'), // Alias para mantener compatibilidad
  initialize: () => api.post('/whatsapp/initialize'),
  disconnect: () => api.post('/whatsapp/disconnect'),
  sendMessage: (to: string, message: string) => 
    api.post('/whatsapp/send-message', { to, message }),
  getContacts: () => api.get('/whatsapp/contacts'),
  getChats: () => api.get('/whatsapp/chats'),
};

// Contacts API
export const contactsApi = {
  getContacts: (params?: { page?: number; limit?: number; search?: string; status?: string }) => 
    api.get('/contacts', { params }),
  getContact: (id: string | number) => api.get(`/contacts/${id}`),
  createContact: (data: any) => api.post('/contacts', data),
  updateContact: (id: string | number, data: any) => api.put(`/contacts/${id}`, data),
  deleteContact: (id: string | number) => api.delete(`/contacts/${id}`),
  getStats: () => api.get('/contacts/stats'),
};

// Conversations API
export const conversationsApi = {
  getConversations: (params?: { page?: number; limit?: number }) => 
    api.get('/conversations', { params }),
  getConversation: (id: string) => api.get(`/conversations/${id}`),
  updateConversation: (id: string, data: any) => api.put(`/conversations/${id}`, data),
  deleteConversation: (id: string) => api.delete(`/conversations/${id}`),
  getMessages: (conversationId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/conversations/${conversationId}/messages`, { params }),
};

// Messages API
export const messagesApi = {
  getMessages: (params?: { page?: number; limit?: number; conversationId?: string }) => 
    api.get('/messages', { params }),
  getMessage: (id: string) => api.get(`/messages/${id}`),
  sendMessage: (data: any) => api.post('/messages', data),
  updateMessage: (id: string, data: any) => api.put(`/messages/${id}`, data),
  deleteMessage: (id: string) => api.delete(`/messages/${id}`),
};

// Auto Responses API
export const autoResponsesApi = {
  getAutoResponses: () => api.get('/auto-responses'),
  getAutoResponse: (id: string) => api.get(`/auto-responses/${id}`),
  createAutoResponse: (data: any) => api.post('/auto-responses', data),
  updateAutoResponse: (id: string, data: any) => api.put(`/auto-responses/${id}`, data),
  deleteAutoResponse: (id: string) => api.delete(`/auto-responses/${id}`),
  toggleAutoResponse: (id: string) => api.post(`/auto-responses/${id}/toggle`),
};

// Settings API
export const settingsApi = {
  getSettings: () => api.get('/settings'),
  getSetting: (key: string) => api.get(`/settings/${key}`),
  updateSetting: (key: string, value: string) => api.put(`/settings/${key}`, { value }),
  updateSettings: (data: Record<string, string>) => api.put('/settings', data),
};

// Logs API
export const logsApi = {
  getLogs: (params?: { page?: number; limit?: number; level?: string; date?: string }) => 
    api.get('/logs', { params }),
  getLog: (id: string) => api.get(`/logs/${id}`),
  clearLogs: () => api.delete('/logs'),
};