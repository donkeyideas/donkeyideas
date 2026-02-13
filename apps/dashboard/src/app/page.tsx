import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@donkey-ideas/database';
import ScrollHeader from '@/components/scroll-header';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { OrganizationStructuredData, WebsiteStructuredData, ServiceStructuredData, BreadcrumbStructuredData, FAQStructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'Donkey Ideas — Creative Consulting Studio | Turn Bold Ideas Into Real Businesses',
  description: 'Donkey Ideas is a creative consulting studio that helps entrepreneurs and founders turn bold ideas into real businesses. Strategy, business planning, financial modeling, and hands-on project management.',
  alternates: {
    canonical: 'https://www.donkeyideas.com',
  },
  keywords: [
    'creative consulting',
    'business consulting',
    'startup consulting',
    'business planning',
    'financial modeling',
    'project management',
    'idea development',
    'innovation consulting',
    'concept development',
    'business strategy',
  ],
  openGraph: {
    title: 'Donkey Ideas — Creative Consulting Studio',
    description: 'We help entrepreneurs and founders turn bold ideas into real businesses. Strategy, planning, financials, and execution — all under one roof.',
    url: 'https://www.donkeyideas.com',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Donkey Ideas - Creative Consulting Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Donkey Ideas — Creative Consulting Studio',
    description: 'We help entrepreneurs and founders turn bold ideas into real businesses. Strategy, planning, financials, and execution — all under one roof.',
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
    label: 'Creative Consulting Studio',
    headline: 'Got a Wild Idea?\nWe\'ll Help You\nBuild It',
    description: 'Donkey Ideas is a creative consulting studio that helps entrepreneurs, founders, and dreamers turn bold concepts into real businesses. From strategy and planning to financials and execution — we make ideas happen.',
    backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
    cta: {
      primary: { text: "LET'S TALK", link: '/contact' },
      secondary: { text: 'OUR SERVICES', link: '/services' },
    },
  };

  const aboutContent = content.about || {
    title: 'Where Crazy Ideas Meet Smart Execution',
    text: 'Most people with big ideas don\'t need more advice — they need a partner who rolls up their sleeves and builds alongside them. That\'s Donkey Ideas. We\'re a creative consulting studio founded by a project manager who\'s spent years helping entrepreneurs, small businesses, and dreamers turn their wildest concepts into real, functioning ventures.\n\nWe\'re not a traditional consultancy that hands you a deck and disappears. We\'re a think tank that actually builds things. We plan it, model the financials, map out the strategy, prototype it, and help you launch it. From restaurant concepts to tech startups to nonprofit overhauls — if you\'ve got an idea that keeps you up at night, we\'ll help you figure out how to make it work.\n\nOur approach is simple: understand your vision, pressure-test it with real research and financial modeling, then build a clear roadmap to get it done. No jargon, no fluff — just hands-on creative consulting that moves your idea from napkin sketch to reality.',
  };

  const statsContent = content.stats || {
    items: [
      { value: '50+', label: 'Projects Delivered' },
      { value: '6-12 weeks', label: 'Average Project Timeline' },
      { value: '15+', label: 'Industries Served' },
      { value: '92%', label: 'Client Retention Rate' },
    ],
  };

  const engageContent = content['engage-excellence'] || {
    badge: { text: 'Hands-On Approach', color: 'yellow' },
    title: 'Engage with\nexcellence',
    features: [
      {
        title: 'Strategy-First Thinking',
        description: 'Every project starts with deep research, market analysis, and a clear strategic roadmap tailored to your vision',
      },
      {
        title: 'Full-Service Execution',
        description: 'From business plans and financial models to branding and launch strategy — we handle it all',
      },
      {
        title: 'Real Partnership',
        description: 'We work alongside you as hands-on collaborators, not distant advisors watching from the sidelines',
      },
    ],
    ventureCanvas: {
      title: 'Project Canvas',
      text1: 'Ready to turn your idea into something real? Our team of strategists, project managers, and creative problem-solvers is ready to dig into your concept and build a plan that works.',
      text2: 'We move fast — most engagements kick off within a week of first contact. From building your business plan and financial projections to designing your go-to-market strategy and helping you pitch investors, we\'re with you every step of the way. Let\'s build something worth talking about.',
      ctaText: 'Start Your Project',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2070&auto=format&fit=crop',
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
          description: 'Donkey Ideas is a creative consulting studio that helps entrepreneurs and founders turn bold ideas into real businesses through strategic planning, financial modeling, and hands-on project management.',
          sameAs: [
            'https://twitter.com/donkeyideas',
            'https://linkedin.com/company/donkeyideas',
          ],
        }}
      />
      <WebsiteStructuredData />
      <ServiceStructuredData />
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: 'https://www.donkeyideas.com' },
      ]} />
      <FAQStructuredData items={[
        { question: 'What is Donkey Ideas?', answer: 'Donkey Ideas is a creative consulting studio that helps entrepreneurs, founders, and businesses turn bold ideas into reality. We provide hands-on support with business planning, financial modeling, strategy, and project management — from napkin sketch to launch day.' },
        { question: 'What services does Donkey Ideas offer?', answer: 'We offer creative consulting, business planning, financial modeling, go-to-market strategy, project management, and launch execution. Whether you need a full business plan, investor-ready financial projections, or a hands-on partner to manage the build — we do it all.' },
        { question: 'How long does a typical project take?', answer: 'Most projects run 6 to 12 weeks from kickoff to delivery. Timelines depend on scope and complexity, but we pride ourselves on moving fast without cutting corners.' },
        { question: 'Where is Donkey Ideas located?', answer: 'Donkey Ideas operates out of New York and Miami. We work with clients globally through a mix of in-person and remote collaboration.' },
        { question: 'How can I work with Donkey Ideas?', answer: 'Reach out through our contact page or schedule a call. We respond within 48 hours and most engagements kick off within a week. Whether you have a napkin sketch or a fully formed concept, we are ready to help you build it.' },
      ]} />

      {/* Navigation - Giga.ai style with scroll behavior */}
      <ScrollHeader />

      {/* Hero Section - Giga.ai inspired with background image */}
      <section className="relative min-h-[85vh] md:h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src={heroContent.backgroundImage}
            alt="Hero background"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
            quality={80}
          />
          {/* Gradient overlays for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/80" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 md:pt-0">
          {/* Label Badge */}
          <div className="inline-flex items-center gap-2 mb-6 md:mb-8 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-white/90 font-medium">
              {heroContent.label}
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-light leading-[1.1] mb-6 md:mb-8 tracking-tight">
            {heroContent.headline.split('\n').map((line: string, i: number) => (
              <div key={i}>{line}</div>
            ))}
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed font-light">
            {heroContent.description}
          </p>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/contact"
              className="px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-slate-900 rounded-full hover:bg-white/90 transition-all text-base font-medium shadow-xl hover:shadow-2xl hover:scale-105 transform"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12">
            {statsContent.items?.map((stat: any, index: number) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl md:text-6xl font-light mb-2 md:mb-3 text-white">
                  {stat.value}
                </div>
                <div className="text-slate-400 uppercase text-[10px] sm:text-xs tracking-widest font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section id="about" className="py-16 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs uppercase tracking-widest text-blue-400 mb-4 md:mb-6 font-medium">
            Our Philosophy
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-light mb-6 md:mb-8 leading-tight text-white">
            {aboutContent.title}
          </h2>
          <div className="space-y-4 md:space-y-6 text-base md:text-lg text-slate-300 leading-relaxed font-light text-left">
            {aboutContent.text.split('\n\n').map((paragraph: string, index: number) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Engage with Excellence Section */}
      <section className="py-16 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          {/* Top Section - Title and Features */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-20 items-start mb-12 md:mb-24">
            {/* Left - Title */}
            <div>
              <div className="inline-flex items-center gap-2 mb-6 md:mb-8 px-3 py-1.5 rounded-full bg-yellow-500/10">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                <span className="text-xs uppercase tracking-widest text-yellow-400 font-medium">
                  {engageContent.badge?.text || 'Innovation First'}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-light leading-tight text-white">
                {engageContent.title?.split('\n').map((line: string, i: number) => (
                  <div key={i}>{line}</div>
                ))}
              </h2>
            </div>

            {/* Right - Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
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
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Left - Description */}
            <div>
              <div className="flex items-center gap-3 mb-6 md:mb-8">
                <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-medium text-white">{engageContent.ventureCanvas?.title || 'Venture Canvas'}</h3>
              </div>

              <p className="text-slate-300 text-base md:text-lg leading-relaxed mb-6 md:mb-8">
                {engageContent.ventureCanvas?.text1}
              </p>

              <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8 md:mb-10">
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
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[4/5]">
              <Image
                src={engageContent.ventureCanvas?.imageUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2070&auto=format&fit=crop'}
                alt="Venture Canvas Platform"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={80}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-blue-400 mb-4 md:mb-6 font-medium text-center">
            Common Questions
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-light mb-8 md:mb-16 leading-tight text-white text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            <div className="border-b border-slate-700/50 pb-8">
              <h3 className="text-xl font-medium text-white mb-3">What is Donkey Ideas?</h3>
              <p className="text-slate-300 leading-relaxed">
                Donkey Ideas is a creative consulting studio that helps entrepreneurs, founders, and businesses turn bold ideas into reality. We provide hands-on support with business planning, financial modeling, strategy, and project management — taking you from napkin sketch to launch day.
              </p>
            </div>
            <div className="border-b border-slate-700/50 pb-8">
              <h3 className="text-xl font-medium text-white mb-3">What services does Donkey Ideas offer?</h3>
              <p className="text-slate-300 leading-relaxed">
                We offer creative consulting, business planning, financial modeling, go-to-market strategy, project management, and launch execution. Whether you need a full business plan, investor-ready financial projections, or a hands-on partner to manage the build — we tailor our engagement to your needs.
              </p>
            </div>
            <div className="border-b border-slate-700/50 pb-8">
              <h3 className="text-xl font-medium text-white mb-3">How long does a typical project take?</h3>
              <p className="text-slate-300 leading-relaxed">
                Most projects run 6 to 12 weeks from kickoff to delivery. Timelines depend on scope and complexity, but we pride ourselves on moving fast without cutting corners. We prioritize speed while maintaining the quality your project deserves.
              </p>
            </div>
            <div className="border-b border-slate-700/50 pb-8">
              <h3 className="text-xl font-medium text-white mb-3">Where is Donkey Ideas located?</h3>
              <p className="text-slate-300 leading-relaxed">
                Donkey Ideas operates out of New York and Miami. We work with clients globally through a mix of in-person collaboration and remote partnership models.
              </p>
            </div>
            <div className="pb-8">
              <h3 className="text-xl font-medium text-white mb-3">How can I work with Donkey Ideas?</h3>
              <p className="text-slate-300 leading-relaxed">
                You can get started by reaching out through our{' '}
                <Link href="/contact" className="text-blue-400 hover:text-blue-300 transition-colors">
                  contact page
                </Link>{' '}
                or{' '}
                <a href="https://calendar.app.google/uAubRuERACDqXYTU6" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
                  scheduling a call
                </a>
                . We respond within 48 hours and most engagements kick off within a week. Whether you have a napkin sketch or a fully formed concept, we are ready to help you build it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
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

