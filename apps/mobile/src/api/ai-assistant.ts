import { api } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(
  message: string,
  conversationHistory: ChatMessage[] = [],
  chatId?: string
): Promise<string> {
  const { data } = await api.post('/ai/chat', {
    message,
    conversationHistory,
    chatId,
  });
  return data.response || data.message || data.content;
}
