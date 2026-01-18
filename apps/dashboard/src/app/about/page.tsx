import { prisma } from '@donkey-ideas/database';
import Link from 'next/link';
import ScrollHeader from '../home/scroll-header';

async function getPageContent() {
  try {
    const content = await prisma.websiteContent.findFirst({
      where: { section: 'about-page', published: true },
    });
    return content?.content || null;
  } catch (error) {
    console.error('Failed to load about page content:', error);
    return null;
  }
}

export default async function AboutPage() {
  const content = await getPageContent();
  
  const defaultContent = {
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
  };

  // Type guard to ensure content is an object with the expected structure
  const pageContent = (typeof content === 'object' && content !== null && !Array.isArray(content) 
    ? content 
    : defaultContent) as typeof defaultContent;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation with scroll effect */}
      <ScrollHeader />

      {/* Hero Section - Ventures Style */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-[1400px] mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-light leading-tight mb-8">
            Building the future of
            <br />
            intelligent ventures
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            We're an AI-powered innovation lab combining unconventional thinking with rigorous engineering to build ventures that matter. Each product represents a bold bet on ideas others overlook.
          </p>
        </div>
      </section>

      {/* Stats Section - Services Style */}
      <section className="py-16 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-light text-white mb-2">87%</div>
              <div className="text-sm text-slate-400">Ventures reach market fit</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-white mb-2">$45M+</div>
              <div className="text-sm text-slate-400">Portfolio valuation</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-white mb-2">23</div>
              <div className="text-sm text-slate-400">AI systems in production</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-white mb-2">6-12 weeks</div>
              <div className="text-sm text-slate-400">Average time to MVP</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section with Image - Ventures Showcase Style */}
      <section className="py-32 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-blue-500/10">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span className="text-xs uppercase tracking-widest text-blue-400 font-medium">
                  Our Mission
                </span>
              </div>
              <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight">
                Where bold ideas
                <br />
                become reality
              </h2>
              <p className="text-xl text-slate-300 mb-6 leading-relaxed">
                We bridge the gap between experimental thinking and production-grade engineering, creating AI-powered solutions that drive measurable impact.
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                Our mission is to transform unconventional concepts that traditional VCs overlook into revenue-generating businesses. We take calculated risks on ideas that sound absurd at first, because we know world-changing innovations often do.
              </p>
            </div>
            
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                <div className="aspect-[4/3] bg-gradient-to-br from-blue-900/20 to-purple-900/20">
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

      {/* Values Section - Services Feature Grid */}
      <section className="py-32 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-light mb-6">Our Core Values</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              The principles that guide everything we build and every decision we make
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-medium mb-4 text-white">Innovation</h3>
              <p className="text-slate-400 leading-relaxed">
                We push boundaries and explore unconventional approaches. While others chase trends, we build foundational technologies that create lasting value.
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-medium mb-4 text-white">Excellence</h3>
              <p className="text-slate-400 leading-relaxed">
                We maintain the highest standards in engineering and product development. Every venture represents a commitment to meticulously crafted systems.
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-medium mb-4 text-white">Impact</h3>
              <p className="text-slate-400 leading-relaxed">
                We focus on building solutions that create real, measurable value. Our ventures generate revenue, solve real problems, and dominate their markets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How We Work - Approach Style with Demo */}
      <section className="py-32 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              {/* Demo Card */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 space-y-6">
                <div className="text-sm text-slate-400 mb-4">Venture Building Process</div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <span className="text-blue-400 font-medium">1</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-base text-white mb-1">Unconventional idea submitted</div>
                      <div className="text-sm text-slate-400">AI scans market for validation signals</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">Market gap identified</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-2 border-blue-500/30 pl-4 ml-5 space-y-3">
                    <div className="text-sm text-slate-300">→ Technical architecture designed</div>
                    <div className="text-sm text-slate-300">→ MVP built in 6-12 weeks</div>
                    <div className="text-sm text-slate-300">→ Product-market fit validated</div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <span className="text-purple-400 font-medium">2</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-base text-white mb-1">Production launch & scaling</div>
                      <div className="text-sm text-slate-400">AI optimizes growth loops automatically</div>
                      <div className="mt-2">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">Revenue generating</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700/50">
                  <div className="text-sm text-green-400">Result: Validated venture ready for scale</div>
                </div>
              </div>
            </div>
            
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-purple-500/10">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                <span className="text-xs uppercase tracking-widest text-purple-400 font-medium">
                  Our Approach
                </span>
              </div>
              <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight">
                AI-powered venture
                <br />
                methodology
              </h2>
              <p className="text-xl text-slate-300 mb-6 leading-relaxed">
                We combine cutting-edge AI with battle-tested engineering practices to reduce time-to-market by 70% while increasing success probability.
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                Our Venture Operating System provides the infrastructure, methodologies, and AI tools that turn raw concepts into revenue-generating businesses. We're builders who get our hands dirty with code, data, and customer conversations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section - Ventures Alternating Layout */}
      <section className="py-32 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                <div className="aspect-[4/3] bg-gradient-to-br from-teal-900/20 to-cyan-900/20">
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
                    alt="Our Team"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-teal-500/10">
                <div className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                <span className="text-xs uppercase tracking-widest text-teal-400 font-medium">
                  Our Team
                </span>
              </div>
              <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight">
                Builders, engineers
                <br />
                & strategists
              </h2>
              <p className="text-xl text-slate-300 mb-6 leading-relaxed">
                A diverse group of AI engineers, product designers, and venture strategists working together to build the future.
              </p>
              <p className="text-lg text-slate-400 leading-relaxed mb-8">
                We're not traditional consultants. We're technical co-founders who write code, design systems, acquire customers, and raise capital alongside entrepreneurs who dare to think differently.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                  <div className="text-2xl font-light text-white mb-1">15+</div>
                  <div className="text-sm text-slate-400">Team members</div>
                </div>
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                  <div className="text-2xl font-light text-white mb-1">50+</div>
                  <div className="text-sm text-slate-400">Years combined experience</div>
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


