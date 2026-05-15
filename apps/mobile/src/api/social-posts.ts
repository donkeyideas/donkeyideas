import { api } from './client';

export type Platform = 'TWITTER' | 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK';
export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'PENDING_APPROVAL';

export interface SocialPost {
  id: string;
  platform: Platform;
  content: string;
  hashtags: string[];
  imagePrompt?: string;
  tone?: string;
  topic?: string;
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface SocialPostsResponse {
  posts: SocialPost[];
  pagination: { page: number; limit: number; total: number; pages: number };
  counts: Record<string, number>;
}

export async function getSocialPosts(status?: string, platform?: string, page = 1): Promise<SocialPostsResponse> {
  const { data } = await api.get('/social-posts', {
    params: { status, platform, page, limit: 50 },
  });
  return data;
}

export async function createSocialPost(post: {
  platform: Platform;
  content: string;
  hashtags?: string[];
  status?: 'DRAFT' | 'SCHEDULED';
  scheduledAt?: string;
}): Promise<SocialPost> {
  const { data } = await api.post('/social-posts', post);
  return data.post || data;
}

export async function publishPost(id: string): Promise<void> {
  await api.post(`/social-posts/${id}/publish`);
}

export async function deletePost(id: string): Promise<void> {
  await api.delete(`/social-posts/${id}`);
}

export async function generatePost(topic: string, platform: Platform, tone?: string): Promise<{ content: string; hashtags: string[] }> {
  const { data } = await api.post('/social-posts/generate', { topic, platform, tone });
  return data;
}
