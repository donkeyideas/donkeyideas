import Link from 'next/link';
import { prisma } from '@donkey-ideas/database';
import ScrollHeader from './home/scroll-header';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function getWebsiteContent() {
  try {
    const content = await prisma.websiteContent.findMany({
      where: { published: true },
      orderBy: { section: 'asc' },
    });
    return content.reduce((acc: Record<string, any>, item: any) => {
      acc[item.section] = item.content;
      return acc;
    }, {} as Record<string, any>);
  } catch (error) {
    console.error('Failed to load website content:', error);
    return {};
  }
}

export default async function HomePage() {
  // Check if user is logged in
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  
  // If logged in, go to dashboard
  if (token) {
    redirect('/app/dashboard');
  }
  
  // Otherwise, show public home page
  const content = await getWebsiteContent();
  
  // Default content if not in database
  const heroContent = content.hero || {
    label: 'Innovation Laboratory / Venture Builder',
    headline: 'Transforming\nUnconventional\nIdeas Into\nIntelligent Systems',
    description: 'We architect and deploy AI-powered products at the intersection of experimental thinking and production-grade engineering.',
    cta: {
      primary: { text: 'EXPLORE VENTURES', link: '#ventures' },
      secondary: { text: 'VIEW SERVICES', link: '#services' },
    },
  };

  const aboutContent = content.about || {
    title: 'Where Bold Ideas Meet Rigorous Engineering',
    text: 'At Donkey Ideas, we believe the best ventures emerge from the intersection of unconventional thinking and disciplined execution. While others chase trends, we build foundational technologies that create lasting value. Our AI-powered approach combines cutting-edge machine learning, battle-tested engineering practices, and deep market understanding to transform raw concepts into revenue-generating businesses.\n\nWe\'re not a traditional incubator or consultancy. We\'re builders who get our hands dirty with code, data, and customer conversations. Every venture in our portfolio represents a commitment to excellence—meticulously crafted systems designed to scale, adapt, and dominate their markets. We take calculated risks on ideas others overlook, because we know that world-changing innovations often sound absurd at first.\n\nOur Venture Operating System provides the infrastructure, methodologies, and AI tools that reduce time-to-market by 70% while increasing success probability. Whether you\'re a first-time founder with a napkin sketch or an enterprise looking to spin out innovation, we provide the technical firepower and strategic guidance to win.',
  };

  const statsContent = content.stats || {
    items: [
      { value: '87%', label: 'Ventures Reach Market Fit' },
      { value: '6-12 weeks', label: 'Average Time to MVP' },
      { value: '$45M+', label: 'Collective Portfolio Valuation' },
      { value: '23', label: 'AI Systems in Production' },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation - Giga.ai style with scroll behavior */}
      <ScrollHeader />

      {/* Hero Section - Giga.ai inspired with background image */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop')`,
            }}
          />
          {/* Gradient overlays for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/80" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-8 text-center">
          {/* Label Badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-white/90 font-medium">
              {heroContent.label}
            </span>
          </div>

          {/* Main Headline - Giga.ai style */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-light leading-[1.1] mb-8 tracking-tight">
            {heroContent.headline.split('\n').map((line: string, i: number) => (
              <div key={i}>{line}</div>
            ))}
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            {heroContent.description}
          </p>

          {/* CTA Button - Giga.ai style */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/contact"
              className="px-10 py-4 bg-white text-slate-900 rounded-full hover:bg-white/90 transition-all text-base font-medium shadow-xl hover:shadow-2xl hover:scale-105 transform"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {statsContent.items?.map((stat: any, index: number) => (
              <div key={index} className="text-center">
                <div className="text-5xl md:text-6xl font-light mb-3 text-white">
                  {stat.value}
                </div>
                <div className="text-slate-400 uppercase text-xs tracking-widest font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-blue-500/10">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span className="text-xs uppercase tracking-widest text-blue-400 font-medium">
                Our Philosophy
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-light leading-tight mb-6">
              {aboutContent.title}
            </h2>
          </div>
          <div className="prose prose-invert prose-lg max-w-none">
            {aboutContent.text.split('\n\n').map((paragraph: string, index: number) => (
              <p key={index} className="text-slate-300 text-lg leading-relaxed mb-6">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcase Section - Giga.ai style */}
      <section className="py-24 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-blue-500/10">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span className="text-xs uppercase tracking-widest text-blue-400 font-medium">
                Innovation First
              </span>
            </div>
            <h2 className="text-5xl md:text-6xl font-light mb-4">
              Engage with <br />excellence
            </h2>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">AI-First Development</h3>
              <p className="text-slate-400 leading-relaxed">
                Every venture leverages AI frameworks giving you an unfair advantage
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">Venture Operating System</h3>
              <p className="text-slate-400 leading-relaxed">
                Battle-tested platform powered by AI insights
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">Full-Stack Partnership</h3>
              <p className="text-slate-400 leading-relaxed">
                Co-builders providing hands-on expertise across every dimension
              </p>
            </div>
          </div>

          {/* Venture Canvas Section */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-light mb-6">Venture Canvas</h3>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                Ready to transform your idea into a market-dominating venture? Our team of AI engineers, product strategists, and growth experts is standing by to evaluate your concept.
                <br /><br />
                We move fast—most partnerships begin within 48 hours of first contact. From writing code and designing systems to acquiring customers and raising capital, we provide hands-on expertise across every dimension of venture building. Let&apos;s build something extraordinary together.
              </p>
              <Link
                href="/contact"
                className="inline-block px-8 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all font-medium"
              >
                Explore Venture Canvas
              </Link>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop"
                alt="Venture Canvas Platform"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h4 className="text-2xl font-light text-white mb-2">Venture Canvas Platform</h4>
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

