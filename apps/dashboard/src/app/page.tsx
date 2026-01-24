import Link from 'next/link';
import { prisma } from '@donkey-ideas/database';
import ScrollHeader from '@/components/scroll-header';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { OrganizationStructuredData, WebsiteStructuredData, ServiceStructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'Donkey Ideas — Transform Your Vision Into Reality',
  description: 'Build and scale your ventures with Donkey Ideas. Comprehensive tools for financial management, project tracking, pitch decks, and strategic planning for entrepreneurs and venture builders.',
  keywords: [
    'venture builder',
    'startup platform',
    'financial management',
    'pitch deck builder',
    'business planning tools',
    'entrepreneur platform',
    'venture operating system',
    'startup financial tools',
  ],
  openGraph: {
    title: 'Donkey Ideas — Transform Your Vision Into Reality',
    description: 'Build and scale your ventures with comprehensive tools for financial management, project tracking, and strategic planning.',
    url: 'https://www.donkeyideas.com',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Donkey Ideas - Venture Builder Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Donkey Ideas — Transform Your Vision Into Reality',
    description: 'Build and scale your ventures with comprehensive tools for financial management, project tracking, and strategic planning.',
    images: ['/og-image.png'],
  },
};

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
  
  // Otherwise, show public home page with dynamic content
  const content = await getWebsiteContent();
  
  // Default content if not in database
  const heroContent = content.hero || {
    label: 'Innovation Laboratory / Venture Builder',
    headline: 'Transforming\nUnconventional\nIdeas Into\nIntelligent Systems',
    description: 'We architect and deploy AI-powered products at the intersection of experimental thinking and production-grade engineering.',
    backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
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

  const engageContent = content['engage-excellence'] || {
    badge: { text: 'Innovation First', color: 'yellow' },
    title: 'Engage with\nexcellence',
    features: [
      {
        title: 'AI-First Development',
        description: 'Every venture leverages AI frameworks giving you an unfair advantage',
      },
      {
        title: 'Venture Operating System',
        description: 'Battle-tested platform powered by AI insights',
      },
      {
        title: 'Full-Stack Partnership',
        description: 'Co-builders providing hands-on expertise across every dimension',
      },
    ],
    ventureCanvas: {
      title: 'Venture Canvas',
      text1: 'Ready to transform your idea into a market-dominating venture? Our team of AI engineers, product strategists, and growth experts is standing by to evaluate your concept.',
      text2: 'We move fast—most partnerships begin within 48 hours of first contact. From writing code and designing systems to acquiring customers and raising capital, we provide hands-on expertise across every dimension of venture building. Let\'s build something extraordinary together.',
      ctaText: 'Explore Venture Canvas',
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Structured Data for SEO */}
      <OrganizationStructuredData
        data={{
          name: 'Donkey Ideas',
          url: 'https://www.donkeyideas.com',
          logo: 'https://www.donkeyideas.com/logo.png',
          description: 'Transform your vision into reality with Donkey Ideas, a comprehensive venture builder platform.',
          sameAs: [
            'https://twitter.com/donkeyideas',
            'https://linkedin.com/company/donkeyideas',
          ],
        }}
      />
      <WebsiteStructuredData />
      <ServiceStructuredData />

      {/* Navigation - Giga.ai style with scroll behavior */}
      <ScrollHeader />

      {/* Hero Section - Giga.ai inspired with background image */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('${heroContent.backgroundImage}')`,
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

      {/* Philosophy Section */}
      <section id="about" className="py-32 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs uppercase tracking-widest text-blue-400 mb-6 font-medium">
            Our Philosophy
          </div>
          <h2 className="text-5xl md:text-6xl font-light mb-8 leading-tight text-white">
            {aboutContent.title}
          </h2>
          <div className="space-y-6 text-lg text-slate-300 leading-relaxed font-light text-left">
            {aboutContent.text.split('\n\n').map((paragraph: string, index: number) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Engage with Excellence Section */}
      <section className="py-32 px-8">
        <div className="max-w-[1400px] mx-auto">
          {/* Top Section - Title and Features */}
          <div className="grid md:grid-cols-2 gap-20 items-start mb-24">
            {/* Left - Title */}
            <div>
              <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full bg-yellow-500/10">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                <span className="text-xs uppercase tracking-widest text-yellow-400 font-medium">
                  {engageContent.badge?.text || 'Innovation First'}
                </span>
              </div>
              <h2 className="text-5xl md:text-6xl font-light leading-tight text-white">
                {engageContent.title?.split('\n').map((line: string, i: number) => (
                  <div key={i}>{line}</div>
                ))}
              </h2>
            </div>

            {/* Right - Feature Cards */}
            <div className="grid grid-cols-3 gap-8">
              {engageContent.features?.map((feature: any, index: number) => (
                <div key={index}>
                  <div className="w-12 h-12 rounded-lg bg-slate-800/50 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {index === 0 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
                      {index === 1 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />}
                      {index === 2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />}
                    </svg>
                  </div>
                  <h3 className="text-base font-medium mb-2 text-white">{feature.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section - Venture Canvas with Image */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left - Description */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-medium text-white">{engageContent.ventureCanvas?.title || 'Venture Canvas'}</h3>
              </div>
              
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                {engageContent.ventureCanvas?.text1}
              </p>

              <p className="text-slate-400 leading-relaxed mb-10">
                {engageContent.ventureCanvas?.text2}
              </p>

              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all text-sm font-medium"
              >
                {engageContent.ventureCanvas?.ctaText || 'Explore Venture Canvas'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Right - Large Image */}
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={engageContent.ventureCanvas?.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop'}
                alt="Venture Canvas Platform"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
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

