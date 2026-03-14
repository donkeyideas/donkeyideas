'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import { PostCard } from './post-card';
import { PLATFORMS, PlatformBadge } from './platform-badge';

const TONES = ['informative', 'engaging', 'promotional', 'controversial'] as const;

interface GeneratedPost {
  platform: string;
  content: string;
  hashtags: string[];
  imagePrompt: string;
}

export function PostGeneratorTab() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<string>('engaging');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['TWITTER', 'LINKEDIN']);
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [errors, setErrors] = useState<{ platform: string; error: string }[]>([]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) return;
    setGenerating(true);
    setGeneratedPosts([]);
    setErrors([]);
    setSaved({});

    try {
      const res = await api.post('/social-posts/generate', {
        topic: topic.trim(),
        tone,
        platforms: selectedPlatforms,
      });
      setGeneratedPosts(res.data.posts || []);
      setErrors(res.data.errors || []);
    } catch (err: any) {
      setErrors([{ platform: 'all', error: err.response?.data?.error?.message || 'Generation failed' }]);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async (post: GeneratedPost) => {
    setSaving((p) => ({ ...p, [post.platform]: true }));
    try {
      await api.post('/social-posts', {
        platform: post.platform,
        content: post.content,
        hashtags: post.hashtags,
        imagePrompt: post.imagePrompt,
        tone,
        topic: topic.trim(),
        status: 'DRAFT',
      });
      setSaved((p) => ({ ...p, [post.platform]: true }));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to save draft');
    } finally {
      setSaving((p) => ({ ...p, [post.platform]: false }));
    }
  };

  const handleApprove = async (post: GeneratedPost) => {
    setSaving((p) => ({ ...p, [post.platform]: true }));
    try {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(9, 0, 0, 0);

      await api.post('/social-posts', {
        platform: post.platform,
        content: post.content,
        hashtags: post.hashtags,
        imagePrompt: post.imagePrompt,
        tone,
        topic: topic.trim(),
        status: 'SCHEDULED',
        scheduledAt: tomorrow.toISOString(),
      });
      setSaved((p) => ({ ...p, [post.platform]: true }));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to schedule post');
    } finally {
      setSaving((p) => ({ ...p, [post.platform]: false }));
    }
  };

  const handleDiscard = (platform: string) => {
    setGeneratedPosts((prev) => prev.filter((p) => p.platform !== platform));
  };

  const handlePostChange = (platform: string, content: string, hashtags: string[]) => {
    setGeneratedPosts((prev) =>
      prev.map((p) => (p.platform === platform ? { ...p, content, hashtags } : p))
    );
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Social Media Posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-white/70 [.light_&]:text-slate-600 mb-1">
              Topic / Theme
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., The future of AI in business consulting (optional — leave blank for a random topic)"
              className="w-full bg-white/5 [.light_&]:bg-white border border-white/10 [.light_&]:border-slate-300 rounded-md px-4 py-2.5 text-white [.light_&]:text-slate-900 placeholder-white/30 [.light_&]:placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium text-white/70 [.light_&]:text-slate-600 mb-2">
              Tone
            </label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                    tone === t
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-white/5 [.light_&]:bg-slate-100 text-white/50 [.light_&]:text-slate-500 border border-white/10 [.light_&]:border-slate-300 hover:text-white/80 [.light_&]:hover:text-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-sm font-medium text-white/70 [.light_&]:text-slate-600 mb-2">
              Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`transition-all ${
                    selectedPlatforms.includes(p)
                      ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent rounded-full'
                      : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  <PlatformBadge platform={p} size="md" />
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={selectedPlatforms.length === 0 || generating}
            className="w-full sm:w-auto"
          >
            {generating ? 'Generating...' : `Generate ${selectedPlatforms.length} Post${selectedPlatforms.length !== 1 ? 's' : ''}`}
          </Button>
        </CardContent>
      </Card>

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            {errors.map((err, i) => (
              <p key={i} className="text-sm text-red-400">
                {err.platform !== 'all' && <span className="font-medium">{err.platform}: </span>}
                {err.error}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Generated Posts */}
      {generatedPosts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {generatedPosts.map((post) => (
            <PostCard
              key={post.platform}
              platform={post.platform}
              content={post.content}
              hashtags={post.hashtags}
              imagePrompt={post.imagePrompt}
              editable={!saved[post.platform]}
              onChange={(content, hashtags) => handlePostChange(post.platform, content, hashtags)}
              actions={
                saved[post.platform] ? (
                  <span className="text-sm text-green-400">Saved!</span>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(post)}
                      disabled={saving[post.platform]}
                    >
                      {saving[post.platform] ? '...' : 'Approve'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSaveDraft(post)}
                      disabled={saving[post.platform]}
                    >
                      Save Draft
                    </Button>
                    <button
                      onClick={() => handleDiscard(post.platform)}
                      className="text-xs text-white/30 [.light_&]:text-slate-400 hover:text-red-400 ml-auto"
                    >
                      Discard
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(post.content)}
                      className="text-xs text-white/30 [.light_&]:text-slate-400 hover:text-white/60 [.light_&]:hover:text-slate-600"
                    >
                      Copy
                    </button>
                  </>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
