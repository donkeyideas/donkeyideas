import { api } from './client';

export interface Message {
  id: string;
  name: string;
  email: string;
  subject?: string;
  company?: string | null;
  interest?: string;
  message: string;
  source?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  unreadCount: number;
  sources: string[];
}

export async function getMessages(filter = 'all', page = 1, source?: string): Promise<MessagesResponse> {
  const { data } = await api.get('/admin/messages', {
    params: { filter, page, limit: 20, source },
  });
  return data;
}

export async function markMessageRead(id: string, read: boolean): Promise<void> {
  await api.patch(`/admin/messages/${id}`, { read });
}

export async function deleteMessage(id: string): Promise<void> {
  await api.delete(`/admin/messages/${id}`);
}
