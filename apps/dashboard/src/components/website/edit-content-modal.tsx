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
            { value: '50+', label: 'Projects Delivered' },
            { value: '6-12 weeks', label: 'Average Project Timeline' },
            { value: '15+', label: 'Industries Served' },
            { value: '92%', label: 'Client Retention Rate' },
          ],
        });
      } else if (section.key === 'about') {
        setFormData(section.content || {
          title: 'Where Crazy Ideas Meet Smart Execution',
          text: 'Most people with big ideas don\'t need more advice — they need a partner who rolls up their sleeves and builds alongside them. That\'s Donkey Ideas. We\'re a creative consulting studio founded by a project manager who\'s spent years helping entrepreneurs, small businesses, and dreamers turn their wildest concepts into real, functioning ventures.\n\nWe\'re not a traditional consultancy that hands you a deck and disappears. We\'re a think tank that actually builds things. We plan it, model the financials, map out the strategy, prototype it, and help you launch it. From restaurant concepts to tech startups to nonprofit overhauls — if you\'ve got an idea that keeps you up at night, we\'ll help you figure out how to make it work.\n\nOur approach is simple: understand your vision, pressure-test it with real research and financial modeling, then build a clear roadmap to get it done. No jargon, no fluff — just hands-on creative consulting that moves your idea from napkin sketch to reality.',
        });
      } else if (section.key === 'engage-excellence') {
        setFormData(section.content || {
          badge: { text: 'Hands-On Approach', color: 'yellow' },
          title: 'Engage with\nexcellence',
          features: [
            {
              title: 'Strategy-First Thinking',
              description: 'Every project starts with deep research, market analysis, and a clear strategic roadmap tailored to your vision',
            },
            {
              title: 'Full-Service Execution',
              description: 'From business plans and financial models to branding and launch strategy — we handle it all',
            },
            {
              title: 'Real Partnership',
              description: 'We work alongside you as hands-on collaborators, not distant advisors watching from the sidelines',
            },
          ],
          ventureCanvas: {
            title: 'Project Canvas',
            text1: 'Ready to turn your idea into something real? Our team of strategists, project managers, and creative problem-solvers is ready to dig into your concept and build a plan that works.',
            text2: 'We move fast — most engagements kick off within a week of first contact. From building your business plan and financial projections to designing your go-to-market strategy and helping you pitch investors, we\'re with you every step of the way. Let\'s build something worth talking about.',
            ctaText: 'Start Your Project',
            imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2070&auto=format&fit=crop',
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
        const defaults = {
          hero: {
            title: 'A think tank for people with big ideas',
            description: 'Donkey Ideas is a creative consulting studio that helps entrepreneurs and businesses turn bold concepts into reality. Part think tank, part project management firm — we plan it, build it, and launch it with you.',
          },
          mission: {
            title: 'Where bold ideas become real businesses',
            description: 'We bridge the gap between a great idea and a real business. Through hands-on consulting, strategic planning, and financial modeling, we help founders and entrepreneurs take their concepts from napkin sketch to launch day.\n\nOur mission is to be the partner that every dreamer needs — someone who doesn\'t just say "great idea" but actually helps you figure out if it works, how to fund it, and how to build it.',
            imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
          },
          values: [
            { title: 'Creativity', description: 'We embrace unconventional thinking and approach every project with fresh eyes. The best solutions often come from looking at problems differently.' },
            { title: 'Excellence', description: 'We hold ourselves to the highest standards in planning, strategy, and execution. Every deliverable — from a business plan to a financial model — is built to impress.' },
            { title: 'Impact', description: 'We measure success by results. Our projects generate revenue, secure funding, and create real value for the people and communities they serve.' },
          ],
          ventureProcess: {
            title: 'Our Process',
            steps: [
              {
                number: '1',
                title: 'You bring the idea',
                subtitle: 'We research the market and validate the concept',
                badge: 'Opportunity identified',
                actions: ['Business plan and strategy developed', 'Financial model built in 2-4 weeks', 'Go-to-market roadmap created'],
              },
              {
                number: '2',
                title: 'Build and launch together',
                subtitle: 'We manage the project through execution',
                badge: 'Revenue generating',
                actions: [],
              },
            ],
            result: 'Validated business ready to grow',
          },
          approach: {
            badge: 'Our Approach',
            title: 'Plan smart, build fast, launch with confidence',
            description: 'We run a proven loop: understand the idea, research the market, build the plan, model the numbers, and launch.\n\nEvery step is deliberate. We prototype quickly, test assumptions with real data, and only move forward when the numbers make sense. That keeps your budget lean and your odds of success high.',
          },
          team: {
            title: 'Project managers, strategists & creative problem-solvers',
            description: 'We\'re a small, scrappy team of people who love building things. Project managers, business strategists, financial modelers, and creative thinkers — all working together to help you bring your idea to life.\n\nWe\'re not traditional consultants who hand you a report and walk away. We\'re hands-on partners who stick with you through the messy middle.',
            imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
          },
        };

        const content = section.content && typeof section.content === 'object' ? section.content : {};
        const cleanText = (value: any, fallback: string) => {
          if (typeof value !== 'string') return fallback;
          const trimmed = value.trim();
          if (!trimmed) return fallback;
          const placeholderOnly = /^[-_—]+$/.test(trimmed);
          return placeholderOnly ? fallback : value;
        };

        const mergedApproach = {
          ...defaults.approach,
          ...content.approach,
        };

        const mergedVentureProcess = {
          ...defaults.ventureProcess,
          ...content.ventureProcess,
        };

        const defaultSteps = defaults.ventureProcess.steps || [];
        const contentSteps = Array.isArray(mergedVentureProcess.steps)
          ? mergedVentureProcess.steps
          : [];
        const mergedSteps = (contentSteps.length > 0 ? contentSteps : defaultSteps).map((step: any, idx: number) => {
          const fallback = defaultSteps[idx] || {};
          return {
            ...fallback,
            ...step,
            number: cleanText(step?.number, fallback.number || `${idx + 1}`),
            title: cleanText(step?.title, fallback.title || ''),
            subtitle: cleanText(step?.subtitle, fallback.subtitle || ''),
            badge: cleanText(step?.badge, fallback.badge || ''),
            actions: Array.isArray(step?.actions) && step.actions.length > 0
              ? step.actions
              : (fallback.actions || []),
          };
        });

        setFormData({
          ...defaults,
          ...content,
          hero: { ...defaults.hero, ...content.hero },
          mission: { ...defaults.mission, ...content.mission },
          ventureProcess: {
            ...mergedVentureProcess,
            title: cleanText(mergedVentureProcess.title, defaults.ventureProcess.title),
            result: cleanText(mergedVentureProcess.result, defaults.ventureProcess.result),
            steps: mergedSteps,
          },
          approach: {
            ...mergedApproach,
            badge: cleanText(mergedApproach.badge, defaults.approach.badge),
            title: cleanText(mergedApproach.title, defaults.approach.title),
            description: cleanText(mergedApproach.description, defaults.approach.description),
          },
          team: { ...defaults.team, ...content.team },
          values: content.values && content.values.length > 0 ? content.values : defaults.values,
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
            title: 'The more ideas we build, the sharper we get',
            description: 'Go beyond advice. We roll up our sleeves and help you plan, build, and launch. Whether you need a full business plan, financial projections, or a launch strategy — we bring the structure and expertise to make your idea real.',
            features: [
              { title: 'Strategic Planning', description: 'Research-backed roadmaps tailored to your specific idea and market' },
              { title: 'Financial Modeling', description: 'Investor-ready projections and budgets that actually make sense' },
              { title: 'Launch Execution', description: 'Hands-on support from concept through opening day' },
            ],
          },
          dashboardImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
          sections: [
            {
              badge: 'Rapid Execution',
              title: 'From concept to launch, fast',
              description: 'Don\'t let your idea sit on the shelf. Our proven project management framework helps you move from concept to launch in weeks, not months.',
              imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
              stats: [
                { value: '6-12 weeks', label: 'Average project timeline' },
                { value: '50+', label: 'Projects successfully delivered' },
              ],
            },
            {
              badge: 'Strategic Planning',
              title: 'Roadmaps that actually work',
              description: 'Get clear, actionable plans built on real market research and financial analysis. We don\'t just tell you what to do — we map out exactly how to do it.',
              imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070&auto=format&fit=crop',
              features: [
                { title: 'Market Research & Validation', description: 'Understand your competitive landscape and target market before you invest' },
                { title: 'Business Plan Development', description: 'Comprehensive plans that work for investors, banks, and your own decision-making' },
                { title: 'Financial Projections', description: 'Revenue models, cash flow forecasts, and break-even analysis you can trust' },
              ],
            },
            {
              badge: 'Focused Prioritization',
              title: 'Know exactly what to build first',
              description: 'See the full picture of your project so you can focus on what moves the needle most. We help you prioritize decisions that drive the biggest impact.',
              imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2074&auto=format&fit=crop',
              insights: [
                { category: 'Go-to-Market Strategy', impact: 'High Impact', title: 'Launch with a targeted local campaign', description: 'Reach your first 100 customers before scaling spend' },
                { category: 'Financial Planning', impact: 'Critical Path', title: 'Secure initial funding before buildout', description: 'Investor deck and financial model ready for pitch meetings' },
              ],
            },
          ],
        });
      } else if (section.key === 'process-page') {
        setFormData(section.content || {
          hero: {
            title: 'A process built for real-world ideas',
            description: 'We\'ve refined our approach through dozens of projects across every kind of industry. Whether you\'re launching a restaurant, building a tech product, or reimagining a nonprofit — our process adapts to your idea.',
            features: [
              { title: 'Tailored Strategies', description: 'Customized to match your unique vision and market' },
              { title: 'Iterative Approach', description: 'Adapted to real feedback and changing conditions' },
              { title: 'Rapid Execution', description: 'Industry-leading timelines from concept to launch' },
            ],
          },
          integrationTitle: 'Seamless collaboration without the red tape',
          sections: [
            {
              badge: 'Discovery & Research',
              title: 'Deep-dive validation before you invest',
              description: 'We start every project with thorough research — competitive analysis, market sizing, customer interviews, and feasibility studies. No assumptions, just data.',
              imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
              marketAnalysis: {
                title: 'Market Research',
                status: 'Complete',
                task: 'Competitive landscape analysis for new market entry',
                scanning: 'Analyzing industry reports, competitor positioning, customer segments...',
                result: 'Identified 3 underserved segments with strong demand signals',
                aiStatus: 'Research Complete',
              },
            },
            {
              badge: 'Global Reach',
              title: 'Launch in any market',
              description: 'Whether you\'re opening a business down the street or expanding internationally, we build strategies that account for local market dynamics and regulatory requirements.',
              imageUrl: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=2006&auto=format&fit=crop',
              markets: [
                'North America — Startups, restaurants, retail, real estate',
                'Europe — Market entry, localization, partnerships',
                'Asia-Pacific — E-commerce, manufacturing, supply chain',
                'Latin America — Emerging markets, nonprofit, community development',
              ],
            },
            {
              badge: 'Project Execution',
              title: 'Strike the right balance',
              description: 'Our project management approach adapts to your pace and priorities. We collaborate closely with you at every milestone, making sure the plan evolves with real-world feedback.',
              imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
              founderInput: {
                quote: '"We need to pivot our go-to-market strategy"',
                context: 'Customer feedback suggests a different entry point',
              },
              aiResponse: {
                result: 'Identified 3 alternative market segments with immediate demand',
                actions: 'Realigned roadmap, adjusted messaging, reprioritized launch milestones',
              },
            },
          ],
          howItWorks: {
            title: 'Research-driven project execution',
            description: 'Every initiative is backed by real data and market intelligence. We identify opportunities, build actionable strategies, and execute with precision.',
            marketSignal: {
              signal: 'Customer acquisition cost rising beyond sustainable levels',
              urgency: 'Budget threshold approaching',
              threshold: 'Requires strategic pivot',
              response: [
                'Shifted to organic growth and referral strategy',
                'Reallocated 40% of budget to content marketing',
                'Launched community-driven referral program',
              ],
              result: 'Acquisition costs reduced by 62% within 8 weeks',
            },
          },
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
                      <div>
                        <label className="block text-sm font-medium mb-2">Image</label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={venture.imageUrl || ''}
                            onChange={(e) => {
                              const newVentures = [...(formData.ventures || formData.sections || [])];
                              newVentures[index] = { ...newVentures[index], imageUrl: e.target.value };
                              setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                            }}
                            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                            placeholder="/images/ventures/company-logo.png or https://images.pexels.com/..."
                          />
                          <div className="text-xs text-slate-400 space-y-1">
                            <div><strong>For Logos:</strong> Upload to <code className="bg-black/30 px-1 py-0.5 rounded">/public/images/ventures/</code> then use path: <code className="bg-black/30 px-1 py-0.5 rounded">/images/ventures/logo.png</code></div>
                            <div><strong>For Photos:</strong> Use Pexels URL: <code className="bg-black/30 px-1 py-0.5 rounded">https://images.pexels.com/...</code></div>
                            <div className="text-green-400">✓ Local logos render at perfect quality with no compression</div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Website URL</label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={venture.websiteUrl || ''}
                            onChange={(e) => {
                              const newVentures = [...(formData.ventures || formData.sections || [])];
                              newVentures[index] = { ...newVentures[index], websiteUrl: e.target.value };
                              setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                            }}
                            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                            placeholder="https://example.com"
                          />
                          <div className="text-xs text-slate-400">
                            If provided, a live website preview will be shown instead of the image. Clicking it opens the site in a new tab.
                          </div>
                        </div>
                      </div>
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

                      {/* Impact & Results Stats */}
                      <div className="border-t border-white/10 pt-4">
                        <h4 className="text-sm font-semibold mb-3">Impact & Results (4 stats)</h4>
                        <div className="space-y-3">
                          {[0, 1, 2, 3].map((statIdx) => {
                            const stats = venture.stats || [];
                            const stat = stats[statIdx] || { value: '', label: '' };
                            return (
                              <div key={statIdx} className="grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={stat.value}
                                  onChange={(e) => {
                                    const newVentures = [...(formData.ventures || formData.sections || [])];
                                    const newStats = [...(newVentures[index].stats || [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }])];
                                    newStats[statIdx] = { ...newStats[statIdx], value: e.target.value };
                                    newVentures[index] = { ...newVentures[index], stats: newStats };
                                    setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                                  }}
                                  className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                                  placeholder={`Value ${statIdx + 1} (e.g., 99.9%)`}
                                />
                                <input
                                  type="text"
                                  value={stat.label}
                                  onChange={(e) => {
                                    const newVentures = [...(formData.ventures || formData.sections || [])];
                                    const newStats = [...(newVentures[index].stats || [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }])];
                                    newStats[statIdx] = { ...newStats[statIdx], label: e.target.value };
                                    newVentures[index] = { ...newVentures[index], stats: newStats };
                                    setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                                  }}
                                  className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                                  placeholder={`Label ${statIdx + 1} (e.g., System Uptime)`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Technology Stack */}
                      <div className="border-t border-white/10 pt-4">
                        <h4 className="text-sm font-semibold mb-3">Technology Stack</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Frontend (one per line)</label>
                            <textarea
                              value={(venture.techStack?.frontend || []).join('\n')}
                              onChange={(e) => {
                                const frontend = e.target.value.split('\n').filter(t => t.trim());
                                const newVentures = [...(formData.ventures || formData.sections || [])];
                                newVentures[index] = { 
                                  ...newVentures[index], 
                                  techStack: { ...(newVentures[index].techStack || {}), frontend } 
                                };
                                setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                              rows={3}
                              placeholder="React / Next.js&#10;TypeScript&#10;Tailwind CSS"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Backend (one per line)</label>
                            <textarea
                              value={(venture.techStack?.backend || []).join('\n')}
                              onChange={(e) => {
                                const backend = e.target.value.split('\n').filter(t => t.trim());
                                const newVentures = [...(formData.ventures || formData.sections || [])];
                                newVentures[index] = { 
                                  ...newVentures[index], 
                                  techStack: { ...(newVentures[index].techStack || {}), backend } 
                                };
                                setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                              rows={3}
                              placeholder="Node.js / Python&#10;PostgreSQL&#10;Redis Cache"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">AI/ML (one per line)</label>
                            <textarea
                              value={(venture.techStack?.aiml || []).join('\n')}
                              onChange={(e) => {
                                const aiml = e.target.value.split('\n').filter(t => t.trim());
                                const newVentures = [...(formData.ventures || formData.sections || [])];
                                newVentures[index] = { 
                                  ...newVentures[index], 
                                  techStack: { ...(newVentures[index].techStack || {}), aiml } 
                                };
                                setFormData({ ...formData, ventures: newVentures, sections: newVentures });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                              rows={3}
                              placeholder="Custom LLMs&#10;TensorFlow&#10;Real-time Analytics"
                            />
                          </div>
                        </div>
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

                {/* Hero Features */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold">Hero Features (3 cards below title)</h4>
                  {formData.hero?.features?.map((feature: any, idx: number) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-sm">Feature {idx + 1}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-2">Title</label>
                          <input
                            type="text"
                            value={feature.title || ''}
                            onChange={(e) => {
                              const newFeatures = [...(formData.hero?.features || [])];
                              newFeatures[idx] = { ...newFeatures[idx], title: e.target.value };
                              setFormData({ ...formData, hero: { ...formData.hero, features: newFeatures } });
                            }}
                            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Description</label>
                          <input
                            type="text"
                            value={feature.description || ''}
                            onChange={(e) => {
                              const newFeatures = [...(formData.hero?.features || [])];
                              newFeatures[idx] = { ...newFeatures[idx], description: e.target.value };
                              setFormData({ ...formData, hero: { ...formData.hero, features: newFeatures } });
                            }}
                            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dashboard Image (below hero features)</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Dashboard Image URL</label>
                  <input
                    type="text"
                    value={formData.dashboardImage || ''}
                    onChange={(e) => setFormData({ ...formData, dashboardImage: e.target.value })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    placeholder="https://images.unsplash.com/..."
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
                        <label className="block text-sm font-medium mb-2">Badge Text</label>
                        <input
                          type="text"
                          value={sectionItem.badge || ''}
                          onChange={(e) => {
                            const newSections = [...formData.sections];
                            newSections[index] = { ...newSections[index], badge: e.target.value };
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Image URL</label>
                        <input
                          type="text"
                          value={sectionItem.imageUrl || ''}
                          onChange={(e) => {
                            const newSections = [...formData.sections];
                            newSections[index] = { ...newSections[index], imageUrl: e.target.value };
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>

                      {/* Stats for Section 1 (Rapid Deployment) */}
                      {index === 0 && (
                        <div className="space-y-2 border-t border-white/10 pt-4">
                          <h4 className="text-sm font-semibold">Stats (6-12 weeks, 70% faster)</h4>
                          {sectionItem.stats?.map((stat: any, statIdx: number) => (
                            <div key={statIdx} className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={stat.value}
                                onChange={(e) => {
                                  const newSections = [...formData.sections];
                                  const newStats = [...(newSections[index].stats || [])];
                                  newStats[statIdx] = { ...newStats[statIdx], value: e.target.value };
                                  newSections[index] = { ...newSections[index], stats: newStats };
                                  setFormData({ ...formData, sections: newSections });
                                }}
                                className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                                placeholder="Value"
                              />
                              <input
                                type="text"
                                value={stat.label}
                                onChange={(e) => {
                                  const newSections = [...formData.sections];
                                  const newStats = [...(newSections[index].stats || [])];
                                  newStats[statIdx] = { ...newStats[statIdx], label: e.target.value };
                                  newSections[index] = { ...newSections[index], stats: newStats };
                                  setFormData({ ...formData, sections: newSections });
                                }}
                                className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                                placeholder="Label"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Features for Section 2 (Intelligent Platform) */}
                      {index === 1 && (
                        <div className="space-y-2 border-t border-white/10 pt-4">
                          <h4 className="text-sm font-semibold">Features (Real-time, Predictive, Automated)</h4>
                          {sectionItem.features?.map((feat: any, featIdx: number) => (
                            <Card key={featIdx} className="bg-black/20">
                              <CardContent className="pt-4 space-y-2">
                                <input
                                  type="text"
                                  value={feat.title}
                                  onChange={(e) => {
                                    const newSections = [...formData.sections];
                                    const newFeatures = [...(newSections[index].features || [])];
                                    newFeatures[featIdx] = { ...newFeatures[featIdx], title: e.target.value };
                                    newSections[index] = { ...newSections[index], features: newFeatures };
                                    setFormData({ ...formData, sections: newSections });
                                  }}
                                  className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                                  placeholder="Feature Title"
                                />
                                <input
                                  type="text"
                                  value={feat.description}
                                  onChange={(e) => {
                                    const newSections = [...formData.sections];
                                    const newFeatures = [...(newSections[index].features || [])];
                                    newFeatures[featIdx] = { ...newFeatures[featIdx], description: e.target.value };
                                    newSections[index] = { ...newSections[index], features: newFeatures };
                                    setFormData({ ...formData, sections: newSections });
                                  }}
                                  className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                                  placeholder="Description"
                                />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Insights for Section 3 (Seamless Integration) */}
                      {index === 2 && (
                        <div className="space-y-2 border-t border-white/10 pt-4">
                          <h4 className="text-sm font-semibold">Insights (Technical Architecture, Go-to-Market)</h4>
                          {sectionItem.insights?.map((insight: any, insightIdx: number) => (
                            <Card key={insightIdx} className="bg-black/20">
                              <CardContent className="pt-4 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={insight.category}
                                    onChange={(e) => {
                                      const newSections = [...formData.sections];
                                      const newInsights = [...(newSections[index].insights || [])];
                                      newInsights[insightIdx] = { ...newInsights[insightIdx], category: e.target.value };
                                      newSections[index] = { ...newSections[index], insights: newInsights };
                                      setFormData({ ...formData, sections: newSections });
                                    }}
                                    className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                                    placeholder="Category"
                                  />
                                  <input
                                    type="text"
                                    value={insight.impact}
                                    onChange={(e) => {
                                      const newSections = [...formData.sections];
                                      const newInsights = [...(newSections[index].insights || [])];
                                      newInsights[insightIdx] = { ...newInsights[insightIdx], impact: e.target.value };
                                      newSections[index] = { ...newSections[index], insights: newInsights };
                                      setFormData({ ...formData, sections: newSections });
                                    }}
                                    className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                                    placeholder="+23% efficiency"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={insight.title}
                                  onChange={(e) => {
                                    const newSections = [...formData.sections];
                                    const newInsights = [...(newSections[index].insights || [])];
                                    newInsights[insightIdx] = { ...newInsights[insightIdx], title: e.target.value };
                                    newSections[index] = { ...newSections[index], insights: newInsights };
                                    setFormData({ ...formData, sections: newSections });
                                  }}
                                  className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                                  placeholder="Main Action"
                                />
                                <input
                                  type="text"
                                  value={insight.description}
                                  onChange={(e) => {
                                    const newSections = [...formData.sections];
                                    const newInsights = [...(newSections[index].insights || [])];
                                    newInsights[insightIdx] = { ...newInsights[insightIdx], description: e.target.value };
                                    newSections[index] = { ...newSections[index], insights: newInsights };
                                    setFormData({ ...formData, sections: newSections });
                                  }}
                                  className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                                  placeholder="Description"
                                />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
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
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.hero?.description || ''}
                    onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, description: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    rows={3}
                  />
                </div>
                
                {/* Hero Features */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-semibold">Hero Features (3 cards below title)</h4>
                  </div>
                  {formData.hero?.features?.map((feature: any, idx: number) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-sm">Feature {idx + 1}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-2">Title</label>
                          <input
                            type="text"
                            value={feature.title || ''}
                            onChange={(e) => {
                              const newFeatures = [...(formData.hero?.features || [])];
                              newFeatures[idx] = { ...newFeatures[idx], title: e.target.value };
                              setFormData({ ...formData, hero: { ...formData.hero, features: newFeatures } });
                            }}
                            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Description</label>
                          <input
                            type="text"
                            value={feature.description || ''}
                            onChange={(e) => {
                              const newFeatures = [...(formData.hero?.features || [])];
                              newFeatures[idx] = { ...newFeatures[idx], description: e.target.value };
                              setFormData({ ...formData, hero: { ...formData.hero, features: newFeatures } });
                            }}
                            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Integration Section</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Integration Title</label>
                  <input
                    type="text"
                    value={formData.integrationTitle || ''}
                    onChange={(e) => setFormData({ ...formData, integrationTitle: e.target.value })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    placeholder="Integration without compromising velocity"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Feature Sections</h3>
                {formData.sections?.map((sectionItem: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">Section {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Badge Text</label>
                        <input
                          type="text"
                          value={sectionItem.badge || ''}
                          onChange={(e) => {
                            const newSections = [...formData.sections];
                            newSections[index] = { ...newSections[index], badge: e.target.value };
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
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
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Image URL</label>
                        <input
                          type="text"
                          value={sectionItem.imageUrl || ''}
                          onChange={(e) => {
                            const newSections = [...formData.sections];
                            newSections[index] = { ...newSections[index], imageUrl: e.target.value };
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>

                      {/* Markets array for Section 2 (Global Reach) */}
                      {index === 1 && (
                        <div className="space-y-2 border-t border-white/10 pt-4">
                          <h4 className="text-sm font-semibold">Markets List</h4>
                          {sectionItem.markets?.map((market: string, marketIdx: number) => (
                            <input
                              key={marketIdx}
                              type="text"
                              value={market}
                              onChange={(e) => {
                                const newSections = [...formData.sections];
                                const newMarkets = [...(newSections[index].markets || [])];
                                newMarkets[marketIdx] = e.target.value;
                                newSections[index] = { ...newSections[index], markets: newMarkets };
                                setFormData({ ...formData, sections: newSections });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                              placeholder="Region - Description"
                            />
                          ))}
                        </div>
                      )}

                      {/* Market Analysis for Section 1 (Autonomous Discovery) */}
                      {index === 0 && (
                        <div className="space-y-4 border-t border-white/10 pt-4">
                          <h4 className="text-sm font-semibold">Market Analysis Card</h4>
                          <div>
                            <label className="block text-sm font-medium mb-2">Card Title</label>
                            <input
                              type="text"
                              value={sectionItem.marketAnalysis?.title || ''}
                              onChange={(e) => {
                                const newSections = [...formData.sections];
                                newSections[index] = {
                                  ...newSections[index],
                                  marketAnalysis: { ...newSections[index].marketAnalysis, title: e.target.value }
                                };
                                setFormData({ ...formData, sections: newSections });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium mb-2">Status Text</label>
                              <input
                                type="text"
                                value={sectionItem.marketAnalysis?.status || ''}
                                onChange={(e) => {
                                  const newSections = [...formData.sections];
                                  newSections[index] = {
                                    ...newSections[index],
                                    marketAnalysis: { ...newSections[index].marketAnalysis, status: e.target.value }
                                  };
                                  setFormData({ ...formData, sections: newSections });
                                }}
                                className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">AI Status</label>
                              <input
                                type="text"
                                value={sectionItem.marketAnalysis?.aiStatus || ''}
                                onChange={(e) => {
                                  const newSections = [...formData.sections];
                                  newSections[index] = {
                                    ...newSections[index],
                                    marketAnalysis: { ...newSections[index].marketAnalysis, aiStatus: e.target.value }
                                  };
                                  setFormData({ ...formData, sections: newSections });
                                }}
                                className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Task</label>
                            <input
                              type="text"
                              value={sectionItem.marketAnalysis?.task || ''}
                              onChange={(e) => {
                                const newSections = [...formData.sections];
                                newSections[index] = {
                                  ...newSections[index],
                                  marketAnalysis: { ...newSections[index].marketAnalysis, task: e.target.value }
                                };
                                setFormData({ ...formData, sections: newSections });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Scanning Text</label>
                            <input
                              type="text"
                              value={sectionItem.marketAnalysis?.scanning || ''}
                              onChange={(e) => {
                                const newSections = [...formData.sections];
                                newSections[index] = {
                                  ...newSections[index],
                                  marketAnalysis: { ...newSections[index].marketAnalysis, scanning: e.target.value }
                                };
                                setFormData({ ...formData, sections: newSections });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Result (green text)</label>
                            <input
                              type="text"
                              value={sectionItem.marketAnalysis?.result || ''}
                              onChange={(e) => {
                                const newSections = [...formData.sections];
                                newSections[index] = {
                                  ...newSections[index],
                                  marketAnalysis: { ...newSections[index].marketAnalysis, result: e.target.value }
                                };
                                setFormData({ ...formData, sections: newSections });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Founder Input & AI Response for Section 3 (Venture Execution) */}
                      {index === 2 && (
                        <div className="space-y-4 border-t border-white/10 pt-4">
                          <h4 className="text-sm font-semibold">Founder Input Card</h4>
                          <div>
                            <label className="block text-sm font-medium mb-2">Quote</label>
                            <input
                              type="text"
                              value={sectionItem.founderInput?.quote || ''}
                              onChange={(e) => {
                                const newSections = [...formData.sections];
                                newSections[index] = {
                                  ...newSections[index],
                                  founderInput: { ...newSections[index].founderInput, quote: e.target.value }
                                };
                                setFormData({ ...formData, sections: newSections });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Context</label>
                            <input
                              type="text"
                              value={sectionItem.founderInput?.context || ''}
                              onChange={(e) => {
                                const newSections = [...formData.sections];
                                newSections[index] = {
                                  ...newSections[index],
                                  founderInput: { ...newSections[index].founderInput, context: e.target.value }
                                };
                                setFormData({ ...formData, sections: newSections });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                            />
                          </div>

                          <h4 className="text-sm font-semibold mt-4">AI Response Card</h4>
                          <div>
                            <label className="block text-sm font-medium mb-2">Result</label>
                            <input
                              type="text"
                              value={sectionItem.aiResponse?.result || ''}
                              onChange={(e) => {
                                const newSections = [...formData.sections];
                                newSections[index] = {
                                  ...newSections[index],
                                  aiResponse: { ...newSections[index].aiResponse, result: e.target.value }
                                };
                                setFormData({ ...formData, sections: newSections });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Actions</label>
                            <input
                              type="text"
                              value={sectionItem.aiResponse?.actions || ''}
                              onChange={(e) => {
                                const newSections = [...formData.sections];
                                newSections[index] = {
                                  ...newSections[index],
                                  aiResponse: { ...newSections[index].aiResponse, actions: e.target.value }
                                };
                                setFormData({ ...formData, sections: newSections });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">How It Works Section</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.howItWorks?.title || ''}
                    onChange={(e) => setFormData({ ...formData, howItWorks: { ...formData.howItWorks, title: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.howItWorks?.description || ''}
                    onChange={(e) => setFormData({ ...formData, howItWorks: { ...formData.howItWorks, description: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    rows={3}
                  />
                </div>

                {/* Market Signal Section */}
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <h4 className="text-md font-semibold">Market Signal Card</h4>
                  <div>
                    <label className="block text-sm font-medium mb-2">Signal</label>
                    <input
                      type="text"
                      value={formData.howItWorks?.marketSignal?.signal || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        howItWorks: { 
                          ...formData.howItWorks, 
                          marketSignal: { ...formData.howItWorks?.marketSignal, signal: e.target.value }
                        }
                      })}
                      className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Urgency Badge</label>
                      <input
                        type="text"
                        value={formData.howItWorks?.marketSignal?.urgency || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          howItWorks: { 
                            ...formData.howItWorks, 
                            marketSignal: { ...formData.howItWorks?.marketSignal, urgency: e.target.value }
                          }
                        })}
                        className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Threshold Badge</label>
                      <input
                        type="text"
                        value={formData.howItWorks?.marketSignal?.threshold || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          howItWorks: { 
                            ...formData.howItWorks, 
                            marketSignal: { ...formData.howItWorks?.marketSignal, threshold: e.target.value }
                          }
                        })}
                        className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Response Actions (3 bullet points)</label>
                    {formData.howItWorks?.marketSignal?.response?.map((resp: string, respIdx: number) => (
                      <input
                        key={respIdx}
                        type="text"
                        value={resp}
                        onChange={(e) => {
                          const newResponse = [...(formData.howItWorks?.marketSignal?.response || [])];
                          newResponse[respIdx] = e.target.value;
                          setFormData({ 
                            ...formData, 
                            howItWorks: { 
                              ...formData.howItWorks, 
                              marketSignal: { ...formData.howItWorks?.marketSignal, response: newResponse }
                            }
                          });
                        }}
                        className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm mb-2"
                      />
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Result</label>
                    <input
                      type="text"
                      value={formData.howItWorks?.marketSignal?.result || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        howItWorks: { 
                          ...formData.howItWorks, 
                          marketSignal: { ...formData.howItWorks?.marketSignal, result: e.target.value }
                        }
                      })}
                      className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    />
                  </div>
                </div>
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
                    placeholder="Use \n\n to separate paragraphs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="text"
                    value={formData.mission?.imageUrl || ''}
                    onChange={(e) => setFormData({ ...formData, mission: { ...formData.mission, imageUrl: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    placeholder="https://images.unsplash.com/..."
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

              <div className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold">Venture Building Process (Numbers Section)</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Section Title</label>
                  <input
                    type="text"
                    value={formData.ventureProcess?.title || ''}
                    onChange={(e) => setFormData({ ...formData, ventureProcess: { ...formData.ventureProcess, title: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                
                {/* Steps */}
                {formData.ventureProcess?.steps?.map((step: any, stepIdx: number) => (
                  <Card key={stepIdx}>
                    <CardHeader>
                      <CardTitle className="text-sm">Step {step.number}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={step.title || ''}
                          onChange={(e) => {
                            const newSteps = [...(formData.ventureProcess?.steps || [])];
                            newSteps[stepIdx] = { ...newSteps[stepIdx], title: e.target.value };
                            setFormData({ ...formData, ventureProcess: { ...formData.ventureProcess, steps: newSteps } });
                          }}
                          className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Subtitle</label>
                        <input
                          type="text"
                          value={step.subtitle || ''}
                          onChange={(e) => {
                            const newSteps = [...(formData.ventureProcess?.steps || [])];
                            newSteps[stepIdx] = { ...newSteps[stepIdx], subtitle: e.target.value };
                            setFormData({ ...formData, ventureProcess: { ...formData.ventureProcess, steps: newSteps } });
                          }}
                          className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Badge Text</label>
                        <input
                          type="text"
                          value={step.badge || ''}
                          onChange={(e) => {
                            const newSteps = [...(formData.ventureProcess?.steps || [])];
                            newSteps[stepIdx] = { ...newSteps[stepIdx], badge: e.target.value };
                            setFormData({ ...formData, ventureProcess: { ...formData.ventureProcess, steps: newSteps } });
                          }}
                          className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                        />
                      </div>
                      {stepIdx === 0 && step.actions && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium mb-2">Action Items (→)</label>
                          {step.actions.map((action: string, actionIdx: number) => (
                            <input
                              key={actionIdx}
                              type="text"
                              value={action}
                              onChange={(e) => {
                                const newSteps = [...(formData.ventureProcess?.steps || [])];
                                const newActions = [...newSteps[stepIdx].actions];
                                newActions[actionIdx] = e.target.value;
                                newSteps[stepIdx] = { ...newSteps[stepIdx], actions: newActions };
                                setFormData({ ...formData, ventureProcess: { ...formData.ventureProcess, steps: newSteps } });
                              }}
                              className="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-sm"
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                <div>
                  <label className="block text-sm font-medium mb-2">Result Text</label>
                  <input
                    type="text"
                    value={formData.ventureProcess?.result || ''}
                    onChange={(e) => setFormData({ ...formData, ventureProcess: { ...formData.ventureProcess, result: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold">Our Approach Section</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Badge</label>
                  <input
                    type="text"
                    value={formData.approach?.badge || ''}
                    onChange={(e) => setFormData({ ...formData, approach: { ...formData.approach, badge: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.approach?.title || ''}
                    onChange={(e) => setFormData({ ...formData, approach: { ...formData.approach, title: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.approach?.description || ''}
                    onChange={(e) => setFormData({ ...formData, approach: { ...formData.approach, description: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    rows={4}
                    placeholder="Use \n\n to separate paragraphs"
                  />
                </div>
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
                    rows={4}
                    placeholder="Use \n\n to separate paragraphs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="text"
                    value={formData.team?.imageUrl || ''}
                    onChange={(e) => setFormData({ ...formData, team: { ...formData.team, imageUrl: e.target.value } })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    placeholder="https://images.unsplash.com/..."
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



