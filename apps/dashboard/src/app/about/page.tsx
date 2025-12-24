import { prisma } from '@donkey-ideas/database';
import Link from 'next/link';

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
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0A]/95 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 h-[90px] flex items-center justify-between">
          <Link href="/home" className="text-xl font-light tracking-wider">
            DONKEY <span className="font-bold">IDEAS</span>
          </Link>
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
                Contact
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
      <section className="pt-[180px] pb-32 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10">
            <div className="text-sm uppercase tracking-widest text-blue-400 mb-6">
              {pageContent.hero?.subtitle || 'Who We Are'}
            </div>
            <h1 className="text-7xl font-light leading-tight mb-8">
              {pageContent.hero?.title || 'About Us'}
            </h1>
            <p className="text-xl text-white/70 max-w-3xl leading-relaxed">
              {pageContent.hero?.description || 'We transform unconventional ideas into intelligent, production-grade systems.'}
            </p>
          </div>
        </div>
        <div className="absolute top-[20%] right-[20%] w-[600px] h-[600px] bg-blue-500/15 rounded-full blur-3xl" />
      </section>

      {/* Mission Section */}
      <section className="py-32 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-light mb-8">{pageContent.mission?.title || 'Our Mission'}</h2>
          <p className="text-xl text-white/70 max-w-3xl leading-relaxed">
            {pageContent.mission?.description || 'To bridge the gap between experimental thinking and production-grade engineering, creating AI-powered solutions that drive measurable impact.'}
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-32 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-light mb-16">Our Values</h2>
          <div className="grid grid-cols-3 gap-8">
            {(pageContent.values || []).map((value: any, index: number) => (
              <div key={index} className="border border-white/10 rounded-lg p-8 hover:border-blue-500/50 transition-colors">
                <h3 className="text-2xl font-light mb-4">{value.title || `Value ${index + 1}`}</h3>
                <p className="text-white/60 leading-relaxed">
                  {value.description || 'Description of our core value.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-32 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-light mb-8">{pageContent.team?.title || 'Our Team'}</h2>
          <p className="text-xl text-white/70 max-w-3xl leading-relaxed mb-12">
            {pageContent.team?.description || 'A diverse group of engineers, designers, and strategists working together to build the future.'}
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-32 px-8 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-light mb-8">{pageContent.contact?.title || 'Get in Touch'}</h2>
          <p className="text-xl text-white/70 mb-10">
            {pageContent.contact?.description || 'Interested in working with us? We\'d love to hear from you.'}
          </p>
          <a
            href={`mailto:${pageContent.contact?.email || 'hello@donkeyideas.com'}`}
            className="inline-block px-10 py-5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors uppercase tracking-wider text-sm font-medium"
          >
            Contact Us
          </a>
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


