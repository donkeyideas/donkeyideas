import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@donkey-ideas/database';
import ScrollHeader from '@/components/scroll-header';

// Default ventures data
const defaultVentures = [
  {
    status: 'PRODUCTION',
    statusColor: 'teal',
    category: 'ENTERPRISE AI PLATFORM',
    title: 'Automated Decision Intelligence for Fortune 500',
    description: 'AI-powered decision support system analyzing millions of data points in real-time for C-suite executives. Reduced strategic planning cycles from months to days, increased forecast accuracy by 43%. Secured contracts with 7 Fortune 500 companies, achieving $12M ARR within 8 months.',
    tags: ['Real-time Analytics', 'C-Suite Intelligence', 'Strategic Planning'],
    gradient: 'from-blue-600 to-blue-400',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
    stats: [
      { value: '99.9%', label: 'System Uptime' },
      { value: '10x', label: 'Performance Increase' },
      { value: '70%', label: 'Cost Reduction' },
      { value: '24/7', label: 'AI Monitoring' },
    ],
    techStack: {
      frontend: ['React / Next.js', 'TypeScript', 'Tailwind CSS'],
      backend: ['Node.js / Python', 'PostgreSQL', 'Redis Cache'],
      aiml: ['Custom LLMs', 'TensorFlow', 'Real-time Analytics'],
    },
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
];

async function getVentureBySlug(slug: string) {
  let ventures = defaultVentures;
  
  try {
    const content = await prisma.websiteContent.findFirst({
      where: { section: 'ventures-page', published: true },
    });

    if (content?.content) {
      const pageContent = typeof content.content === 'string' 
        ? JSON.parse(content.content) 
        : content.content;
      ventures = pageContent.ventures || pageContent.sections || defaultVentures;
    }
  } catch (error) {
    console.error('Failed to load venture from database, using defaults:', error instanceof Error ? error.message : 'Unknown error');
    // Continue with default ventures
  }
  
  // Find venture by slug (convert title to slug format for matching)
  const venture = ventures.find((v: any) => {
    const ventureSlug = v.title
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-'); // Replace multiple dashes with single dash
    return ventureSlug === slug;
  });

  return venture || null;
}

export default async function VenturePage({ params }: { params: { slug: string } }) {
  const venture = await getVentureBySlug(params.slug);

  if (!venture) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  };

  const statusColor = statusColors[venture.statusColor] || statusColors.blue;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <ScrollHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-[1400px] mx-auto">
          <Link 
            href="/ventures"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Ventures
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
              {venture.status || 'PRODUCTION'}
            </span>
            <span className="text-sm uppercase tracking-widest text-blue-400">
              {venture.category || 'Enterprise Platform'}
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-light leading-tight mb-6">
            {venture.title}
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 max-w-4xl leading-relaxed">
            {venture.description}
          </p>
        </div>
      </section>

      {/* Main Image */}
      <section className="py-8 px-8">
        <div className="max-w-[1000px] mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
            {venture.imageUrl ? (
              <>
                <img
                  src={venture.imageUrl}
                  alt={venture.title}
                  className="w-full h-auto max-h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
              </>
            ) : (
              <div className="w-full aspect-[16/6] flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-500 text-sm">Venture Image Placeholder</p>
                  <p className="text-slate-600 text-xs mt-2">Add image via Admin Dashboard</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tags */}
      {venture.tags && venture.tags.length > 0 && (
        <section className="py-8 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-wrap gap-3">
              {venture.tags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-full text-sm text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Overview Section */}
      <section className="py-16 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <div className="text-sm uppercase tracking-widest text-blue-400 mb-2 font-medium">
                Status
              </div>
              <div className="text-2xl font-light text-white">
                {venture.status || 'Production'}
              </div>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <div className="text-sm uppercase tracking-widest text-blue-400 mb-2 font-medium">
                Category
              </div>
              <div className="text-2xl font-light text-white">
                {venture.category || 'Enterprise'}
              </div>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <div className="text-sm uppercase tracking-widest text-blue-400 mb-2 font-medium">
                Technology
              </div>
              <div className="text-2xl font-light text-white">
                {venture.tags?.[0] || 'AI-Powered'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Challenge & Solution */}
      <section className="py-16 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-red-500/10">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                <span className="text-xs uppercase tracking-widest text-red-400 font-medium">
                  The Challenge
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-light mb-6">
                Market Opportunity
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed">
                {venture.description}
              </p>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-green-500/10">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-xs uppercase tracking-widest text-green-400 font-medium">
                  Our Solution
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-light mb-6">
                AI-Powered Approach
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed mb-6">
                We built a production-grade system leveraging cutting-edge AI and machine learning to solve this challenge at scale.
              </p>
              <ul className="space-y-3">
                {venture.tags?.map((tag: string, index: number) => (
                  <li key={index} className="flex items-center gap-3 text-slate-300">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span>{tag}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      {venture.stats && venture.stats.length > 0 && (
        <section className="py-16 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-light mb-4">Impact & Results</h2>
              <p className="text-xl text-slate-400">Measurable outcomes from our work</p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-8">
              {venture.stats.map((stat: any, index: number) => (
                <div key={index} className="text-center">
                  <div className="text-4xl font-light text-white mb-2">{stat.value}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Technology Stack */}
      {venture.techStack && (
        <section className="py-16 px-8">
          <div className="max-w-[1400px] mx-auto">
            <h2 className="text-3xl md:text-4xl font-light mb-8">Technology Stack</h2>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <div className="grid md:grid-cols-3 gap-8">
                {venture.techStack.frontend && venture.techStack.frontend.length > 0 && (
                  <div>
                    <div className="text-sm uppercase tracking-widest text-blue-400 mb-4 font-medium">
                      Frontend
                    </div>
                    <div className="space-y-2">
                      {venture.techStack.frontend.map((tech: string, index: number) => (
                        <div key={index} className="text-slate-300">{tech}</div>
                      ))}
                    </div>
                  </div>
                )}
                {venture.techStack.backend && venture.techStack.backend.length > 0 && (
                  <div>
                    <div className="text-sm uppercase tracking-widest text-blue-400 mb-4 font-medium">
                      Backend
                    </div>
                    <div className="space-y-2">
                      {venture.techStack.backend.map((tech: string, index: number) => (
                        <div key={index} className="text-slate-300">{tech}</div>
                      ))}
                    </div>
                  </div>
                )}
                {venture.techStack.aiml && venture.techStack.aiml.length > 0 && (
                  <div>
                    <div className="text-sm uppercase tracking-widest text-blue-400 mb-4 font-medium">
                      AI/ML
                    </div>
                    <div className="space-y-2">
                      {venture.techStack.aiml.map((tech: string, index: number) => (
                        <div key={index} className="text-slate-300">{tech}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-light mb-6">
            Want to build something similar?
          </h2>
          <p className="text-xl text-slate-300 mb-10 leading-relaxed">
            Let&apos;s discuss how we can apply these same methodologies and technologies to your venture.
          </p>
          <Link
            href="/contact"
            className="inline-block px-10 py-4 bg-white text-slate-900 rounded-full hover:bg-white/90 transition-all text-base font-medium shadow-xl hover:shadow-2xl hover:scale-105 transform"
          >
            Talk to us
          </Link>
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
