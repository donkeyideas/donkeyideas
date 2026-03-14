'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import { PlatformBadge } from './platform-badge';

interface PublishedPost {
  id: string;
  platform: string;
  content: string;
  publishedAt: string;
  platformPostId: string | null;
}

const PLATFORM_LIST = ['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK'];

export function PostPublishedTab() {
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState('');
  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadPosts();
  }, [platformFilter]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'PUBLISHED' });
      if (platformFilter) params.set('platform', platformFilter);

      const res = await api.get(`/social-posts?${params.toString()}`);
      setPosts(res.data.posts || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Load platform counts on mount
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const res = await api.get('/social-posts?status=PUBLISHED&limit=1');
        // Count from all published posts
        const allRes = await api.get('/social-posts?status=PUBLISHED&limit=100');
        const counts: Record<string, number> = {};
        (allRes.data.posts || []).forEach((p: any) => {
          counts[p.platform] = (counts[p.platform] || 0) + 1;
        });
        setPlatformCounts(counts);
      } catch {}
    };
    loadCounts();
  }, []);

  const totalPublished = Object.values(platformCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-white [.light_&]:text-slate-900">{totalPublished}</p>
            <p className="text-xs text-white/50 [.light_&]:text-slate-500">Total Published</p>
          </CardContent>
        </Card>
        {PLATFORM_LIST.map((p) => (
          <Card key={p}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-white [.light_&]:text-slate-900">{platformCounts[p] || 0}</p>
              <p className="text-xs text-white/50 [.light_&]:text-slate-500">{p}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="bg-white/5 [.light_&]:bg-white border border-white/10 [.light_&]:border-slate-300 rounded-md px-3 py-1.5 text-sm text-white [.light_&]:text-slate-900 focus:outline-none"
        >
          <option value="" className="bg-slate-900">All Platforms</option>
          {PLATFORM_LIST.map((p) => (
            <option key={p} value={p} className="bg-slate-900">{p}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-white/40 [.light_&]:text-slate-400">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-white/40 [.light_&]:text-slate-400">No published posts yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 [.light_&]:border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 [.light_&]:text-slate-500 uppercase">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 [.light_&]:text-slate-500 uppercase">Content</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 [.light_&]:text-slate-500 uppercase">Published</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40 [.light_&]:text-slate-500 uppercase">Post ID</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-b border-white/5 [.light_&]:border-slate-100 hover:bg-white/[0.02] [.light_&]:hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <PlatformBadge platform={post.platform} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white/80 [.light_&]:text-slate-700 truncate max-w-md">{post.content}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/50 [.light_&]:text-slate-500">
                        {new Date(post.publishedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/30 [.light_&]:text-slate-400 font-mono">
                        {post.platformPostId || '—'}
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
