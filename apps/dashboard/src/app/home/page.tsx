import Link from 'next/link';
import { prisma } from '@donkey-ideas/database';

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

export default async function PublicHomePage() {
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
    title: 'Who We Are',
    text: 'Donkey Ideas is an AI-powered innovation lab that transforms unconventional concepts into intelligent, production-grade systems. We combine experimental thinking with rigorous engineering to build ventures that matter.',
  };

  const statsContent = content.stats || {
    items: [
      { value: '10+', label: 'Active Ventures' },
      { value: '$50M+', label: 'Capital Deployed' },
      { value: '15+', label: 'Team Members' },
      { value: '5+', label: 'Years Experience' },
    ],
  };

  const venturesContent = content.ventures || {
    title: 'Current Ventures',
    subtitle: 'Our Portfolio',
    items: [
      { title: 'Venture Name 1', description: 'Brief description of the venture and its impact.', imageUrl: '', link: '/register' },
      { title: 'Venture Name 2', description: 'Brief description of the venture and its impact.', imageUrl: '', link: '/register' },
      { title: 'Venture Name 3', description: 'Brief description of the venture and its impact.', imageUrl: '', link: '/register' },
    ],
  };

  const servicesContent = content.services || {
    title: 'Services',
    subtitle: 'What We Offer',
    items: [
      { title: 'Venture Operating System', description: 'Complete platform for managing your venture\'s financials, operations, and growth metrics.' },
      { title: 'Venture Building', description: 'From concept to launch, we build and scale innovative AI-powered products.' },
      { title: 'Innovation Laboratory', description: 'Experimental R&D to test and validate unconventional ideas before full-scale deployment.' },
    ],
  };

  const processContent = content.process || {
    title: 'Our Process',
    subtitle: 'How We Work',
    steps: [
      { step: '01', title: 'Ideate', desc: 'Unconventional thinking' },
      { step: '02', title: 'Validate', desc: 'Rapid experimentation' },
      { step: '03', title: 'Build', desc: 'Production-grade systems' },
      { step: '04', title: 'Scale', desc: 'Growth & optimization' },
    ],
  };

  const ctaContent = content.cta || {
    title: 'Ready to Transform Your Ideas?',
    description: 'Join us in building the next generation of intelligent systems.',
    buttonText: 'Get Started',
    buttonLink: '/register',
  };
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0A]/95 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 h-[90px] flex items-center justify-between">
          <div className="text-xl font-light tracking-wider">
            DONKEY <span className="font-bold">IDEAS</span>
          </div>
          <ul className="flex gap-12 list-none">
            <li>
              <Link href="/ventures" className="text-white/60 hover:text-white text-sm uppercase tracking-wider transition-colors">
                Ventures
              </Link>
            </li>
            <li>
              <Link href="/services" className="text-white/60 hover:text-white text-sm uppercase tracking-wider transition-colors">
                Services
              </Link>
            </li>
            <li>
              <Link href="/process" className="text-white/60 hover:text-white text-sm uppercase tracking-wider transition-colors">
                Approach
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-white/60 hover:text-white text-sm uppercase tracking-wider transition-colors">
                About Donkey
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-white/60 hover:text-white text-sm uppercase tracking-wider transition-colors">
                Login
              </Link>
            </li>
            <li>
              <Link href="/register" className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm uppercase tracking-wider">
                Get Started
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-[180px] pb-[120px] px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10">
            <div className="text-sm uppercase tracking-widest text-blue-400 mb-6">
              {heroContent.label}
            </div>
            <h1 className="text-7xl font-light leading-tight mb-8 whitespace-pre-line">
              {heroContent.headline}
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mb-10 leading-relaxed">
              {heroContent.description}
            </p>
            <div className="flex gap-4">
              <Link
                href={heroContent.cta?.primary?.link || '/ventures'}
                className="px-8 py-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors uppercase tracking-wider text-sm font-medium"
              >
                {heroContent.cta?.primary?.text || 'Explore Ventures'}
              </Link>
              <Link
                href={heroContent.cta?.secondary?.link || '/services'}
                className="px-8 py-4 border border-white/20 text-white rounded hover:border-white/40 hover:bg-white/5 transition-colors uppercase tracking-wider text-sm font-medium"
              >
                {heroContent.cta?.secondary?.text || 'View Services'}
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute top-[20%] right-[20%] w-[600px] h-[600px] bg-blue-500/15 rounded-full blur-3xl" />
      </section>

      {/* Stats Section */}
      <section className="py-20 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-8">
            {statsContent.items?.map((stat: any, index: number) => (
              <div key={index}>
                <div className="text-5xl font-light mb-2">{stat.value}</div>
                <div className="text-white/60 uppercase text-xs tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section id="about" className="py-32 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-sm uppercase tracking-widest text-blue-400 mb-4">Our Philosophy</div>
          <h2 className="text-5xl font-light mb-8">{aboutContent.title}</h2>
          <p className="text-xl text-white/70 max-w-3xl leading-relaxed">
            {aboutContent.text}
          </p>
        </div>
      </section>

      {/* Ventures Section */}
      <section id="ventures" className="py-32 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-sm uppercase tracking-widest text-blue-400 mb-4">
            {venturesContent.subtitle || 'Our Portfolio'}
          </div>
          <h2 className="text-5xl font-light mb-16">{venturesContent.title || 'Current Ventures'}</h2>
          <div className="grid grid-cols-3 gap-8">
            {venturesContent.items?.map((venture: any, index: number) => (
              <div key={index} className="border border-white/10 rounded-lg p-8 hover:border-blue-500/50 transition-colors">
                {venture.imageUrl ? (
                  <div className="w-full h-48 rounded mb-6 overflow-hidden">
                    <img
                      src={venture.imageUrl}
                      alt={venture.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded mb-6 flex items-center justify-center text-white/30 text-sm">
                    {venture.title || `Venture ${index + 1}`}
                  </div>
                )}
                <h3 className="text-2xl font-light mb-4">{venture.title || `Venture Name ${index + 1}`}</h3>
                <p className="text-white/60 mb-6">
                  {venture.description || 'Brief description of the venture and its impact.'}
                </p>
                <Link
                  href={venture.link || '/register'}
                  className="text-blue-400 hover:text-blue-300 text-sm uppercase tracking-wider"
                >
                  Learn More →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-32 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-sm uppercase tracking-widest text-blue-400 mb-4">
            {servicesContent.subtitle || 'What We Offer'}
          </div>
          <h2 className="text-5xl font-light mb-16">{servicesContent.title || 'Services'}</h2>
          <div className="grid grid-cols-3 gap-8">
            {servicesContent.items?.map((service: any, index: number) => (
              <div key={index} className="border border-white/10 rounded-lg p-8">
                <h3 className="text-2xl font-light mb-4">{service.title}</h3>
                <p className="text-white/60">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-32 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-sm uppercase tracking-widest text-blue-400 mb-4">
            {processContent.subtitle || 'How We Work'}
          </div>
          <h2 className="text-5xl font-light mb-16">{processContent.title || 'Our Process'}</h2>
          <div className="grid grid-cols-4 gap-8">
            {processContent.steps?.map((item: any) => (
              <div key={item.step}>
                <div className="text-6xl font-light text-blue-400/30 mb-4">{item.step}</div>
                <h3 className="text-2xl font-light mb-2">{item.title}</h3>
                <p className="text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-8 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-light mb-8">{ctaContent.title || 'Ready to Transform Your Ideas?'}</h2>
          <p className="text-xl text-white/70 mb-10">
            {ctaContent.description || 'Join us in building the next generation of intelligent systems.'}
          </p>
          <Link
            href={ctaContent.buttonLink || '/register'}
            className="inline-block px-10 py-5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors uppercase tracking-wider text-sm font-medium"
          >
            {ctaContent.buttonText || 'Get Started'}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="text-xl font-light tracking-wider">
              DONKEY <span className="font-bold">IDEAS</span>
            </div>
            <div className="text-white/60 text-sm">
              © {new Date().getFullYear()} Donkey Ideas. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

