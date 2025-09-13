export interface Contact {
  id: number;
  whatsapp_id: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  profile_pic_url?: string;
  is_business: boolean;
  tags: string[];
  notes?: string;
  status: 'active' | 'blocked' | 'archived';
  first_contact_date: string;
  last_contact_date?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message_date?: string;
}

export interface Conversation {
  id: number;
  contact_id: number;
  whatsapp_chat_id: string;
  is_group: boolean;
  status: 'open' | 'closed' | 'pending';
  assigned_to?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  // Campos adicionales del JOIN con contacts
  contact_name?: string;
  contact_phone?: string;
  contact_whatsapp_id?: string;
  contact_profile_pic?: string;
  message_count?: number;
  last_message_date?: string;
  last_message_content?: string;
}

export interface Message {
  id: number;
  whatsapp_message_id: string;
  conversation_id: number;
  contact_id: number;
  from_me: boolean;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'contact';
  content?: string;
  media_url?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  is_starred: boolean;
  reply_to?: string;
  created_at: string;
}

export interface AutoResponse {
  id: number;
  trigger_text: string;
  response_text: string;
  is_active: boolean;
  match_type: 'exact' | 'contains' | 'regex';
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export interface WhatsAppStatus {
  isReady: boolean;
  hasQR: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items?: T[];
    contacts?: T[];
    conversations?: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface Stats {
  whatsapp: WhatsAppStatus;
  contacts: {
    total_contacts: number;
    active_contacts: number;
    blocked_contacts: number;
    archived_contacts: number;
    business_contacts: number;
  };
  conversations: {
    total_conversations: number;
    open_conversations: number;
  };
  messages_today: {
    total_messages: number;
    sent_messages: number;
    received_messages: number;
  };
  uptime: number;
  memory_usage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  last_updated: string;
}