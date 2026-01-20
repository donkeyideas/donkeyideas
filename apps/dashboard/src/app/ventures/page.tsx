import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@donkey-ideas/database';
import ScrollHeader from '@/components/scroll-header';

async function getPageContent() {
  try {
    const content = await prisma.websiteContent.findFirst({
      where: { section: 'ventures-page', published: true },
    });
    if (!content?.content) return null;
    
    // Handle JSON string or object
    if (typeof content.content === 'string') {
      try {
        return JSON.parse(content.content);
      } catch {
        return null;
      }
    }
    return content.content;
  } catch (error) {
    console.error('Failed to load ventures page content:', error);
    return null;
  }
}

export default async function VenturesPage() {
  let content;
  try {
    content = await getPageContent();
  } catch (error) {
    console.error('Error loading ventures page:', error);
    content = null;
  }
  
  const defaultContent = {
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
        gradient: 'from-blue-600 to-blue-400',
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
      },
      {
        status: 'PRODUCTION',
        statusColor: 'purple',
        category: 'CONSUMER AI APPLICATION',
        title: 'Personalized Learning Platform - 500K Active Users',
        description: 'From concept to product-market fit in 10 weeks. Adaptive learning system using reinforcement learning for personalized curricula. Achieved viral growth reaching 500K users organically within 6 months and secured Series A funding from top-tier VCs.',
        tags: ['Reinforcement Learning', 'Ed-Tech', 'Viral Growth'],
        gradient: 'from-purple-600 to-pink-500',
        imageUrl: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=2074&auto=format&fit=crop',
      },
      {
        status: 'PRODUCTION',
        statusColor: 'green',
        category: 'B2B SAAS INNOVATION',
        title: 'Supply Chain Optimization Saving $50M Annually',
        description: 'Intelligent logistics platform leveraging computer vision and predictive analytics. Predicts demand with 94% accuracy, reduces waste by 38%, cuts operational costs by $2.3M annually per client. Expanding internationally across 12 countries.',
        tags: ['Computer Vision', 'Predictive Analytics', 'Logistics'],
        gradient: 'from-teal-600 to-cyan-400',
        imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop',
      },
      {
        status: 'PRODUCTION',
        statusColor: 'purple',
        category: 'HEALTHCARE AI SYSTEM',
        title: 'Clinical Decision Support - 31% Better Outcomes',
        description: 'AI diagnostic assistant analyzing patient data, medical literature, and clinical guidelines. Processed over 2 million patient cases, identifies rare conditions 67% faster, measurably improved patient outcomes across partner hospitals.',
        tags: ['Medical AI', 'Diagnostic Support', 'Healthcare'],
        gradient: 'from-blue-600 to-purple-500',
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070&auto=format&fit=crop',
      },
    ],
  };

  const pageContent = (content && typeof content === 'object' && content !== null) ? content : defaultContent;
  const ventures = pageContent.ventures || pageContent.sections || defaultContent.ventures;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <ScrollHeader />

      {/* Hero Section - Giga Style */}
      <section className="pt-32 pb-24 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-light leading-tight mb-8">
            Ventures Built for the Future
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-light">
            {pageContent.hero?.subtitle || 'Each product in our portfolio represents a bold bet on unconventional ideas backed by rigorous engineering'}
          </p>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-16 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 text-center hover:bg-slate-800/50 transition-all">
              <h3 className="text-xl font-medium mb-3 text-white">Built for Scale</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Production-grade architecture handling millions of users with 99.9% uptime from day one
              </p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 text-center hover:bg-slate-800/50 transition-all">
              <h3 className="text-xl font-medium mb-3 text-white">Built for Intelligence</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Machine learning models and predictive analytics creating adaptive systems that improve with usage
              </p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 text-center hover:bg-slate-800/50 transition-all">
              <h3 className="text-xl font-medium mb-3 text-white">Built for Speed</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Rapid iteration and AI-assisted development shipping features 3x faster without sacrificing quality
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Venture Showcase Sections - Giga Agent Canvas Style */}
      <section className="py-24 px-8">
        <div className="max-w-[1400px] mx-auto space-y-32">
          {ventures.map((venture: any, index: number) => {
            const statusColors: Record<string, string> = {
              teal: 'bg-cyan-400/20 border-cyan-400/30 text-cyan-300',
              purple: 'bg-purple-400/20 border-purple-400/30 text-purple-300',
              yellow: 'bg-yellow-400/20 border-yellow-400/30 text-yellow-300',
              green: 'bg-green-400/20 border-green-400/30 text-green-300',
            };

            const gradients: Record<string, string> = {
              'from-blue-600 to-blue-400': 'from-blue-500/20 to-blue-600/20',
              'from-purple-600 to-pink-500': 'from-purple-500/20 to-pink-600/20',
              'from-teal-600 to-cyan-400': 'from-teal-500/20 to-cyan-600/20',
              'from-blue-600 to-purple-500': 'from-blue-500/20 to-purple-600/20',
            };

            const statusColor = venture.statusColor || 'teal';
            const gradient = venture.gradient || 'from-blue-600 to-blue-400';

            return (
              <div
                key={index}
                className={`grid md:grid-cols-2 gap-16 items-center ${
                  index % 2 === 1 ? '' : ''
                }`}
              >
                {/* Text Side */}
                <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="flex items-center gap-3 mb-6">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${statusColors[statusColor]} backdrop-blur-sm border text-xs font-medium uppercase`}>
                      <div className="w-1.5 h-1.5 bg-current rounded-full" />
                      {venture.status || 'PRODUCTION'}
                    </span>
                  </div>
                  
                  <div className="text-xs uppercase tracking-widest text-blue-400 mb-4 font-medium">
                    {venture.category || 'VENTURE'}
                  </div>
                  
                  <h3 className="text-4xl md:text-5xl font-light mb-6 text-white leading-tight">
                    {venture.title || `Venture ${index + 1}`}
                  </h3>
                  
                  <p className="text-slate-300 text-lg leading-relaxed mb-8">
                    {venture.description || ''}
                  </p>

                  {/* Tags */}
                  {venture.tags && venture.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {venture.tags.map((tag: string, tagIndex: number) => (
                        <span
                          key={tagIndex}
                          className="px-3 py-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-slate-300 text-sm hover:bg-white/10 transition-all"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Learn More Link */}
                  <Link
                    href={`/ventures/${venture.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-')}`}
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-base font-medium group transition-all"
                  >
                    Learn More
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                {/* Image/Visual Side */}
                <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 aspect-video bg-slate-800/50">
                    {venture.imageUrl ? (
                      <>
                        <Image
                          src={venture.imageUrl}
                          alt={venture.title}
                          width={1920}
                          height={1080}
                          className="w-full h-full object-cover"
                          quality={95}
                          priority={index === 0}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent" />
                      </>
                    ) : (
                      <div className={`relative w-full h-full bg-gradient-to-br ${gradients[gradient]} backdrop-blur-sm flex items-center justify-center`}>
                        <div className="text-8xl font-light text-white/10">
                          {(index + 1).toString().padStart(2, '0')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
