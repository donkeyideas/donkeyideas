import { prisma } from '@donkey-ideas/database';
import Link from 'next/link';
import ScrollHeader from '@/components/scroll-header';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Services — Comprehensive Venture Building',
  description: 'Discover Donkey Ideas\' full suite of venture building services including financial management, strategic planning, pitch deck creation, and project management tools.',
  keywords: [
    'venture building services',
    'startup services',
    'financial management services',
    'pitch deck services',
    'business planning',
    'strategic consulting',
  ],
  openGraph: {
    title: 'Services — Comprehensive Venture Building | Donkey Ideas',
    description: 'Full suite of venture building services for entrepreneurs and startups.',
    url: 'https://www.donkeyideas.com/services',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Donkey Ideas Services',
      },
    ],
  },
};

async function getPageContent() {
  try {
    const content = await prisma.websiteContent.findFirst({
      where: { section: 'services-page', published: true },
    });
    return content?.content || null;
  } catch (error) {
    console.error('Failed to load services page content:', error);
    return null;
  }
}

export default async function ServicesPage() {
  const content = await getPageContent();
  
  const defaultContent = {
    hero: {
      title: 'The more ventures you build, the better you become',
      description: 'Go beyond traditional consulting with our AI-powered venture building platform. Track portfolio performance, leverage intelligent insights, and get custom recommendations to accelerate any venture metric.',
      features: [
        { title: 'AI-Powered Insights', description: 'Machine learning recommendations based on real portfolio data' },
        { title: 'Accelerate Any Metric', description: 'Set goals and continuously improve time-to-market' },
        { title: 'Actionable Intelligence', description: 'Implement and measure improvements instantly' },
      ],
    },
    dashboardImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
    sections: [
      {
        badge: 'Rapid Deployment',
        title: 'Quickly validate and launch',
        description: 'Catch market opportunities and implement solutions before they become missed chances. Our AI-powered platform helps you move from concept to production in weeks, not months.',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
        stats: [
          { value: '6-12 weeks', label: 'Average time to MVP' },
          { value: '70% faster', label: 'Than traditional methods' },
        ],
      },
      {
        badge: 'Intelligent Platform',
        title: 'AI-powered recommendations',
        description: 'Get intelligent suggestions to reduce development time, boost product-market fit, and streamline operations based on real portfolio data and market trends.',
        imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070&auto=format&fit=crop',
        features: [
          { title: 'Real-time Portfolio Analytics', description: 'Track KPIs across all ventures with unified dashboards' },
          { title: 'Predictive Market Intelligence', description: 'AI-driven insights for strategic decision making' },
          { title: 'Automated Optimization', description: 'Continuous improvement recommendations you can implement instantly' },
        ],
      },
      {
        badge: 'Seamless Integration',
        title: 'Prioritize what matters most',
        description: 'See projected outcomes for strategic initiatives so you can focus on the developments that will make the biggest impact on your business goals.',
        imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2074&auto=format&fit=crop',
        insights: [
          { category: 'Technical Architecture', impact: '+23% efficiency', title: 'Implement microservices architecture', description: 'Reduce deployment time and increase system resilience' },
          { category: 'Go-to-Market Strategy', impact: '+15% conversion', title: 'Add PLG motion to enterprise sales', description: 'Accelerate customer acquisition and reduce CAC' },
        ],
      },
    ],
  };

  // Type guard to ensure content is an object with the expected structure
  const pageContent = (typeof content === 'object' && content !== null && !Array.isArray(content) 
    ? content 
    : defaultContent) as typeof defaultContent;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation with scroll effect */}
      <ScrollHeader />

      {/* Hero Section - Giga Insights Style */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-[1400px] mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-light leading-tight mb-8">
            {pageContent.hero?.title?.split('\n').map((line: string, i: number) => (
              <span key={i}>{line}<br /></span>
            )) || 'Our Services'}
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-12">
            {pageContent.hero?.description || ''}
          </p>
          
          {/* Key Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {pageContent.hero?.features?.map((feature: any, index: number) => (
              <div key={index} className="text-center">
                <div className="text-sm uppercase tracking-widest text-blue-400 mb-2 font-medium">{feature.title}</div>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Large Dashboard Preview */}
      <section className="py-16 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
            <div className="aspect-video bg-gradient-to-br from-slate-800 via-slate-900 to-black flex items-center justify-center">
              <img
                src={pageContent.dashboardImage || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'}
                alt="Venture Operating System Dashboard"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 1 - Rapid Deployment */}
      {pageContent.sections?.[0] && (
        <section className="py-32 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-blue-500/10">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span className="text-xs uppercase tracking-widest text-blue-400 font-medium">
                    {pageContent.sections[0].badge}
                  </span>
                </div>
                <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight">
                  {pageContent.sections[0].title?.split('\n').map((line: string, i: number) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </h2>
                <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                  {pageContent.sections[0].description}
                </p>

                
                {/* Stats */}
                {pageContent.sections[0].stats && (
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    {pageContent.sections[0].stats.map((stat: any, index: number) => (
                      <div key={index}>
                        <div className="text-3xl font-light text-white mb-2">{stat.value}</div>
                        <div className="text-sm text-slate-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="relative">
                <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center">
                    <img
                      src={pageContent.sections[0].imageUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop'}
                      alt="Analytics Dashboard"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Feature Section 2 - Smart Insights */}
      {pageContent.sections?.[1] && (
        <section className="py-32 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1 relative">
                <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                  <div className="aspect-[4/3] bg-gradient-to-br from-teal-900/20 to-cyan-900/20 flex items-center justify-center">
                    <img
                      src={pageContent.sections[1].imageUrl || 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070&auto=format&fit=crop'}
                      alt="AI Insights"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
              
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-purple-500/10">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  <span className="text-xs uppercase tracking-widest text-purple-400 font-medium">
                    {pageContent.sections[1].badge}
                  </span>
                </div>
                <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight">
                  {pageContent.sections[1].title?.split('\n').map((line: string, i: number) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </h2>
                <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                  {pageContent.sections[1].description}
                </p>

                
                {/* Feature List */}
                {pageContent.sections[1].features && (
                  <div className="space-y-4">
                    {pageContent.sections[1].features.map((feature: any, index: number) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center flex-shrink-0 mt-1">
                          <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {index === 0 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />}
                            {index === 1 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
                            {index === 2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium mb-1 text-white">{feature.title}</h3>
                          <p className="text-slate-400 text-sm">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Feature Section 3 - Implementation */}
      {pageContent.sections?.[2] && (
        <section className="py-32 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-green-500/10">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span className="text-xs uppercase tracking-widest text-green-400 font-medium">
                    {pageContent.sections[2].badge}
                  </span>
                </div>
                <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight">
                  {pageContent.sections[2].title?.split('\n').map((line: string, i: number) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </h2>
                <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                  {pageContent.sections[2].description}
                </p>

                
                {/* Insight Cards */}
                {pageContent.sections[2].insights && (
                  <div className="space-y-4">
                    {pageContent.sections[2].insights.map((insight: any, index: number) => (
                      <div key={index} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm text-slate-400">{insight.category}</div>
                          <div className="text-green-400 text-sm font-medium">{insight.impact}</div>
                        </div>
                        <div className="text-lg font-medium mb-2">{insight.title}</div>
                        <div className="text-sm text-slate-400">{insight.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="relative">
                <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                  <div className="aspect-[4/3] bg-gradient-to-br from-green-900/20 to-emerald-900/20 flex items-center justify-center">
                    <img
                      src={pageContent.sections[2].imageUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2074&auto=format&fit=crop'}
                      alt="Implementation Dashboard"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-16 px-8 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-xl font-semibold tracking-tight">
              <span className="font-light">DONKEY</span> IDEAS
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400">
              <Link href="/ventures" className="hover:text-white transition-colors">
                Ventures
              </Link>
              <Link href="/services" className="hover:text-white transition-colors">
                Services
              </Link>
              <Link href="/process" className="hover:text-white transition-colors">
                Approach
              </Link>
              <Link href="/about" className="hover:text-white transition-colors">
                About
              </Link>
              <Link href="/login" className="hover:text-white transition-colors">
                Login
              </Link>
            </div>
            <div className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Donkey Ideas
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

