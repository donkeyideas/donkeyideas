import { prisma } from '@donkey-ideas/database';
import Link from 'next/link';
import Image from 'next/image';
import ScrollHeader from '@/components/scroll-header';
import { Metadata } from 'next';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'Services — Creative Consulting & Business Planning | Donkey Ideas',
  description: 'Creative consulting services: business planning, financial modeling, go-to-market strategy, project management, and launch execution for entrepreneurs and businesses.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/services',
  },
  keywords: [
    'creative consulting services',
    'business planning',
    'startup consulting',
    'strategic consulting',
    'financial modeling',
    'project management',
    'growth strategy',
    'launch execution',
    'business strategy consulting',
  ],
  openGraph: {
    title: 'Services — Creative Consulting & Business Planning | Donkey Ideas',
    description: 'Full suite of creative consulting services for entrepreneurs and businesses. Strategy, planning, financials, and execution.',
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
      title: 'The more ideas we build,\nthe sharper we get',
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
        description: 'Don\'t let your idea sit on the shelf. Our proven project management framework helps you move from concept to launch in weeks, not months. We keep things lean, focused, and moving forward.',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
        stats: [
          { value: '6-12 weeks', label: 'Average project timeline' },
          { value: '50+', label: 'Projects successfully delivered' },
        ],
      },
      {
        badge: 'Strategic Planning',
        title: 'Roadmaps that\nactually work',
        description: 'Get clear, actionable plans built on real market research and financial analysis. We don\'t just tell you what to do — we map out exactly how to do it, step by step.',
        imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070&auto=format&fit=crop',
        features: [
          { title: 'Market Research & Validation', description: 'Understand your competitive landscape and target market before you invest' },
          { title: 'Business Plan Development', description: 'Comprehensive plans that work for investors, banks, and your own decision-making' },
          { title: 'Financial Projections', description: 'Revenue models, cash flow forecasts, and break-even analysis you can actually trust' },
        ],
      },
      {
        badge: 'Focused Prioritization',
        title: 'Know exactly what\nto build first',
        description: 'See the full picture of your project so you can focus on what moves the needle most. We help you prioritize decisions that drive the biggest impact on your timeline and budget.',
        imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2074&auto=format&fit=crop',
        insights: [
          { category: 'Go-to-Market Strategy', impact: 'High Impact', title: 'Launch with a targeted local campaign', description: 'Reach your first 100 customers before scaling spend' },
          { category: 'Financial Planning', impact: 'Critical Path', title: 'Secure initial funding before buildout', description: 'Investor deck and financial model ready for pitch meetings' },
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
      <section className="pt-24 pb-10 md:pt-32 md:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light leading-tight mb-8">
            {pageContent.hero?.title?.split('\n').map((line: string, i: number) => (
              <span key={i}>{line}<br /></span>
            )) || 'Our Services'}
          </h1>
          <p className="text-base md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8 md:mb-12">
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
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
            <div className="aspect-video bg-gradient-to-br from-slate-800 via-slate-900 to-black relative">
              <Image
                src={pageContent.dashboardImage || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'}
                alt="Project Management Dashboard"
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
        <section className="py-16 md:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-blue-500/10">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span className="text-xs uppercase tracking-widest text-blue-400 font-medium">
                    {pageContent.sections[0].badge}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-light mb-6 leading-tight">
                  {pageContent.sections[0].title?.split('\n').map((line: string, i: number) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </h2>
                <p className="text-base md:text-xl text-slate-300 mb-8 leading-relaxed">
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
        <section className="py-16 md:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
              <div className="order-2 md:order-1 relative">
                <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                  <div className="aspect-[4/3] bg-gradient-to-br from-teal-900/20 to-cyan-900/20 relative">
                    <Image
                      src={pageContent.sections[1].imageUrl || 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070&auto=format&fit=crop'}
                      alt="Strategic Insights"
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
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-light mb-6 leading-tight">
                  {pageContent.sections[1].title?.split('\n').map((line: string, i: number) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </h2>
                <p className="text-base md:text-xl text-slate-300 mb-8 leading-relaxed">
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
        <section className="py-16 md:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-green-500/10">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span className="text-xs uppercase tracking-widest text-green-400 font-medium">
                    {pageContent.sections[2].badge}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-light mb-6 leading-tight">
                  {pageContent.sections[2].title?.split('\n').map((line: string, i: number) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </h2>
                <p className="text-base md:text-xl text-slate-300 mb-8 leading-relaxed">
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
      <section className="py-16 md:py-32 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-amber-500/10">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              <span className="text-xs uppercase tracking-widest text-amber-400 font-medium">
                Consulting & Advisory
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-light mb-6 leading-tight">
              Hands-on consulting for ideas at every stage
            </h2>
            <p className="text-base md:text-xl text-slate-300 leading-relaxed">
              Donkey Ideas is more than a planning partner — we roll up our sleeves. We work directly with founders, entrepreneurs, and business owners to solve complex challenges, build go-to-market strategies, and create the operational systems needed to launch and grow.
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
                We help businesses identify growth levers, optimize customer acquisition, and build repeatable revenue engines. Our team brings hands-on experience scaling projects from zero to profitability.
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">Business Planning</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We build comprehensive business plans that work for investors, banks, and your own decision-making. From market analysis and competitive positioning to operational roadmaps — we create plans that actually get used.
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
              <h3 className="text-xl font-medium mb-3 text-white">Technology & Digital Strategy</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We help you choose the right tools, platforms, and digital strategy for your business. From evaluating software solutions to designing workflows and implementation plans — we focus on practical, results-driven technology decisions.
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
      <footer className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-8">
            <div className="text-xl font-semibold tracking-tight">
              <span className="font-light">DONKEY</span> IDEAS
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm text-slate-400">
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

