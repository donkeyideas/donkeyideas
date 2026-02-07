'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import BlogEditor from '@/components/blog/blog-editor';
import api from '@/lib/api-client';
import { useTheme } from '@/contexts/theme-context';

export default function EditBlogPostPage() {
  const params = useParams();
  const { theme } = useTheme();
  const postId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const response = await api.get(`/blog/${postId}`);
        const post = response.data.post;
        setInitialData({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt || '',
          content: post.content,
          category: post.category || '',
          tags: post.tags || [],
          featuredImage: post.featuredImage || '',
          published: post.published,
          seoTitle: post.seoTitle || '',
          seoDescription: post.seoDescription || '',
          seoKeywords: post.seoKeywords || [],
          focusKeyword: post.focusKeyword || '',
        });
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className={`text-lg ${theme === 'light' ? 'text-gray-500' : 'text-white/50'}`}>Loading post...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <BlogEditor mode="edit" postId={postId} initialData={initialData} />
    </div>
  );
}
