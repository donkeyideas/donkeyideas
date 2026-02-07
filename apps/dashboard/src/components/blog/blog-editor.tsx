'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api-client';
import { useTheme } from '@/contexts/theme-context';

interface BlogPostData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  featuredImage: string;
  published: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  focusKeyword: string;
}

interface BlogEditorProps {
  mode: 'create' | 'edit';
  postId?: string;
  initialData?: BlogPostData;
}

function calculateSeoScore(data: BlogPostData): { score: number; suggestions: string[] } {
  let score = 0;
  const suggestions: string[] = [];

  // Title: 15 pts
  if (data.title && data.title.length >= 30 && data.title.length <= 60) {
    score += 15;
  } else if (data.title) {
    score += 5;
    suggestions.push('Optimize title length (30-60 characters)');
  } else {
    suggestions.push('Add a title');
  }

  // Excerpt: 10 pts
  if (data.excerpt && data.excerpt.length >= 100) {
    score += 10;
  } else if (data.excerpt) {
    score += 3;
    suggestions.push('Expand excerpt to 100+ characters');
  } else {
    suggestions.push('Add an excerpt');
  }

  // Content word count: 20 pts
  const wordCount = countWords(data.content);
  if (wordCount >= 500) {
    score += 20;
  } else if (wordCount >= 200) {
    score += 10;
    suggestions.push('Expand content to 500+ words');
  } else {
    suggestions.push('Add more content (500+ words recommended)');
  }

  // Focus keyword in title: 10 pts
  if (data.focusKeyword && data.title.toLowerCase().includes(data.focusKeyword.toLowerCase())) {
    score += 10;
  } else if (data.focusKeyword) {
    suggestions.push('Include your focus keyword in the title');
  } else {
    suggestions.push('Set a focus keyword');
  }

  // Focus keyword in excerpt: 5 pts
  if (data.focusKeyword && data.excerpt.toLowerCase().includes(data.focusKeyword.toLowerCase())) {
    score += 5;
  } else if (data.focusKeyword && data.excerpt) {
    suggestions.push('Include your focus keyword in the excerpt');
  }

  // Focus keyword in content: 10 pts
  if (data.focusKeyword && data.content.toLowerCase().includes(data.focusKeyword.toLowerCase())) {
    score += 10;
  } else if (data.focusKeyword) {
    suggestions.push('Include your focus keyword in the content');
  }

  // Meta description: 10 pts
  const metaDesc = data.seoDescription || data.excerpt;
  if (metaDesc && metaDesc.length >= 120 && metaDesc.length <= 160) {
    score += 10;
  } else if (metaDesc) {
    score += 3;
    suggestions.push('Optimize meta description (120-160 characters)');
  } else {
    suggestions.push('Add a meta description');
  }

  // Featured image: 10 pts
  if (data.featuredImage) {
    score += 10;
  } else {
    suggestions.push('Add a featured image');
  }

  // Category: 5 pts
  if (data.category) {
    score += 5;
  } else {
    suggestions.push('Assign a category');
  }

  // Tags: 5 pts
  if (data.tags.length > 0) {
    score += 5;
  } else {
    suggestions.push('Add tags');
  }

  return { score, suggestions };
}

