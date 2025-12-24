'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import { NotificationModal } from '@/components/ui/notification-modal';

interface EditContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: {
    key: string;
    name: string;
    content?: any;
    published?: boolean;
  };
  onSave: () => void;
}

export function EditContentModal({
  isOpen,
  onClose,
  section,
  onSave,
}: EditContentModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && section) {
      // Initialize form data based on section type
      if (section.key === 'hero') {
        setFormData(section.content || {
          label: '',
          headline: '',
          description: '',
          cta: {
            primary: { text: '', link: '' },
            secondary: { text: '', link: '' },
          },
        });
      } else if (section.key === 'stats') {
        setFormData(section.content || {
          items: [
            { value: '10+', label: 'Active Ventures' },
            { value: '$50M+', label: 'Capital Deployed' },
            { value: '15+', label: 'Team Members' },
            { value: '5+', label: 'Years Experience' },
          ],
        });
      } else if (section.key === 'about') {
        setFormData(section.content || {
          title: '',
          text: '',
        });
      } else if (section.key === 'services') {
        setFormData(section.content || {
          title: '',
          subtitle: '',
          items: [
            { title: '', description: '' },
            { title: '', description: '' },
            { title: '', description: '' },
          ],
        });
      } else if (section.key === 'ventures') {
        setFormData(section.content || {
          title: 'Current Ventures',
          subtitle: 'Our Portfolio',
          items: [
            { title: '', description: '', imageUrl: '', link: '' },
            { title: '', description: '', imageUrl: '', link: '' },
            { title: '', description: '', imageUrl: '', link: '' },
          ],
        });
      } else if (section.key === 'ventures-page') {
        setFormData(section.content || {
          hero: {
            subtitle: 'Production systems generating measurable impact',
          },
          ventures: [
            {
              status: 'PRODUCTION',
              statusColor: 'teal',
              category: 'ENTERPRISE PLATFORM',
              title: 'AI Workflow Engine',
              description: 'Autonomous process orchestration system handling complex multi-step workflows across enterprise infrastructure.',
              tags: ['Custom LLM', 'Distributed Systems', 'Real-time Processing'],
              gradient: 'from-blue-950/40 to-blue-900/30',
              imageUrl: '',
            },
            {
              status: 'PRODUCTION',
              statusColor: 'purple',
              category: 'DATA ANALYTICS',
              title: 'Market Intelligence Platform',
              description: 'Real-time competitive intelligence aggregation and analysis platform for strategic decision-making.',
              tags: ['Neural Networks', 'Data Pipeline', 'Predictive Models'],
              gradient: 'from-purple-950/40 to-pink-950/30',
              imageUrl: '',
            },
            {
              status: 'BETA',
              statusColor: 'yellow',
              category: 'RAPID PROTOTYPING',
              title: 'Voice-to-Product System',
              description: 'Natural language interface for rapid product development and deployment.',
              tags: ['NLP', 'Voice AI', 'Rapid Development'],
              gradient: 'from-teal-950/40 to-cyan-950/30',
              imageUrl: '',
            },
            {
              status: 'PRODUCTION',
              statusColor: 'purple',
              category: 'INTERNAL INFRASTRUCTURE',
              title: 'Predictive Analytics Framework',
              description: 'Advanced analytics framework for forecasting and strategic planning.',
              tags: ['Machine Learning', 'Forecasting', 'Analytics'],
              gradient: 'from-blue-950/40 to-purple-950/30',
              imageUrl: '',
            },
          ],
        });
      } else if (section.key === 'about-page') {
        setFormData(section.content || {
          hero: {
            title: 'About Us',
            subtitle: 'Who We Are',
            description: 'We transform unconventional ideas into intelligent, production-grade systems.',
          },
          mission: {
            title: 'Our Mission',
            description: 'To bridge the gap between experimental thinking and production-grade engineering, creating AI-powered solutions that drive measurable impact.',
          },
          values: [
            {
              title: 'Innovation',
              description: 'We push boundaries and explore unconventional approaches to problem-solving.',
            },
            {
              title: 'Excellence',
              description: 'We maintain the highest standards in engineering and product development.',
            },
            {
              title: 'Impact',
              description: 'We focus on building solutions that create real, measurable value.',
            },
          ],
          team: {
            title: 'Our Team',
            description: 'A diverse group of engineers, designers, and strategists working together to build the future.',
          },
          contact: {
            title: 'Get in Touch',
            description: 'Interested in working with us? We\'d love to hear from you.',
            email: 'hello@donkeyideas.com',
          },
        });
      } else if (section.key === 'services-page') {
        setFormData(section.content || {
          hero: {
            title: 'Our Services',
            subtitle: 'What We Offer',
            description: 'Comprehensive solutions for building and scaling innovative ventures.',
          },
          sections: [
            { title: '', description: '', imageUrl: '', features: [] },
            { title: '', description: '', imageUrl: '', features: [] },
            { title: '', description: '', imageUrl: '', features: [] },
          ],
        });
      } else if (section.key === 'process-page') {
        setFormData(section.content || {
          hero: {
            title: 'Our Process',
            subtitle: 'How We Work',
            description: 'A systematic approach to transforming ideas into intelligent systems.',
          },
          sections: [
            { step: '01', title: '', description: '', imageUrl: '', details: '' },
            { step: '02', title: '', description: '', imageUrl: '', details: '' },
            { step: '03', title: '', description: '', imageUrl: '', details: '' },
            { step: '04', title: '', description: '', imageUrl: '', details: '' },
          ],
        });
      } else if (section.key === 'process') {
        setFormData(section.content || {
          title: '',
          subtitle: '',
          steps: [
            { step: '01', title: '', desc: '' },
            { step: '02', title: '', desc: '' },
            { step: '03', title: '', desc: '' },
            { step: '04', title: '', desc: '' },
          ],
        });
      } else if (section.key === 'cta') {
        setFormData(section.content || {
          title: '',
          description: '',
          buttonText: '',
          buttonLink: '',
        });
      } else {
        setFormData(section.content || {});
      }
    }
  }, [isOpen, section]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await api.put(`/website/content/${section.key}`, {
        content: formData,
        published: true,
      });
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to save content:', error);
      setError(error.response?.data?.error?.message || 'Failed to save content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Edit {section.name}</h2>
              <p className="text-white/60 text-sm mt-1">Update the content for this section</p>
            </div>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="p-6">
          {section.key === 'hero' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Label</label>
                <input
                  type="text"
                  value={formData.label || ''}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  placeholder="Innovation Laboratory / Venture Builder"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Headline</label>
                <textarea
                  value={formData.headline || ''}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  rows={4}
                  placeholder="Transforming&#10;Unconventional&#10;Ideas Into&#10;Intelligent Systems"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Button Text</label>
                  <input
                    type="text"
                    value={formData.cta?.primary?.text || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cta: {
                          ...formData.cta,
                          primary: { ...formData.cta?.primary, text: e.target.value },
                        },
                      })
                    }
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Button Link</label>
                  <input
                    type="text"
                    value={formData.cta?.primary?.link || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cta: {
                          ...formData.cta,
                          primary: { ...formData.cta?.primary, link: e.target.value },
                        },
                      })
                    }
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Secondary Button Text</label>
                  <input
                    type="text"
                    value={formData.cta?.secondary?.text || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cta: {
                          ...formData.cta,
                          secondary: { ...formData.cta?.secondary, text: e.target.value },
                        },
                      })
                    }
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Secondary Button Link</label>
                  <input
                    type="text"
                    value={formData.cta?.secondary?.link || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cta: {
                          ...formData.cta,
                          secondary: { ...formData.cta?.secondary, link: e.target.value },
                        },
                      })
                    }
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {section.key === 'stats' && (
            <div className="space-y-4">
              <p className="text-white/60 text-sm mb-4">
                Configure the statistics displayed on your homepage.
              </p>
              {formData.items?.map((item: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">Stat {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Value</label>
                      <input
                        type="text"
                        value={item.value || ''}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index] = { ...newItems[index], value: e.target.value };
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                        placeholder="10+"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Label</label>
                      <input
                        type="text"
                        value={item.label || ''}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index] = { ...newItems[index], label: e.target.value };
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                        placeholder="Active Ventures"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {section.key === 'about' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  placeholder="Who We Are"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Text</label>
                <textarea
                  value={formData.text || ''}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  rows={6}
                />
              </div>
            </div>
          )}

          {section.key === 'services' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                />
              </div>
              {formData.items?.map((item: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">Service {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Service Title</label>
                      <input
                        type="text"
                        value={item.title || ''}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index] = { ...newItems[index], title: e.target.value };
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <textarea
                        value={item.description || ''}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index] = { ...newItems[index], description: e.target.value };
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {section.key === 'process' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                />
              </div>
              {formData.steps?.map((step: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">Step {step.step}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Step Title</label>
                      <input
                        type="text"
                        value={step.title || ''}
                        onChange={(e) => {
                          const newSteps = [...formData.steps];
                          newSteps[index] = { ...newSteps[index], title: e.target.value };
                          setFormData({ ...formData, steps: newSteps });
                        }}
                        className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <input
                        type="text"
                        value={step.desc || ''}
                        onChange={(e) => {
                          const newSteps = [...formData.steps];
                          newSteps[index] = { ...newSteps[index], desc: e.target.value };
                          setFormData({ ...formData, steps: newSteps });
                        }}
                        className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {section.key === 'cta' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Button Text</label>
                <input
                  type="text"
                  value={formData.buttonText || ''}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Button Link</label>
                <input
                  type="text"
                  value={formData.buttonLink || ''}
                  onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                />
              </div>
            </div>
          )}

          {section.key === 'ventures' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  placeholder="Current Ventures"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  placeholder="Our Portfolio"
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Venture Items</label>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        items: [
                          ...(formData.items || []),
                          { title: '', description: '', imageUrl: '', link: '' },
                        ],
                      });
                    }}
                  >
                    + Add Venture
                  </Button>
                </div>
                {formData.items?.map((item: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Venture {index + 1}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newItems = formData.items.filter((_: any, i: number) => i !== index);
                            setFormData({ ...formData, items: newItems });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Image</label>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Validate file type
                                const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
                                if (!validTypes.includes(file.type)) {
                                  setError('Invalid file type. Please upload PNG, JPEG, GIF, WebP, or SVG.');
                                  return;
                                }
                                
                                // Validate file size (max 5MB)
                                if (file.size > 5 * 1024 * 1024) {
                                  setError('File size too large. Maximum size is 5MB.');
                                  return;
                                }
                                
                                // Convert to base64 for storage
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const base64String = reader.result as string;
                                  const newItems = [...formData.items];
                                  newItems[index] = { ...newItems[index], imageUrl: base64String };
                                  setFormData({ ...formData, items: newItems });
                                };
                                reader.onerror = () => {
                                  setError('Failed to read file. Please try again.');
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                            id={`venture-image-${index}`}
                          />
                          <label
                            htmlFor={`venture-image-${index}`}
                            className="block w-full p-3 bg-black/30 border border-white/20 rounded text-white cursor-pointer hover:border-blue-500 transition-colors text-center"
                          >
                            {item.imageUrl ? 'Change Image' : 'Upload Image'}
                          </label>
                          <div className="text-xs text-white/60">
                            Accepted formats: PNG, JPEG, GIF, WebP, SVG (Max 5MB)
                          </div>
                        </div>
                        {item.imageUrl && (
                          <div className="mt-2">
                            <img
                              src={item.imageUrl}
                              alt="Preview"
                              className="w-full h-48 object-cover rounded border border-white/10"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 w-full"
                              onClick={() => {
                                const newItems = [...formData.items];
                                newItems[index] = { ...newItems[index], imageUrl: '' };
                                setFormData({ ...formData, items: newItems });
                                // Reset file input
                                const fileInput = document.getElementById(`venture-image-${index}`) as HTMLInputElement;
                                if (fileInput) fileInput.value = '';
                              }}
                            >
                              Remove Image
                            </Button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Venture Title</label>
                        <input
                          type="text"
                          value={item.title || ''}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index] = { ...newItems[index], title: e.target.value };
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          placeholder="Venture Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          value={item.description || ''}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index] = { ...newItems[index], description: e.target.value };
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          rows={3}
                          placeholder="Brief description of the venture and its impact."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Link</label>
                        <input
                          type="text"
                          value={item.link || ''}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index] = { ...newItems[index], link: e.target.value };
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          placeholder="/register or #ventures"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Ventures Page */}
          {section.key === 'ventures-page' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tagline</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Tagline Text</label>
                  <input
                    type="text"
                    value={formData.hero?.subtitle || ''}
                    onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, subtitle: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    placeholder="Production systems generating measurable impact"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Ventures</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        ventures: [
                          ...(formData.ventures || []),
                          {
                            status: 'PRODUCTION',
                            statusColor: 'teal',
                            category: '',
                            title: '',
                            description: '',
                            tags: [],
                            gradient: 'from-blue-950/40 to-blue-900/30',
                            imageUrl: '',
                          },
                        ],
                      });
                    }}
                  >
                    + Add Venture
                  </Button>
                </div>
                {(formData.ventures || formData.sections || []).map((venture: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Venture {index + 1}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newVentures = (formData.ventures || formData.sections || []).filter((_: any, i: number) => i !== index);
                            setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ImageUploadField
                        label="Image (Optional - gradient will be used if no image)"
                        value={venture.imageUrl || ''}
                        onChange={(url) => {
                          const newVentures = [...(formData.ventures || formData.sections || [])];
                          newVentures[index] = { ...newVentures[index], imageUrl: url };
                          setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                        }}
                        id={`ventures-page-image-${index}`}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Status</label>
                          <select
                            value={venture.status || 'PRODUCTION'}
                            onChange={(e) => {
                              const newVentures = [...(formData.ventures || formData.sections || [])];
                              newVentures[index] = { ...newVentures[index], status: e.target.value };
                              setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                            }}
                            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white [&>option]:bg-[#0F0F0F] [&>option]:text-white"
                            style={{
                              backgroundColor: 'rgba(0, 0, 0, 0.3)',
                              color: 'white',
                            }}
                          >
                            <option value="PRODUCTION" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>PRODUCTION</option>
                            <option value="BETA" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>BETA</option>
                            <option value="ALPHA" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>ALPHA</option>
                            <option value="DEVELOPMENT" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>DEVELOPMENT</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Status Color</label>
                          <select
                            value={venture.statusColor || 'teal'}
                            onChange={(e) => {
                              const newVentures = [...(formData.ventures || formData.sections || [])];
                              newVentures[index] = { ...newVentures[index], statusColor: e.target.value };
                              setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                            }}
                            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white [&>option]:bg-[#0F0F0F] [&>option]:text-white"
                            style={{
                              backgroundColor: 'rgba(0, 0, 0, 0.3)',
                              color: 'white',
                            }}
                          >
                            <option value="teal" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Teal</option>
                            <option value="purple" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Purple</option>
                            <option value="yellow" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Yellow</option>
                            <option value="green" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Green</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Category</label>
                        <input
                          type="text"
                          value={venture.category || ''}
                          onChange={(e) => {
                            const newVentures = [...(formData.ventures || formData.sections || [])];
                            newVentures[index] = { ...newVentures[index], category: e.target.value };
                            setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          placeholder="ENTERPRISE PLATFORM"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={venture.title || ''}
                          onChange={(e) => {
                            const newVentures = [...(formData.ventures || formData.sections || [])];
                            newVentures[index] = { ...newVentures[index], title: e.target.value };
                            setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          value={venture.description || ''}
                          onChange={(e) => {
                            const newVentures = [...(formData.ventures || formData.sections || [])];
                            newVentures[index] = { ...newVentures[index], description: e.target.value };
                            setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Tags (one per line)</label>
                        <textarea
                          value={(venture.tags || []).join('\n')}
                          onChange={(e) => {
                            const tags = e.target.value.split('\n').filter(t => t.trim());
                            const newVentures = [...(formData.ventures || formData.sections || [])];
                            newVentures[index] = { ...newVentures[index], tags };
                            setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          rows={3}
                          placeholder="Tag 1&#10;Tag 2&#10;Tag 3"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Gradient</label>
                        <select
                          value={venture.gradient || 'from-blue-950/40 to-blue-900/30'}
                          onChange={(e) => {
                            const newVentures = [...(formData.ventures || formData.sections || [])];
                            newVentures[index] = { ...newVentures[index], gradient: e.target.value };
                            setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white [&>option]:bg-[#0F0F0F] [&>option]:text-white"
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            color: 'white',
                          }}
                        >
                          <option value="from-blue-950/40 to-blue-900/30" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Subtle Blue</option>
                          <option value="from-purple-950/40 to-pink-950/30" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Subtle Purple to Pink</option>
                          <option value="from-teal-950/40 to-cyan-950/30" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Subtle Teal to Cyan</option>
                          <option value="from-blue-950/40 to-purple-950/30" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Subtle Blue to Purple</option>
                          <option value="from-green-950/40 to-emerald-950/30" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Subtle Green to Emerald</option>
                          <option value="from-orange-950/40 to-red-950/30" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Subtle Orange to Red</option>
                        </select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Services Page */}
          {section.key === 'services-page' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Hero Section</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.hero?.title || ''}
                    onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, title: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subtitle</label>
                  <input
                    type="text"
                    value={formData.hero?.subtitle || ''}
                    onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, subtitle: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.hero?.description || ''}
                    onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, description: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Service Sections</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        sections: [...(formData.sections || []), { title: '', description: '', imageUrl: '', features: [] }],
                      });
                    }}
                  >
                    + Add Section
                  </Button>
                </div>
                {formData.sections?.map((sectionItem: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Service {index + 1}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newSections = formData.sections.filter((_: any, i: number) => i !== index);
                            setFormData({ ...formData, sections: newSections });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ImageUploadField
                        label="Image"
                        value={sectionItem.imageUrl}
                        onChange={(url) => {
                          const newSections = [...formData.sections];
                          newSections[index] = { ...newSections[index], imageUrl: url };
                          setFormData({ ...formData, sections: newSections });
                        }}
                        id={`services-page-image-${index}`}
                      />
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={sectionItem.title || ''}
                          onChange={(e) => {
                            const newSections = [...formData.sections];
                            newSections[index] = { ...newSections[index], title: e.target.value };
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          value={sectionItem.description || ''}
                          onChange={(e) => {
                            const newSections = [...formData.sections];
                            newSections[index] = { ...newSections[index], description: e.target.value };
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Features (one per line)</label>
                        <textarea
                          value={(sectionItem.features || []).join('\n')}
                          onChange={(e) => {
                            const features = e.target.value.split('\n').filter(f => f.trim());
                            const newSections = [...formData.sections];
                            newSections[index] = { ...newSections[index], features };
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          rows={4}
                          placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Process Page */}
          {section.key === 'process-page' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Hero Section</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.hero?.title || ''}
                    onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, title: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subtitle</label>
                  <input
                    type="text"
                    value={formData.hero?.subtitle || ''}
                    onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, subtitle: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.hero?.description || ''}
                    onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, description: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Process Steps</h3>
                {formData.sections?.map((sectionItem: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">Step {sectionItem.step || `0${index + 1}`}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ImageUploadField
                        label="Image"
                        value={sectionItem.imageUrl}
                        onChange={(url) => {
                          const newSections = [...formData.sections];
                          newSections[index] = { ...newSections[index], imageUrl: url };
                          setFormData({ ...formData, sections: newSections });
                        }}
                        id={`process-page-image-${index}`}
                      />
                      <div>
                        <label className="block text-sm font-medium mb-2">Step Number</label>
                        <input
                          type="text"
                          value={sectionItem.step || ''}
                          onChange={(e) => {
                            const newSections = [...formData.sections];
                            newSections[index] = { ...newSections[index], step: e.target.value };
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          placeholder="01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={sectionItem.title || ''}
                          onChange={(e) => {
                            const newSections = [...formData.sections];
                            newSections[index] = { ...newSections[index], title: e.target.value };
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          value={sectionItem.description || ''}
                          onChange={(e) => {
                            const newSections = [...formData.sections];
                            newSections[index] = { ...newSections[index], description: e.target.value };
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Details</label>
                        <textarea
                          value={sectionItem.details || ''}
                          onChange={(e) => {
                            const newSections = [...formData.sections];
                            newSections[index] = { ...newSections[index], details: e.target.value };
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* About Page */}
          {section.key === 'about-page' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Hero Section</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.hero?.title || ''}
                    onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, title: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subtitle</label>
                  <input
                    type="text"
                    value={formData.hero?.subtitle || ''}
                    onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, subtitle: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.hero?.description || ''}
                    onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, description: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Mission Section</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.mission?.title || ''}
                    onChange={(e) => setFormData({ ...formData, mission: { ...formData.mission, title: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.mission?.description || ''}
                    onChange={(e) => setFormData({ ...formData, mission: { ...formData.mission, description: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    rows={4}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Values</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        values: [...(formData.values || []), { title: '', description: '' }],
                      });
                    }}
                  >
                    + Add Value
                  </Button>
                </div>
                {formData.values?.map((value: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Value {index + 1}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newValues = formData.values.filter((_: any, i: number) => i !== index);
                            setFormData({ ...formData, values: newValues });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={value.title || ''}
                          onChange={(e) => {
                            const newValues = [...formData.values];
                            newValues[index] = { ...newValues[index], title: e.target.value };
                            setFormData({ ...formData, values: newValues });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          value={value.description || ''}
                          onChange={(e) => {
                            const newValues = [...formData.values];
                            newValues[index] = { ...newValues[index], description: e.target.value };
                            setFormData({ ...formData, values: newValues });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Team Section</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.team?.title || ''}
                    onChange={(e) => setFormData({ ...formData, team: { ...formData.team, title: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.team?.description || ''}
                    onChange={(e) => setFormData({ ...formData, team: { ...formData.team, description: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Section</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.contact?.title || ''}
                    onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, title: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.contact?.description || ''}
                    onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, description: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.contact?.email || ''}
                    onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, email: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <NotificationModal
          isOpen={!!error}
          onClose={() => setError(null)}
          title="Error"
          message={error}
          type="error"
        />
      )}
    </div>
  );
}

function ImageUploadField({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  id: string;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="space-y-2">
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
              if (!validTypes.includes(file.type)) {
                setError('Invalid file type. Please upload PNG, JPEG, GIF, WebP, or SVG.');
                return;
              }
              
              if (file.size > 5 * 1024 * 1024) {
                setError('File size too large. Maximum size is 5MB.');
                return;
              }
              
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                onChange(base64String);
                setError(null);
              };
              reader.onerror = () => {
                setError('Failed to read file. Please try again.');
              };
              reader.readAsDataURL(file);
            }
          }}
          className="hidden"
          id={id}
        />
        <label
          htmlFor={id}
          className="block w-full p-3 bg-black/30 border border-white/20 rounded text-white cursor-pointer hover:border-blue-500 transition-colors text-center"
        >
          {value ? 'Change Image' : 'Upload Image'}
        </label>
        <div className="text-xs text-white/60">
          Accepted formats: PNG, JPEG, GIF, WebP, SVG (Max 5MB)
        </div>
        {error && (
          <div className="text-xs text-red-400">{error}</div>
        )}
      </div>
      {value && (
        <div className="mt-2">
          <img
            src={value}
            alt="Preview"
            className="w-full h-48 object-cover rounded border border-white/10"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => {
              onChange('');
              const fileInput = document.getElementById(id) as HTMLInputElement;
              if (fileInput) fileInput.value = '';
            }}
          >
            Remove Image
          </Button>
        </div>
      )}
    </div>
  );
}



