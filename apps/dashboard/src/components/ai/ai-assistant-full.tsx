'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Chat {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

export function AIAssistantFull() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I can help you build pitch decks, analyze financials, and manage your projects. What would you like to do?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [showChatList, setShowChatList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (currentChatId) {
      loadChat(currentChatId);
    }
  }, [currentChatId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadChats = async () => {
    try {
      const response = await api.get('/chats');
      setChats(response.data.chats || []);
    } catch (error: any) {
      // If error is about missing migration, silently fail - chat history is optional
      if (error.response?.status === 500) {
        const errorMsg = error.response?.data?.error?.message || '';
        if (errorMsg.includes('migration') || errorMsg.includes('Chat history')) {
          console.warn('Chat history requires database migration. Chat history will be disabled until migration is run.');
          // Don't show error to user - chat history is optional
          return;
        }
      }
      console.error('Failed to load chats:', error);
    }
  };

  const loadChat = async (chatId: string) => {
    try {
      const response = await api.get(`/chats/${chatId}`);
      const chat = response.data.chat;
      if (chat.messages && chat.messages.length > 0) {
        setMessages(
          chat.messages.map((msg: any) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }))
        );
      } else {
        setMessages([
          {
            role: 'assistant',
            content:
              'Hello! I can help you build pitch decks, analyze financials, and manage your projects. What would you like to do?',
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  const createNewChat = async () => {
    if (!newChatName.trim()) return;

    try {
      const response = await api.post('/chats', { name: newChatName.trim() });
      const newChat = response.data.chat;
      setChats([newChat, ...chats]);
      setCurrentChatId(newChat.id);
      setNewChatName('');
      setShowNewChatModal(false);
      setMessages([
        {
          role: 'assistant',
          content:
            'Hello! I can help you build pitch decks, analyze financials, and manage your projects. What would you like to do?',
        },
      ]);
    } catch (error: any) {
      console.error('Failed to create chat:', error);
      const errorMessage = error.response?.data?.error?.message || 'Failed to create chat';
      if (errorMessage.includes('migration') || errorMessage.includes('Chat history')) {
        alert(`Chat history requires a database migration.\n\nPlease run:\ncd packages/database\nnpx prisma migrate dev --name add_chat_history\nnpx prisma generate\n\nThen restart your dev server.`);
        setShowNewChatModal(false);
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // If no chat is selected, try to create a new one first (optional - chat history may not be available)
    let chatId = currentChatId;
    if (!chatId) {
      const defaultName = `Chat ${new Date().toLocaleDateString()}`;
      try {
        const response = await api.post('/chats', { name: defaultName });
        chatId = response.data.chat.id;
        setCurrentChatId(chatId);
        setChats([response.data.chat, ...chats]);
      } catch (error: any) {
        // If chat creation fails (e.g., migration not run), continue without chat history
        console.warn('Failed to create chat (chat history may not be available):', error);
        // Continue with sending message - chat history is optional
      }
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        message: input,
        conversationHistory: messages,
        chatId: chatId,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response || 'I apologize, but I encountered an error processing your request.',
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Reload chats to update the timestamp
      loadChats();
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content:
          error.response?.data?.error?.message ||
          'I apologize, but I encountered an error. Please check your API keys in Settings.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setCurrentChatId(null);
    setMessages([
      {
        role: 'assistant',
        content:
          'Hello! I can help you build pitch decks, analyze financials, and manage your projects. What would you like to do?',
      },
    ]);
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      await api.delete(`/chats/${chatId}`);
      setChats(chats.filter((c) => c.id !== chatId));
      if (currentChatId === chatId) {
        clearChat();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-300px)] min-h-[600px]">
      {/* Chat History Sidebar */}
      {showChatList && (
        <div className="w-64 bg-[#1A1A1A] [.light_&]:bg-white [.light_&]:border-slate-200 [.blue_&]:bg-slate-800/50 border border-white/10 rounded-lg p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white [.light_&]:text-slate-900">Chat History</h3>
            <button
              onClick={() => setShowChatList(false)}
              className="text-xs text-white/60 [.light_&]:text-slate-600 hover:text-white [.light_&]:hover:text-slate-900"
            >
              ✕
            </button>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowNewChatModal(true)}
            className="w-full mb-4"
          >
            + New Chat
          </Button>
          <div className="flex-1 overflow-y-auto space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setCurrentChatId(chat.id)}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  currentChatId === chat.id
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{chat.name}</div>
                    <div className="text-xs text-white/40 mt-1">
                      {formatDate(chat.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="text-xs text-white/40 hover:text-red-400 ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            {chats.length === 0 && (
              <div className="text-xs text-white/40 [.light_&]:text-slate-600 text-center py-4">
                No chats yet. Create a new chat to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#1A1A1A] [.light_&]:bg-white [.light_&]:border-slate-200 [.blue_&]:bg-slate-800/50 border border-white/10 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 [.light_&]:border-slate-200">
          <div className="flex items-center gap-3">
            {!showChatList && (
              <button
                onClick={() => setShowChatList(true)}
                className="text-sm text-white/60 [.light_&]:text-slate-600 hover:text-white [.light_&]:hover:text-slate-900"
              >
                ☰
              </button>
            )}
            <div>
              <h3 className="text-lg font-semibold text-white [.light_&]:text-slate-900">
                {currentChatId
                  ? chats.find((c) => c.id === currentChatId)?.name || 'AI Assistant'
                  : 'AI Assistant'}
              </h3>
              <p className="text-xs text-white/60 [.light_&]:text-slate-600">Powered by Deep Seek AI</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="text-sm text-white/60 [.light_&]:text-slate-600 hover:text-white [.light_&]:hover:text-slate-900 transition-colors px-3 py-1 hover:bg-white/5 [.light_&]:hover:bg-slate-100 rounded"
          >
            New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-white [.light_&]:bg-slate-100 [.light_&]:text-slate-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 [.light_&]:bg-slate-100 rounded-lg px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white/60 [.light_&]:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-white/60 [.light_&]:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-white/60 [.light_&]:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10 [.light_&]:border-slate-200">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-3 bg-white/5 [.light_&]:bg-white border border-white/10 [.light_&]:border-slate-300 rounded-md text-white [.light_&]:text-slate-900 focus:outline-none focus:border-blue-500 text-sm placeholder:text-white/40 [.light_&]:placeholder:text-slate-400"
              disabled={loading}
            />
            <Button variant="primary" onClick={handleSend} disabled={loading || !input.trim()}>
              Send
            </Button>
          </div>
          <p className="text-xs text-white/40 [.light_&]:text-slate-600 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-semibold mb-4">Name Your Chat</h2>
            <input
              type="text"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  createNewChat();
                }
              }}
              placeholder="Enter chat name..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowNewChatModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={createNewChat} disabled={!newChatName.trim()}>
                Create Chat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