function countWords(text: string): number {
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped ? stripped.split(/\s+/).length : 0;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export default function BlogEditor({ mode, postId, initialData }: BlogEditorProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [seoKeywordInput, setSeoKeywordInput] = useState('');

  const [formData, setFormData] = useState<BlogPostData>(
    initialData || {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      category: '',
      tags: [],
      featuredImage: '',
      published: false,
      seoTitle: '',
      seoDescription: '',
      seoKeywords: [],
      focusKeyword: '',
    }
  );

  // Auto-generate slug from title
  useEffect(() => {
    if (mode === 'create' && formData.title && !initialData?.slug) {
      setFormData(prev => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [formData.title, mode, initialData?.slug]);

  const wordCount = countWords(formData.content);
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const { score: seoScore, suggestions } = calculateSeoScore(formData);

  const getSeoScoreColor = useCallback((s: number) => {
    if (s >= 80) return 'text-green-400 border-green-500';
    if (s >= 50) return 'text-yellow-400 border-yellow-500';
    return 'text-red-400 border-red-500';
  }, []);

  const getSeoScoreBg = useCallback((s: number) => {
    if (s >= 80) return 'bg-green-500/20';
    if (s >= 50) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  }, []);

  const handleGenerateAI = async () => {
    const topic = formData.title || prompt('Enter a topic for the blog post:');
    if (!topic) return;

    setGenerating(true);
    setError(null);

    try {
      const response = await api.post('/blog/generate', { topic });
      const { generated } = response.data;

      setFormData(prev => ({
        ...prev,
        title: generated.title || prev.title,
        slug: generated.slug || generateSlug(generated.title || prev.title),
        excerpt: generated.excerpt || prev.excerpt,
        content: generated.content || prev.content,
        category: generated.category || prev.category,
        tags: generated.tags || prev.tags,
        seoTitle: generated.seoTitle || prev.seoTitle,
        seoDescription: generated.seoDescription || prev.seoDescription,
        seoKeywords: generated.seoKeywords || prev.seoKeywords,
        focusKeyword: generated.focusKeyword || prev.focusKeyword,
      }));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (publish?: boolean) => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        published: publish !== undefined ? publish : formData.published,
      };

      if (mode === 'edit' && postId) {
        await api.put(`/blog/${postId}`, payload);
      } else {
        await api.post('/blog', payload);
      }

      router.push('/app/blog');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const insertFormatting = (tag: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = formData.content.substring(start, end);
    let insertion = '';

    switch (tag) {
      case 'bold':
        insertion = `<strong>${selected || 'bold text'}</strong>`;
        break;
      case 'italic':
        insertion = `<em>${selected || 'italic text'}</em>`;
        break;
      case 'list':
        insertion = `<ul>\n<li>${selected || 'List item'}</li>\n<li>List item</li>\n</ul>`;
        break;
      case 'h2':
        insertion = `<h2>${selected || 'Heading'}</h2>`;
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          insertion = `<a href="${url}">${selected || 'Link text'}</a>`;
        } else {
          return;
        }
        break;
      case 'image':
        const imgUrl = prompt('Enter image URL:');
        if (imgUrl) {
          insertion = `<img src="${imgUrl}" alt="${selected || 'Image'}" />`;
        } else {
          return;
        }
        break;
      default:
        return;
    }

    const newContent = formData.content.substring(0, start) + insertion + formData.content.substring(end);
    setFormData(prev => ({ ...prev, content: newContent }));

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + insertion.length;
      textarea.selectionEnd = start + insertion.length;
    }, 0);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSeoKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && seoKeywordInput.trim()) {
      e.preventDefault();
      if (!formData.seoKeywords.includes(seoKeywordInput.trim())) {
        setFormData(prev => ({ ...prev, seoKeywords: [...prev.seoKeywords, seoKeywordInput.trim()] }));
      }
      setSeoKeywordInput('');
    }
  };

  const removeSeoKeyword = (kw: string) => {
    setFormData(prev => ({ ...prev, seoKeywords: prev.seoKeywords.filter(k => k !== kw) }));
  };

  const inputClass = `w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
    theme === 'light'
      ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
      : 'bg-black/30 border-white/20 text-white placeholder-white/40'
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`;

  return (
    <div className="flex flex-col h-full">
      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className={`w-72 flex-shrink-0 p-6 border-r overflow-y-auto ${
          theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-black/20'
        }`}>
          {/* SEO Score */}
          <div className={`rounded-xl p-6 mb-6 ${getSeoScoreBg(seoScore)}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>SEO Score</h3>
              <button
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                  theme === 'light' ? 'border-gray-400 text-gray-400' : 'border-white/40 text-white/40'
                }`}
                title="SEO Score is calculated based on title, content, keywords, and metadata optimization"
              >
                i
              </button>
            </div>
            <div className={`text-5xl font-bold text-center mb-1 ${getSeoScoreColor(seoScore)}`}>
              {seoScore}
            </div>
            <div className={`text-xs text-center ${theme === 'light' ? 'text-gray-500' : 'text-white/50'}`}>SEO Score</div>
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-6">
              <h3 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>AI Suggestions</h3>
              <div className="space-y-2">
                {suggestions.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-yellow-400 mt-0.5">💡</span>
                    <span className={theme === 'light' ? 'text-gray-600' : 'text-white/60'}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post Settings */}
          <div className="mb-6">
            <h3 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>Post Settings</h3>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g., Investing, Finance, Educ"
                />
              </div>
              <div>
                <label className={labelClass}>Tags</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className={inputClass}
                  placeholder="Add tag and press Enter"
                />
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                          theme === 'light'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-red-400">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>Featured Image</h3>
            <button className={`w-full px-4 py-2 rounded-lg border border-dashed text-sm mb-2 ${
              theme === 'light'
                ? 'border-gray-300 text-blue-600 hover:bg-gray-100'
                : 'border-white/20 text-blue-400 hover:bg-white/5'
            }`}>
              Upload Image
            </button>
            <div className={`text-xs mb-2 ${theme === 'light' ? 'text-gray-500' : 'text-white/40'}`}>Or enter image URL</div>
            <input
              type="text"
              value={formData.featuredImage}
              onChange={e => setFormData(prev => ({ ...prev, featuredImage: e.target.value }))}
              className={`${inputClass} text-xs`}
              placeholder="https://example.com/image.jpg"
            />
            {formData.featuredImage && (
              <div className="mt-2">
                <div className={`text-xs mb-1 ${theme === 'light' ? 'text-gray-500' : 'text-white/40'}`}>Preview</div>
                <img
                  src={formData.featuredImage}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className={`flex gap-1 px-6 pt-4 border-b ${
            theme === 'light' ? 'border-gray-200' : 'border-white/10'
          }`}>
            <button
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === 'content'
                  ? theme === 'light'
                    ? 'bg-white text-blue-600 border border-b-0 border-gray-200'
                    : 'bg-blue-500/20 text-blue-400 border border-b-0 border-white/10'
                  : theme === 'light'
                    ? 'text-gray-500 hover:text-gray-700'
                    : 'text-white/50 hover:text-white/80'
              }`}
            >
              📄 Content
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === 'seo'
                  ? theme === 'light'
                    ? 'bg-white text-blue-600 border border-b-0 border-gray-200'
                    : 'bg-blue-500/20 text-blue-400 border border-b-0 border-white/10'
                  : theme === 'light'
                    ? 'text-gray-500 hover:text-gray-700'
                    : 'text-white/50 hover:text-white/80'
              }`}
            >
              ⚙️ SEO
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'content' ? (
              <div className="space-y-5 max-w-3xl">
                {/* Title + Generate */}
                <div>
                  <label className={labelClass}>Title *</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className={`${inputClass} flex-1`}
                      placeholder="Enter blog post title"
                    />
                    <button
                      onClick={handleGenerateAI}
                      disabled={generating}
                      className="px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
                    >
                      ✨ {generating ? 'Generating...' : 'Generate with AI'}
                    </button>
                  </div>
                </div>

                {/* Slug */}
                <div>
                  <label className={labelClass}>Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className={inputClass}
                    placeholder="url-friendly-slug"
                  />
                </div>

                {/* Excerpt */}
                <div>
                  <label className={labelClass}>Excerpt</label>
                  <textarea
                    value={formData.excerpt}
                    onChange={e => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                    className={`${inputClass} resize-none`}
                    rows={3}
                    placeholder="Brief description of the post"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className={labelClass}>Content *</label>
                  {/* Toolbar */}
                  <div className={`flex items-center gap-1 p-2 rounded-t-lg border border-b-0 ${
                    theme === 'light' ? 'border-gray-300 bg-gray-100' : 'border-white/20 bg-white/5'
                  }`}>
                    <button
                      onClick={() => insertFormatting('link')}
                      className={`px-3 py-1.5 rounded text-xs font-medium ${
                        theme === 'light'
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                      }`}
                    >
                      🔗 Add Link
                    </button>
                    <button
                      onClick={() => insertFormatting('bold')}
                      className={`px-3 py-1.5 rounded text-xs font-bold ${
                        theme === 'light' ? 'hover:bg-gray-200 text-gray-700' : 'hover:bg-white/10 text-white/70'
                      }`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => insertFormatting('italic')}
                      className={`px-3 py-1.5 rounded text-xs italic ${
                        theme === 'light' ? 'hover:bg-gray-200 text-gray-700' : 'hover:bg-white/10 text-white/70'
                      }`}
                    >
                      I
                    </button>
                    <button
                      onClick={() => insertFormatting('list')}
                      className={`px-3 py-1.5 rounded text-xs ${
                        theme === 'light'
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                      }`}
                    >
                      ≡ List
                    </button>
                    <button
                      onClick={() => insertFormatting('image')}
                      className={`px-3 py-1.5 rounded text-xs ${
                        theme === 'light'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      🖼 Image
                    </button>
                    <button
                      onClick={() => insertFormatting('h2')}
                      className={`px-3 py-1.5 rounded text-xs ${
                        theme === 'light'
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                      }`}
                    >
                      H2
                    </button>
                  </div>
                  <div className={`p-2 border border-t-0 rounded-b-lg text-xs ${
                    theme === 'light' ? 'border-gray-300 bg-yellow-50 text-yellow-700' : 'border-white/20 bg-yellow-500/10 text-yellow-400'
                  }`}>
                    💡 Tip: To add a hyperlink, click &quot;Add Link&quot; and enter the URL. You can also select text first to use it as the link text.
                  </div>
                  <textarea
                    ref={contentRef}
                    value={formData.content}
                    onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className={`${inputClass} rounded-t-none border-t-0 resize-y font-mono text-sm`}
                    rows={16}
                    placeholder="Write your blog post content here... Use the toolbar above to add links and formatting."
                  />
                </div>
              </div>
            ) : (
              /* SEO Tab */
              <div className="space-y-5 max-w-3xl">
                <div>
                  <label className={labelClass}>Meta Title</label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={e => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                    className={inputClass}
                    placeholder="SEO optimized title (defaults to post title)"
                  />
                  <div className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-white/40'}`}>
                    {(formData.seoTitle || formData.title).length}/60 characters
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Meta Description</label>
                  <textarea
                    value={formData.seoDescription}
                    onChange={e => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                    className={`${inputClass} resize-none`}
                    rows={3}
                    placeholder="Brief meta description for search engines (defaults to excerpt)"
                  />
                  <div className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-white/40'}`}>
                    {(formData.seoDescription || formData.excerpt).length}/160 characters
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Focus Keyword</label>
                  <input
                    type="text"
                    value={formData.focusKeyword}
                    onChange={e => setFormData(prev => ({ ...prev, focusKeyword: e.target.value }))}
                    className={inputClass}
                    placeholder="Main keyword to optimize for"
                  />
                </div>

                <div>
                  <label className={labelClass}>SEO Keywords</label>
                  <input
                    type="text"
                    value={seoKeywordInput}
                    onChange={e => setSeoKeywordInput(e.target.value)}
                    onKeyDown={handleSeoKeywordKeyDown}
                    className={inputClass}
                    placeholder="Add keyword and press Enter"
                  />
                  {formData.seoKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.seoKeywords.map(kw => (
                        <span
                          key={kw}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                            theme === 'light'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-green-500/20 text-green-300'
                          }`}
                        >
                          {kw}
                          <button onClick={() => removeSeoKeyword(kw)} className="hover:text-red-400">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Google Preview */}
                <div>
                  <label className={labelClass}>Google Preview</label>
                  <div className={`p-4 rounded-lg border ${
                    theme === 'light' ? 'border-gray-200 bg-white' : 'border-white/10 bg-white/5'
                  }`}>
                    <div className="text-blue-500 text-lg truncate">
                      {formData.seoTitle || formData.title || 'Page Title'}
                    </div>
                    <div className="text-green-600 text-sm truncate">
                      donkeyideas.com/blog/{formData.slug || 'post-slug'}
                    </div>
                    <div className={`text-sm mt-1 line-clamp-2 ${theme === 'light' ? 'text-gray-600' : 'text-white/60'}`}>
                      {formData.seoDescription || formData.excerpt || 'Meta description will appear here...'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          <div className={`flex items-center justify-between px-6 py-4 border-t ${
            theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-black/20'
          }`}>
            <div className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-white/50'}`}>
              {wordCount} words &bull; ~{readTime} min read
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/app/blog')}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium border ${
                  theme === 'light'
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    : 'border-white/20 text-white/70 hover:bg-white/5'
                }`}
              >
                Cancel
              </button>
              {mode === 'edit' && (
                <button
                  onClick={() => handleSave(!formData.published)}
                  disabled={saving}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium border ${
                    theme === 'light'
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                      : 'border-white/20 text-white/70 hover:bg-white/5'
                  }`}
                >
                  {formData.published ? 'Unpublish' : 'Publish'}
                </button>
              )}
              <button
                onClick={() => handleSave()}
                disabled={saving || !formData.title || !formData.content}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                📋 {saving ? 'Saving...' : mode === 'create' ? 'Create Post' : 'Update Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
