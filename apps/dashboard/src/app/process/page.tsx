import { prisma } from '@donkey-ideas/database';
import Link from 'next/link';
import ScrollHeader from '../home/scroll-header';

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
      title: 'Our Process',
      subtitle: 'How We Work',
      description: 'A systematic approach to transforming ideas into intelligent systems.',
    },
    sections: [
      {
        step: '01',
        title: 'Ideate',
        description: 'Unconventional thinking and brainstorming innovative concepts.',
        imageUrl: '',
        details: 'We explore unconventional ideas and push the boundaries of what\'s possible.',
      },
      {
        step: '02',
        title: 'Validate',
        description: 'Rapid experimentation and validation of concepts.',
        imageUrl: '',
        details: 'Quick prototyping and testing to validate market fit and technical feasibility.',
      },
      {
        step: '03',
        title: 'Build',
        description: 'Production-grade systems and scalable architecture.',
        imageUrl: '',
        details: 'Engineering robust, scalable solutions with best practices and modern technology.',
      },
      {
        step: '04',
        title: 'Scale',
        description: 'Growth optimization and continuous improvement.',
        imageUrl: '',
        details: 'Optimizing for growth, monitoring performance, and iterating based on data.',
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

      {/* Hero Section - Giga Voice Style */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-[1400px] mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-light leading-tight mb-8">
            Meet your market with precision
            <br />
            at every turn
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-12">
            Designed to make every venture launch feel inevitable. Our AI-powered approach allows us to navigate rapid market shifts, validate product-market fit, and detect opportunities with precision. This ensures we match the tempo of innovation across any industry.
          </p>
          
          {/* Key Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-sm uppercase tracking-widest text-white mb-2 font-medium">
                Tailored Strategies
              </div>
              <p className="text-slate-400 text-sm">
                Customized to match your unique vision and market
              </p>
            </div>
            <div className="text-center">
              <div className="text-sm uppercase tracking-widest text-white mb-2 font-medium">
                Dynamic Pivots
              </div>
              <p className="text-slate-400 text-sm">
                Adapted to changing markets and customer feedback
              </p>
            </div>
            <div className="text-center">
              <div className="text-sm uppercase tracking-widest text-white mb-2 font-medium">
                Ultra-Fast Execution
              </div>
              <p className="text-slate-400 text-sm">
                Industry-leading time from concept to production
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-16 px-8">
        <div className="max-w-[1400px] mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-light mb-4">
            Integration without compromising velocity
          </h2>
        </div>
      </section>

      {/* Feature 1 - AI-Driven Validation */}
      <section className="py-32 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-blue-500/10">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span className="text-xs uppercase tracking-widest text-blue-400 font-medium">
                  Autonomous Discovery
                </span>
              </div>
              <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight">
                AI-driven validation
                <br />
                in real-time
              </h2>
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Designed to respond dynamically to market signals and customer behavior patterns with less manual research. Our AI systems continuously monitor trends, validate assumptions, and identify opportunities before competitors.
              </p>
              
              {/* Demo Card */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">Market Analysis</div>
                  <div className="text-xs text-blue-400">Processing...</div>
                </div>
                <div className="space-y-2">
                  <div className="text-base text-white">Analyze competitor landscape for fintech space</div>
                  <div className="text-sm text-slate-400">Scanning 10,000+ data points...</div>
                  <div className="text-sm text-green-400">Found 3 underserved segments with 94% confidence</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  AI Model Active (2.4s)
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                <div className="aspect-[4/3] bg-gradient-to-br from-blue-900/20 to-cyan-900/20 flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop"
                    alt="AI Validation Dashboard"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2 - Multi-Market Support */}
      <section className="py-32 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                <div className="aspect-[4/3] bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=2006&auto=format&fit=crop"
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
                  Global Reach
                </span>
              </div>
              <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight">
                Launch in any
                <br />
                market
              </h2>
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Deploy ventures anywhere in the world with localized strategies, compliance frameworks, and market-specific positioning. Our platform adapts to regional nuances automatically.
              </p>
              
              {/* Market List */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span>North America - Tech & SaaS ecosystems</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span>Europe - Enterprise & B2B markets</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span>Asia-Pacific - Consumer & mobile-first</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span>Latin America - Emerging tech hubs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3 - Precision Execution */}
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
                  Venture Execution
                </span>
              </div>
              <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight">
                Strike the right
                <br />
                balance
              </h2>
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                A venture approach that understands founder intent and meets it with contextually relevant strategies. This includes natural iteration cycles, adaptive pivots, and strategic decision-making at the right moments.
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
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
                    alt="Team Collaboration"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Data-Driven Building */}
      <section className="py-32 px-8 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-widest text-blue-400 mb-4 font-medium">
              How It Works
            </div>
            <h2 className="text-5xl md:text-6xl font-light text-white mb-6">
              Data-driven venture building
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Execute every initiative with high probability of success thanks to systems that form decision logic and adapt strategies based on real market signals, customer behavior, and competitive intelligence.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-400 mb-2">Market Signal Detected</div>
                    <div className="text-base text-white mb-1">Customer acquisition cost rising beyond sustainable levels</div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs">Urgency indicator detected</span>
                      <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs">Budget threshold exceeded</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-l-2 border-blue-500/30 pl-6 ml-6 space-y-4">
                  <div className="text-sm text-slate-400">Automated Response:</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      Triggered product-led growth strategy
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      Shifted 40% budget to content marketing
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      Implemented referral program with AI optimization
                    </div>
                  </div>
                  <div className="text-sm text-green-400 mt-4">Result: CAC reduced by 62% within 8 weeks</div>
                </div>
              </div>
            </div>
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

