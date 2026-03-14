'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import { PlatformBadge } from './platform-badge';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'FAILED', label: 'Failed' },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-500/20 text-yellow-400',
  SCHEDULED: 'bg-blue-500/20 text-blue-400',
  FAILED: 'bg-red-500/20 text-red-400',
  CANCELLED: 'bg-white/10 text-white/50',
};

interface Post {
  id: string;
  platform: string;
  content: string;
  status: string;
  hashtags: string[];
  scheduledAt: string | null;
  publishError: string | null;
  createdAt: string;
}

export function PostQueueTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      else params.set('status', 'DRAFT,SCHEDULED,FAILED');
      if (platformFilter) params.set('platform', platformFilter);

      const res = await api.get(`/social-posts?${params.toString()}`);
      setPosts(res.data.posts || []);
      setCounts(res.data.counts || {});
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [statusFilter, platformFilter]);

  const handlePublishNow = async (id: string) => {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      await api.post(`/social-posts/${id}/publish`);
      loadPosts();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to publish');
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      await api.delete(`/social-posts/${id}`);
      loadPosts();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete');
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const handleBulkApprove = async () => {
    try {
      const res = await api.post('/social-posts/bulk-approve', { approveAll: true });
      alert(`${res.data.updated} posts scheduled for ${new Date(res.data.scheduledAt).toLocaleString()}`);
      loadPosts();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to bulk approve');
    }
  };

  const draftCount = counts.DRAFT || 0;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['DRAFT', 'SCHEDULED', 'FAILED', 'CANCELLED'].map((s) => (
          <Card key={s}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-white [.light_&]:text-slate-900">{counts[s] || 0}</p>
              <p className="text-xs text-white/50 [.light_&]:text-slate-500 capitalize">{s.toLowerCase()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + bulk action */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 [.light_&]:bg-white border border-white/10 [.light_&]:border-slate-300 rounded-md px-3 py-1.5 text-sm text-white [.light_&]:text-slate-900 focus:outline-none"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
          ))}
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="bg-white/5 [.light_&]:bg-white border border-white/10 [.light_&]:border-slate-300 rounded-md px-3 py-1.5 text-sm text-white [.light_&]:text-slate-900 focus:outline-none"
        >
          <option value="" className="bg-slate-900">All Platforms</option>
          {['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK'].map((p) => (
            <option key={p} value={p} className="bg-slate-900">{p}</option>
          ))}
        </select>

        {draftCount > 0 && (
          <Button variant="primary" size="sm" onClick={handleBulkApprove} className="ml-auto">
            Approve all {draftCount} drafts
          </Button>
        )}
      </div>

      {/* Posts table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-white/40 [.light_&]:text-slate-400">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-white/40 [.light_&]:text-slate-400">No posts in queue</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 [.light_&]:border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 [.light_&]:text-slate-500 uppercase">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 [.light_&]:text-slate-500 uppercase">Content</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 [.light_&]:text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 [.light_&]:text-slate-500 uppercase">Scheduled</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/40 [.light_&]:text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-b border-white/5 [.light_&]:border-slate-100 hover:bg-white/[0.02] [.light_&]:hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <PlatformBadge platform={post.platform} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white/80 [.light_&]:text-slate-700 truncate max-w-xs">
                          {post.content}
                        </p>
                        {post.publishError && (
                          <p className="text-xs text-red-400 mt-0.5">{post.publishError}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[post.status] || ''}`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/50 [.light_&]:text-slate-500">
                        {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(post.status === 'DRAFT' || post.status === 'SCHEDULED') && (
                            <button
                              onClick={() => handlePublishNow(post.id)}
                              disabled={actionLoading[post.id]}
                              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                            >
                              Publish Now
                            </button>
                          )}
                          {post.status !== 'PUBLISHED' && (
                            <button
                              onClick={() => handleDelete(post.id)}
                              disabled={actionLoading[post.id]}
                              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
