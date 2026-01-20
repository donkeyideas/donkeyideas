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
          backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
          cta: {
            primary: { text: '', link: '' },
            secondary: { text: '', link: '' },
          },
        });
      } else if (section.key === 'stats') {
        setFormData(section.content || {
          items: [
            { value: '87%', label: 'Ventures Reach Market Fit' },
            { value: '6-12 weeks', label: 'Average Time to MVP' },
            { value: '$45M+', label: 'Collective Portfolio Valuation' },
            { value: '23', label: 'AI Systems in Production' },
          ],
        });
      } else if (section.key === 'about') {
        setFormData(section.content || {
          title: 'Where Bold Ideas Meet Rigorous Engineering',
          text: 'At Donkey Ideas, we believe the best ventures emerge from the intersection of unconventional thinking and disciplined execution. While others chase trends, we build foundational technologies that create lasting value. Our AI-powered approach combines cutting-edge machine learning, battle-tested engineering practices, and deep market understanding to transform raw concepts into revenue-generating businesses.\n\nWe\'re not a traditional incubator or consultancy. We\'re builders who get our hands dirty with code, data, and customer conversations. Every venture in our portfolio represents a commitment to excellence—meticulously crafted systems designed to scale, adapt, and dominate their markets. We take calculated risks on ideas others overlook, because we know that world-changing innovations often sound absurd at first.\n\nOur Venture Operating System provides the infrastructure, methodologies, and AI tools that reduce time-to-market by 70% while increasing success probability. Whether you\'re a first-time founder with a napkin sketch or an enterprise looking to spin out innovation, we provide the technical firepower and strategic guidance to win.',
        });
      } else if (section.key === 'engage-excellence') {
        setFormData(section.content || {
          badge: { text: 'Innovation First', color: 'yellow' },
          title: 'Engage with\nexcellence',
          features: [
            {
              title: 'AI-First Development',
              description: 'Every venture leverages AI frameworks giving you an unfair advantage',
            },
            {
              title: 'Venture Operating System',
              description: 'Battle-tested platform powered by AI insights',
            },
            {
              title: 'Full-Stack Partnership',
              description: 'Co-builders providing hands-on expertise across every dimension',
            },
          ],
          ventureCanvas: {
            title: 'Venture Canvas',
            text1: 'Ready to transform your idea into a market-dominating venture? Our team of AI engineers, product strategists, and growth experts is standing by to evaluate your concept.',
            text2: 'We move fast—most partnerships begin within 48 hours of first contact. From writing code and designing systems to acquiring customers and raising capital, we provide hands-on expertise across every dimension of venture building. Let\'s build something extraordinary together.',
            ctaText: 'Explore Venture Canvas',
            imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
          },
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
            subtitle: 'Each product in our portfolio represents a bold bet on unconventional ideas backed by rigorous engineering',
          },
          ventures: [
            {
              status: 'PRODUCTION',
              statusColor: 'teal',
              category: 'ENTERPRISE AI PLATFORM',
              title: 'Automated Decision Intelligence for Fortune 500',
              description: 'AI-powered decision support system analyzing millions of data points in real-time for C-suite executives. Reduced strategic planning cycles from months to days, increased forecast accuracy by 43%. Secured contracts with 7 Fortune 500 companies, achieving $12M ARR within 8 months.',
              tags: ['Real-time Analytics', 'C-Suite Intelligence', 'Strategic Planning'],
              gradient: 'from-blue-950/40 to-blue-900/30',
              imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
            },
            {
              status: 'PRODUCTION',
              statusColor: 'purple',
              category: 'CONSUMER AI APPLICATION',
              title: 'Personalized Learning Platform - 500K Active Users',
              description: 'From concept to product-market fit in 10 weeks. Adaptive learning system using reinforcement learning for personalized curricula. Achieved viral growth reaching 500K users organically within 6 months and secured Series A funding from top-tier VCs.',
              tags: ['Reinforcement Learning', 'Ed-Tech', 'Viral Growth'],
              gradient: 'from-purple-950/40 to-pink-950/30',
              imageUrl: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=2074&auto=format&fit=crop',
            },
            {
              status: 'PRODUCTION',
              statusColor: 'green',
              category: 'B2B SAAS INNOVATION',
              title: 'Supply Chain Optimization Saving $50M Annually',
              description: 'Intelligent logistics platform leveraging computer vision and predictive analytics. Predicts demand with 94% accuracy, reduces waste by 38%, cuts operational costs by $2.3M annually per client. Expanding internationally across 12 countries.',
              tags: ['Computer Vision', 'Predictive Analytics', 'Logistics'],
              gradient: 'from-teal-950/40 to-cyan-950/30',
              imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop',
            },
            {
              status: 'PRODUCTION',
              statusColor: 'purple',
              category: 'HEALTHCARE AI SYSTEM',
              title: 'Clinical Decision Support - 31% Better Outcomes',
              description: 'AI diagnostic assistant analyzing patient data, medical literature, and clinical guidelines. Processed over 2 million patient cases, identifies rare conditions 67% faster, measurably improved patient outcomes across partner hospitals.',
              tags: ['Medical AI', 'Diagnostic Support', 'Healthcare'],
              gradient: 'from-blue-950/40 to-purple-950/30',
              imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070&auto=format&fit=crop',
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
      } else if (section.key === 'privacy-page') {
        setFormData(section.content || {
          title: 'Privacy Policy',
          lastUpdated: 'January 2026',
          sections: [
            {
              heading: 'Introduction',
              content: 'At Donkey Ideas, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.',
            },
            {
              heading: 'Information We Collect',
              content: 'We collect information that you provide directly to us, including:\n\n• Name and contact information\n• Company information\n• Email address\n• Information about your business needs\n• Any other information you choose to provide',
            },
            {
              heading: 'How We Use Your Information',
              content: 'We use the information we collect to:\n\n• Provide, maintain, and improve our services\n• Communicate with you about our services\n• Respond to your inquiries and support requests\n• Send you updates and marketing communications (with your consent)\n• Protect against fraudulent or illegal activity',
            },
            {
              heading: 'Information Sharing',
              content: 'We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:\n\n• With your consent\n• To comply with legal obligations\n• To protect our rights and safety\n• With service providers who assist us in operating our business',
            },
            {
              heading: 'Data Security',
              content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.',
            },
            {
              heading: 'Your Rights',
              content: 'You have the right to:\n\n• Access your personal information\n• Correct inaccurate information\n• Request deletion of your information\n• Opt-out of marketing communications\n• File a complaint with a supervisory authority',
            },
            {
              heading: 'Cookies and Tracking',
              content: 'We use cookies and similar tracking technologies to improve your experience on our website. You can control cookie settings through your browser preferences.',
            },
            {
              heading: 'Changes to This Policy',
              content: 'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.',
            },
            {
              heading: 'Contact Us',
              content: 'If you have any questions about this Privacy Policy, please contact us at:\n\nEmail: info@donkeyideas.com\nLocation: New York & Miami',
            },
          ],
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
              <div>
                <label className="block text-sm font-medium mb-2">Background Image URL</label>
                <input
                  type="text"
                  value={formData.backgroundImage || ''}
                  onChange={(e) => setFormData({ ...formData, backgroundImage: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  placeholder="https://images.unsplash.com/photo-..."
                />
                <p className="text-xs text-white/50 mt-1">Full-screen background image for the hero section</p>
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

          {section.key === 'engage-excellence' && (
            <div className="space-y-6">
              <div className="space-y-4 p-4 bg-black/20 rounded-lg">
                <h3 className="text-lg font-semibold">Badge</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Badge Text</label>
                  <input
                    type="text"
                    value={formData.badge?.text || ''}
                    onChange={(e) => setFormData({ ...formData, badge: { ...formData.badge, text: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    placeholder="Innovation First"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Main Title</label>
                <textarea
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  rows={2}
                  placeholder="Engage with\nexcellence"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Features</h3>
                {formData.features?.map((feature: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">Feature {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={feature.title || ''}
                          onChange={(e) => {
                            const newFeatures = [...formData.features];
                            newFeatures[index] = { ...newFeatures[index], title: e.target.value };
                            setFormData({ ...formData, features: newFeatures });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          value={feature.description || ''}
                          onChange={(e) => {
                            const newFeatures = [...formData.features];
                            newFeatures[index] = { ...newFeatures[index], description: e.target.value };
                            setFormData({ ...formData, features: newFeatures });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-4 p-4 bg-black/20 rounded-lg">
                <h3 className="text-lg font-semibold">Venture Canvas Section</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.ventureCanvas?.title || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ventureCanvas: { ...formData.ventureCanvas, title: e.target.value } 
                    })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">First Paragraph</label>
                  <textarea
                    value={formData.ventureCanvas?.text1 || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ventureCanvas: { ...formData.ventureCanvas, text1: e.target.value } 
                    })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Second Paragraph</label>
                  <textarea
                    value={formData.ventureCanvas?.text2 || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ventureCanvas: { ...formData.ventureCanvas, text2: e.target.value } 
                    })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CTA Button Text</label>
                  <input
                    type="text"
                    value={formData.ventureCanvas?.ctaText || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ventureCanvas: { ...formData.ventureCanvas, ctaText: e.target.value } 
                    })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="text"
                    value={formData.ventureCanvas?.imageUrl || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ventureCanvas: { ...formData.ventureCanvas, imageUrl: e.target.value } 
                    })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                  <p className="text-xs text-white/50 mt-1">Enter image URL or upload to Unsplash and paste link</p>
                </div>
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
                      <ImageUploadField
                        label="Image (Optional - gradient will be used if no image)"
                        value={item.imageUrl || ''}
                        onChange={(url) => {
                          const newItems = [...formData.items];
                          newItems[index] = { ...newItems[index], imageUrl: url };
                          setFormData({ ...formData, items: newItems });
                        }}
                        id={`venture-home-image-${index}`}
                      />
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
                            imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
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

          {section.key === 'privacy-page' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Page Title</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Updated</label>
                  <input
                    type="text"
                    value={formData.lastUpdated || ''}
                    onChange={(e) => setFormData({ ...formData, lastUpdated: e.target.value })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    placeholder="e.g., January 2026"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Privacy Policy Sections</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        sections: [...(formData.sections || []), { heading: '', content: '' }],
                      });
                    }}
                  >
                    + Add Section
                  </Button>
                </div>
                {formData.sections?.map((section: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Section {index + 1}</CardTitle>
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
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Heading</label>
                          <input
                            type="text"
                            value={section.heading || ''}
                            onChange={(e) => {
                              const newSections = [...formData.sections];
                              newSections[index] = { ...section, heading: e.target.value };
                              setFormData({ ...formData, sections: newSections });
                            }}
                            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Content</label>
                          <textarea
                            value={section.content || ''}
                            onChange={(e) => {
                              const newSections = [...formData.sections];
                              newSections[index] = { ...section, content: e.target.value };
                              setFormData({ ...formData, sections: newSections });
                            }}
                            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                            rows={6}
                            placeholder="Use bullet points with • or numbered lists"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
  const [uploading, setUploading] = useState(false);

  // Compress and optimize image before upload
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate new dimensions (max 1920px width, maintain aspect ratio)
          const maxWidth = 1920;
          const maxHeight = 1080;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with 80% quality for better compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="space-y-2">
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
              if (!validTypes.includes(file.type)) {
                setError('Invalid file type. Please upload PNG, JPEG, GIF, or WebP.');
                return;
              }
              
              // Allow any file size - we'll compress it
              if (file.size > 50 * 1024 * 1024) {
                setError('File size too large. Maximum size is 50MB.');
                return;
              }
              
              try {
                setUploading(true);
                setError(null);
                const compressedBase64 = await compressImage(file);
                onChange(compressedBase64);
              } catch (err: any) {
                setError(err.message || 'Failed to process image. Please try again.');
              } finally {
                setUploading(false);
              }
            }
          }}
          className="hidden"
          id={id}
          disabled={uploading}
        />
        <label
          htmlFor={id}
          className="block w-full p-3 bg-black/30 border border-white/20 rounded text-white cursor-pointer hover:border-blue-500 transition-colors text-center"
        >
          {uploading ? 'Optimizing image...' : value ? 'Change Image' : 'Upload Image'}
        </label>
        <div className="text-xs text-white/60">
          Any size accepted - images are automatically optimized. Best results with 1920x1080px or similar.
        </div>
        {error && (
          <div className="text-xs text-red-400">{error}</div>
        )}
      </div>
      {value && !uploading && (
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



