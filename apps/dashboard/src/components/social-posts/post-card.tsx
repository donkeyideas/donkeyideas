'use client';

import { useState } from 'react';
import { Card, CardContent } from '@donkey-ideas/ui';
import { PlatformBadge } from './platform-badge';
import { CharacterCount } from './character-count';

interface PostCardProps {
  platform: string;
  content: string;
  hashtags: string[];
  imagePrompt?: string;
  editable?: boolean;
  onChange?: (content: string, hashtags: string[]) => void;
  actions?: React.ReactNode;
  statusBadge?: React.ReactNode;
}

export function PostCard({
  platform,
  content,
  hashtags,
  imagePrompt,
  editable = false,
  onChange,
  actions,
  statusBadge,
}: PostCardProps) {
  const [showHashtags, setShowHashtags] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [localContent, setLocalContent] = useState(content);
  const [localHashtags, setLocalHashtags] = useState(hashtags.join(', '));

  const handleContentChange = (val: string) => {
    setLocalContent(val);
    onChange?.(val, localHashtags.split(',').map((t) => t.trim()).filter(Boolean));
  };

  const handleHashtagChange = (val: string) => {
    setLocalHashtags(val);
    onChange?.(localContent, val.split(',').map((t) => t.trim()).filter(Boolean));
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <PlatformBadge platform={platform} size="md" />
          {statusBadge}
        </div>

        {editable ? (
          <textarea
            value={localContent}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full bg-white/5 [.light_&]:bg-slate-100 border border-white/10 [.light_&]:border-slate-300 rounded-md p-3 text-white [.light_&]:text-slate-900 text-sm resize-none focus:border-blue-500 focus:outline-none"
            rows={platform === 'TWITTER' || platform === 'TIKTOK' ? 3 : 5}
          />
        ) : (
          <p className="text-sm text-white/80 [.light_&]:text-slate-700 whitespace-pre-wrap">{content}</p>
        )}

        <CharacterCount current={editable ? localContent.length : content.length} platform={platform} />

        {/* Collapsible hashtags */}
        {(hashtags.length > 0 || editable) && (
          <div>
            <button
              onClick={() => setShowHashtags(!showHashtags)}
              className="text-xs text-white/40 [.light_&]:text-slate-500 hover:text-white/60 [.light_&]:hover:text-slate-700"
            >
              {showHashtags ? '▾' : '▸'} Hashtags ({editable ? localHashtags.split(',').filter((t) => t.trim()).length : hashtags.length})
            </button>
            {showHashtags && (
              editable ? (
                <input
                  value={localHashtags}
                  onChange={(e) => handleHashtagChange(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                  className="mt-1 w-full bg-white/5 [.light_&]:bg-slate-100 border border-white/10 [.light_&]:border-slate-300 rounded-md px-3 py-1.5 text-xs text-white [.light_&]:text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <div className="mt-1 flex flex-wrap gap-1">
                  {hashtags.map((tag, i) => (
                    <span key={i} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                      #{tag.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* Collapsible image prompt */}
        {imagePrompt && (
          <div>
            <button
              onClick={() => setShowImagePrompt(!showImagePrompt)}
              className="text-xs text-white/40 [.light_&]:text-slate-500 hover:text-white/60 [.light_&]:hover:text-slate-700"
            >
              {showImagePrompt ? '▾' : '▸'} Image Prompt
            </button>
            {showImagePrompt && (
              <p className="mt-1 text-xs text-white/50 [.light_&]:text-slate-500 italic">{imagePrompt}</p>
            )}
          </div>
        )}

        {actions && <div className="flex items-center gap-2 pt-2 border-t border-white/5 [.light_&]:border-slate-200">{actions}</div>}
      </CardContent>
    </Card>
  );
}
