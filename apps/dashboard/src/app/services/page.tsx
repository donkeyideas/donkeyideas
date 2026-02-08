import { prisma } from '@donkey-ideas/database';
import Link from 'next/link';
import Image from 'next/image';
import ScrollHeader from '@/components/scroll-header';
import { Metadata } from 'next';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'Services — Comprehensive Venture Building',
  description: 'Venture building and consulting services: strategic planning, financial modeling, AI strategy, and technical architecture.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/services',
  },
  keywords: [
    'venture building services',
    'startup consulting',
    'strategic consulting',
    'AI strategy consulting',
    'technical architecture consulting',
    'financial modeling',
    'growth strategy',
    'startup advisory',
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
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: 'https://www.donkeyideas.com' },
        { name: 'Services', url: 'https://www.donkeyideas.com/services' },
      ]} />
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
            <div className="aspect-video bg-gradient-to-br from-slate-800 via-slate-900 to-black relative">
              <Image
                src={pageContent.dashboardImage || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'}
                alt="Venture Operating System Dashboard"
                fill
                className="object-cover opacity-80"
                sizes="(max-width: 768px) 100vw, 1400px"
                priority
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
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-900/20 to-purple-900/20 relative">
                    <Image
                      src={pageContent.sections[0].imageUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop'}
                      alt="Analytics Dashboard"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
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
                  <div className="aspect-[4/3] bg-gradient-to-br from-teal-900/20 to-cyan-900/20 relative">
                    <Image
                      src={pageContent.sections[1].imageUrl || 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070&auto=format&fit=crop'}
                      alt="AI Insights"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
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
                  <div className="aspect-[4/3] bg-gradient-to-br from-green-900/20 to-emerald-900/20 relative">
                    <Image
                      src={pageContent.sections[2].imageUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2074&auto=format&fit=crop'}
                      alt="Implementation Dashboard"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Consulting & Advisory Section */}
      <section className="py-32 px-8 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-amber-500/10">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              <span className="text-xs uppercase tracking-widest text-amber-400 font-medium">
                Consulting & Advisory
              </span>
            </div>
            <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight">
              Strategic consulting for ventures at every stage
            </h2>
            <p className="text-xl text-slate-300 leading-relaxed">
              Beyond our platform, Donkey Ideas is a hands-on consulting partner. We work directly with founders, executives, and enterprise teams to solve complex business challenges, define go-to-market strategies, and build operational systems that scale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">Growth Strategy</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We help companies identify growth levers, optimize acquisition channels, and build repeatable revenue engines. Our consultants bring hands-on experience scaling ventures from zero to millions in ARR.
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">Technical Architecture</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                From system design and cloud infrastructure to AI integration and data pipelines, we advise engineering teams on building production-grade systems that handle scale without breaking the bank.
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">Financial Modeling & Fundraising</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We build investor-ready financial models, craft compelling pitch narratives, and prepare founders for due diligence. Our team has helped ventures raise from pre-seed through Series B rounds.
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">Product & Operations</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We help teams establish product development workflows, hiring frameworks, and operational playbooks. Whether you need to ship faster, hire smarter, or streamline your operations, we bring proven systems.
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">Market Entry & Expansion</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Entering a new market or expanding internationally? We provide competitive analysis, localization strategy, partnership development, and go-to-market execution plans tailored to your industry.
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">AI & Automation Strategy</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We assess where AI and automation can drive the most value in your business, build implementation roadmaps, and guide teams through adoption. From LLM integrations to workflow automation, we deliver practical AI solutions.
              </p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="text-lg text-slate-300 mb-6">
              Ready to explore how consulting can accelerate your business?
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-full hover:bg-white/90 transition-all text-base font-medium shadow-xl hover:shadow-2xl hover:scale-105 transform"
            >
              Book a Consultation
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

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

