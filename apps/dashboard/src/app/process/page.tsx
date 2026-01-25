import { prisma } from '@donkey-ideas/database';
import Link from 'next/link';
import ScrollHeader from '@/components/scroll-header';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Approach — Venture Building Process',
  description: 'Learn about Donkey Ideas\' proven approach to venture building, from ideation to scale. Our systematic process helps entrepreneurs succeed.',
  keywords: [
    'venture building process',
    'startup methodology',
    'business development approach',
    'entrepreneurship process',
    'startup framework',
  ],
  openGraph: {
    title: 'Our Approach — Venture Building Process | Donkey Ideas',
    description: 'Our proven approach to venture building, from ideation to scale.',
    url: 'https://www.donkeyideas.com/process',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Donkey Ideas Approach',
      },
    ],
  },
};

async function getPageContent() {
  try {
    const content = await prisma.websiteContent.findFirst({
      where: { section: 'process-page', published: true },
    });
    return content?.content || null;
  } catch (error) {
    console.error('Failed to load process page content:', error);
    return null;
  }
}

export default async function ProcessPage() {
  const content = await getPageContent();
  
  const defaultContent = {
    hero: {
      title: 'Meet your market with precision at every turn',
      description: 'Designed to make every venture launch feel inevitable. Our AI-powered approach allows us to navigate rapid market shifts, validate product-market fit, and detect opportunities with precision.',
      features: [
        { title: 'Tailored Strategies', description: 'Customized to match your unique vision and market' },
        { title: 'Dynamic Pivots', description: 'Adapted to changing markets and customer feedback' },
        { title: 'Ultra-Fast Execution', description: 'Industry-leading time from concept to production' },
      ],
    },
    integrationTitle: 'Integration without compromising velocity',
    sections: [
      {
        badge: 'Autonomous Discovery',
        title: 'AI-driven validation in real-time',
        description: 'Designed to respond dynamically to market signals and customer behavior patterns with less manual research. Our AI systems continuously monitor trends, validate assumptions, and identify opportunities before competitors.',
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
        marketAnalysis: {
          title: 'Market Analysis',
          status: 'Processing...',
          task: 'Analyze competitor landscape for fintech space',
          scanning: 'Scanning 10,000+ data points...',
          result: 'Found 3 underserved segments with 94% confidence',
          aiStatus: 'AI Model Active (2.4s)',
        },
      },
      {
        badge: 'Global Reach',
        title: 'Launch in any market',
        description: 'Deploy ventures anywhere in the world with localized strategies, compliance frameworks, and market-specific positioning. Our platform adapts to regional nuances automatically.',
        imageUrl: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=2006&auto=format&fit=crop',
        markets: [
          'North America - Tech & SaaS ecosystems',
          'Europe - Enterprise & B2B markets',
          'Asia-Pacific - Consumer & mobile-first',
          'Latin America - Emerging tech hubs',
        ],
      },
      {
        badge: 'Venture Execution',
        title: 'Strike the right balance',
        description: 'A venture approach that understands founder intent and meets it with contextually relevant strategies. This includes natural iteration cycles, adaptive pivots, and strategic decision-making at the right moments.',
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
        founderInput: {
          quote: '"We need to pivot our B2B strategy"',
          context: 'Market conditions suggest enterprise focus',
        },
        aiResponse: {
          result: 'Identified 3 enterprise segments with immediate demand',
          actions: 'Realigned roadmap, adjusted messaging, prioritized features',
        },
      },
    ],
    howItWorks: {
      title: 'Data-driven venture building',
      description: 'Execute every initiative with high probability of success thanks to systems that form decision logic and adapt strategies based on real market signals, customer behavior, and competitive intelligence.',
      marketSignal: {
        signal: 'Customer acquisition cost rising beyond sustainable levels',
        urgency: 'Urgency indicator detected',
        threshold: 'Budget threshold exceeded',
        response: [
          'Triggered product-led growth strategy',
          'Shifted 40% budget to content marketing',
          'Implemented referral program with AI optimization',
        ],
        result: 'CAC reduced by 62% within 8 weeks',
      },
    },
  };

  // Type guard to ensure content is an object with the expected structure
  const pageContent = (typeof content === 'object' && content !== null && !Array.isArray(content) 
    ? content 
    : defaultContent) as typeof defaultContent;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation with scroll effect */}
      <ScrollHeader />

      {/* Hero Section - Giga Voice Style */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-[1400px] mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-light leading-tight mb-8">
            {pageContent.hero?.title?.split('\n').map((line: string, i: number) => (
              <span key={i}>{line}<br /></span>
            )) || 'Our Process'}
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-12">
            {pageContent.hero?.description || ''}
          </p>
          
          {/* Key Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {pageContent.hero?.features?.map((feature: any, index: number) => (
              <div key={index} className="text-center">
                <div className="text-sm uppercase tracking-widest text-white mb-2 font-medium">{feature.title}</div>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-16 px-8">
        <div className="max-w-[1400px] mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-light mb-4">
            {pageContent.integrationTitle || 'Integration without compromising velocity'}
          </h2>
        </div>
      </section>

      {/* Feature 1 */}
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

                {/* Market Analysis Card */}
                {pageContent.sections[0].marketAnalysis && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-400">{pageContent.sections[0].marketAnalysis.title}</div>
                      <div className="text-xs text-blue-400">{pageContent.sections[0].marketAnalysis.status}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-base text-white">{pageContent.sections[0].marketAnalysis.task}</div>
                      <div className="text-sm text-slate-400">{pageContent.sections[0].marketAnalysis.scanning}</div>
                      <div className="text-sm text-green-400">{pageContent.sections[0].marketAnalysis.result}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      {pageContent.sections[0].marketAnalysis.aiStatus}
                    </div>
                  </div>
                )}
              </div>
            
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                <div className="aspect-[4/3] bg-gradient-to-br from-blue-900/20 to-cyan-900/20 flex items-center justify-center">
                  <img
                    src={pageContent.sections[0].imageUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'}
                    alt="AI Validation Dashboard"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Feature 2 - Multi-Market Support */}
      {pageContent.sections?.[1] && (
        <section className="py-32 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1 relative">
                <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                  <div className="aspect-[4/3] bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
                    <img
                      src={pageContent.sections[1].imageUrl || 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=2006&auto=format&fit=crop'}
                      alt="Multi-Market Launch"
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
                
                {/* Market List */}
                {pageContent.sections[1].markets && (
                  <div className="space-y-3">
                    {pageContent.sections[1].markets.map((market: string, index: number) => (
                      <div key={index} className="flex items-center gap-3 text-slate-300">
                        <div className="w-2 h-2 bg-blue-400 rounded-full" />
                        <span>{market}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Feature 3 */}
      {pageContent.sections?.[2] && (
        <section className="py-32 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-light mb-4">Natural & nuanced</h2>
            </div>

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
              
              {/* Example Cards */}
              <div className="space-y-4">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-slate-400">Founder Input</div>
                    <div className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Strategic</div>
                  </div>
                  <div className="text-base text-white mb-2">"We need to pivot our B2B strategy"</div>
                  <div className="text-sm text-slate-400">Market conditions suggest enterprise focus</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-slate-400">AI Response</div>
                    <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Adaptive</div>
                  </div>
                  <div className="text-base text-white mb-2">Identified 3 enterprise segments with immediate demand</div>
                  <div className="text-sm text-slate-400">Realigned roadmap, adjusted messaging, prioritized features</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                <div className="aspect-[4/3] bg-gradient-to-br from-green-900/20 to-emerald-900/20 flex items-center justify-center">
                  <img
                    src={pageContent.sections[2].imageUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop'}
                    alt="Team Collaboration"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* How It Works - Data-Driven Building */}
      <section className="py-32 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-widest text-blue-400 mb-4 font-medium">
              How It Works
            </div>
            <h2 className="text-5xl md:text-6xl font-light text-white mb-6">
              {pageContent.howItWorks?.title || 'Data-driven venture building'}
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              {pageContent.howItWorks?.description || 'Execute every initiative with high probability of success thanks to systems that form decision logic and adapt strategies based on real market signals, customer behavior, and competitive intelligence.'}
            </p>
          </div>

          {/* Market Signal Detected Card */}
          {pageContent.howItWorks?.marketSignal && (
            <div className="max-w-3xl mx-auto bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-xl font-medium">Market Signal Detected</h3>
              </div>
              
              <p className="text-lg text-white mb-4">{pageContent.howItWorks.marketSignal.signal}</p>
              
              <div className="flex gap-3 mb-6">
                <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded">
                  <span className="text-sm text-yellow-400">{pageContent.howItWorks.marketSignal.urgency}</span>
                </div>
                <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded">
                  <span className="text-sm text-red-400">{pageContent.howItWorks.marketSignal.threshold}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm text-slate-400 mb-3">Automated Response:</h4>
                <ul className="space-y-2">
                  {pageContent.howItWorks.marketSignal.response.map((item: string, index: number) => (
                    <li key={index} className="flex items-center gap-2 text-white">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <p className="text-slate-300">
                <span className="font-medium">Result:</span> {pageContent.howItWorks.marketSignal.result}
              </p>
            </div>
          )}
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

