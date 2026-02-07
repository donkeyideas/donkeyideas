'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api-client';
import { useTheme } from '@/contexts/theme-context';
import BlogEditor from '@/components/blog/blog-editor';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  published: boolean;
  publishedAt: string | null;
  wordCount: number;
  readTime: number;
  createdAt: string;
  author: { name: string };
}

export default function BlogListingPage() {
  const { theme } = useTheme();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/blog');
      setPosts(response.data.posts);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    setDeleting(id);
    try {
      await api.delete(`/blog/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      await api.put(`/blog/${post.id}`, { published: !post.published });
      setPosts(prev =>
        prev.map(p => p.id === post.id ? { ...p, published: !p.published } : p)
      );
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update');
    }
  };

  const cardBg = theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#1a1a2e]/80 border-white/10';
  const textMuted = theme === 'light' ? 'text-gray-500' : 'text-white/50';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            Blog Manager
          </h1>
          <p className={`mt-1 ${textMuted}`}>Create and manage blog posts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          + New Post
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-20 rounded-xl border animate-pulse ${cardBg}`} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className={`rounded-xl border p-16 text-center ${cardBg}`}>
          <h3 className={`text-xl font-medium mb-2 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
            No blog posts yet
          </h3>
          <p className={`mb-6 ${textMuted}`}>Create your first post to start building your content library.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 inline-flex items-center gap-2"
          >
            + Create First Post
          </button>
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
          <table className="w-full">
            <thead>
              <tr className={`border-b ${theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-white/5'}`}>
                <th className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Title</th>
                <th className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Status</th>
                <th className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Category</th>
                <th className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Words</th>
                <th className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Date</th>
                <th className={`text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr
                  key={post.id}
                  className={`border-b last:border-0 transition-colors ${
                    theme === 'light' ? 'border-gray-100 hover:bg-gray-50' : 'border-white/5 hover:bg-white/5'
                  }`}
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/app/blog/edit/${post.id}`}
                      className={`font-medium hover:text-blue-400 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}
                    >
                      {post.title}
                    </Link>
                    <div className={`text-xs mt-0.5 ${textMuted}`}>/blog/{post.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleTogglePublish(post)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        post.published
                          ? 'bg-green-500/20 text-green-400'
                          : theme === 'light'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {post.published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className={`px-6 py-4 text-sm ${textMuted}`}>
                    {post.category || '\u2014'}
                  </td>
                  <td className={`px-6 py-4 text-sm ${textMuted}`}>
                    {post.wordCount}
                  </td>
                  <td className={`px-6 py-4 text-sm ${textMuted}`}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/app/blog/edit/${post.id}`}
                        className="px-3 py-1.5 rounded text-xs font-medium text-blue-400 hover:bg-blue-500/10"
                      >
                        Edit
                      </Link>
                      {post.published && (
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="px-3 py-1.5 rounded text-xs font-medium text-green-400 hover:bg-green-500/10"
                        >
                          View
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deleting === post.id}
                        className="px-3 py-1.5 rounded text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deleting === post.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <BlogEditor
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            loadPosts();
          }}
        />
      )}
    </div>
  );
}
