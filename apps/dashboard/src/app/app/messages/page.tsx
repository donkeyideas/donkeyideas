'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  interest: string;
  source: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadMessages = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/admin/messages?filter=${filter}&source=${sourceFilter}&page=${page}&limit=20`);
      setMessages(response.data.messages || []);
      setPagination(response.data.pagination);
      setUnreadCount(response.data.unreadCount || 0);
      setAvailableSources(response.data.sources || []);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err.response?.data?.error?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [filter, sourceFilter]);

  const handleMarkAsRead = async (id: string, read: boolean) => {
    try {
      await api.patch(`/admin/messages/${id}`, { read });
      // Update local state
      setMessages(prev =>
        prev.map(msg =>
          msg.id === id ? { ...msg, read, readAt: read ? new Date().toISOString() : null } : msg
        )
      );
      setUnreadCount(prev => (read ? prev - 1 : prev + 1));
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => (prev ? { ...prev, read, readAt: read ? new Date().toISOString() : null } : null));
      }
    } catch (err) {
      console.error('Failed to update message:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await api.delete(`/admin/messages/${id}`);
      setMessages(prev => prev.filter(msg => msg.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      // Reload to update counts
      loadMessages(pagination?.page || 1);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getInterestLabel = (interest: string) => {
    const labels: Record<string, string> = {
      search: 'Search Engine',
      social: 'Social Media',
      referral: 'Referral',
      event: 'Event/Conference',
      other: 'Other',
      platform: 'Platform',
      services: 'Services',
      partnership: 'Partnership',
    };
    return labels[interest] || interest;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">
            Contact Messages
          </h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            Messages from all your website contact forms
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-white/5 [.light_&]:bg-slate-100 rounded-lg p-1 w-fit">
          {(['all', 'unread', 'read'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm rounded-md transition-colors capitalize ${
                filter === f
                  ? 'bg-blue-500 text-white'
                  : 'text-white/60 [.light_&]:text-slate-600 hover:text-white [.light_&]:hover:text-slate-900'
              }`}
            >
              {f}
              {f === 'unread' && unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Source Filter */}
        {availableSources.length > 1 && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg bg-white/5 [.light_&]:bg-slate-100 border border-white/10 [.light_&]:border-slate-300 text-white [.light_&]:text-slate-900 outline-none"
          >
            <option value="">All Sources</option>
            {availableSources.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-red-400 mb-2">Error loading messages</div>
              <div className="text-white/60 text-sm">{error}</div>
              <Button variant="primary" onClick={() => loadMessages()} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white [.light_&]:text-slate-900 mb-2">
                No messages yet
              </h3>
              <p className="text-white/60 [.light_&]:text-slate-500">
                When someone submits the contact form on your website, their message will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-1 space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => {
                  setSelectedMessage(msg);
                  if (!msg.read) {
                    handleMarkAsRead(msg.id, true);
                  }
                }}
                className={`p-4 rounded-lg cursor-pointer transition-all border ${
                  selectedMessage?.id === msg.id
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : msg.read
                    ? 'bg-white/5 [.light_&]:bg-slate-50 border-white/10 [.light_&]:border-slate-200 hover:bg-white/10 [.light_&]:hover:bg-slate-100'
                    : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {!msg.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                    <span className={`font-medium ${msg.read ? 'text-white/80 [.light_&]:text-slate-700' : 'text-white [.light_&]:text-slate-900'}`}>
                      {msg.name}
                    </span>
                  </div>
                  <span className="text-xs text-white/40 [.light_&]:text-slate-400 flex-shrink-0">
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
                <div className="text-sm text-white/50 [.light_&]:text-slate-500 truncate">
                  {msg.email}
                </div>
                {msg.source && msg.source !== 'donkey-ideas' && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 [.light_&]:text-emerald-600 rounded text-xs font-medium">
                    {msg.source.charAt(0).toUpperCase() + msg.source.slice(1).replace(/-/g, ' ')}
                  </span>
                )}
                <div className="text-sm text-white/60 [.light_&]:text-slate-600 line-clamp-2 mt-1">
                  {msg.message}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadMessages(pagination.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-white/60">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadMessages(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-2">
            {selectedMessage ? (
              <Card>
                <CardHeader className="border-b border-white/10 [.light_&]:border-slate-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{selectedMessage.name}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-white/60 [.light_&]:text-slate-500">
                        <a href={`mailto:${selectedMessage.email}`} className="hover:text-blue-400 transition-colors">
                          {selectedMessage.email}
                        </a>
                        {selectedMessage.company && (
                          <>
                            <span>•</span>
                            <span>{selectedMessage.company}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(selectedMessage.id, !selectedMessage.read)}
                      >
                        {selectedMessage.read ? 'Mark Unread' : 'Mark Read'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(selectedMessage.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-white/50 [.light_&]:text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(selectedMessage.createdAt).toLocaleString()}
                      </div>
                      {selectedMessage.source && (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 [.light_&]:text-emerald-600 rounded text-xs">
                            From: {selectedMessage.source.charAt(0).toUpperCase() + selectedMessage.source.slice(1).replace(/-/g, ' ')}
                          </span>
                        </div>
                      )}
                      {selectedMessage.interest && (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                            Interest: {getInterestLabel(selectedMessage.interest)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="bg-white/5 [.light_&]:bg-slate-50 rounded-lg p-4">
                      <p className="text-white/80 [.light_&]:text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedMessage.message}
                      </p>
                    </div>

                    {/* Reply Button */}
                    <div className="pt-4">
                      <a
                        href={`mailto:${selectedMessage.email}?subject=Re: Your inquiry to ${selectedMessage.source ? selectedMessage.source.charAt(0).toUpperCase() + selectedMessage.source.slice(1).replace(/-/g, ' ') : 'Donkey Ideas'}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Reply via Email
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center text-white/40 [.light_&]:text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p>Select a message to view details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
