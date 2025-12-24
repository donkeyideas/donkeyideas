import { prisma } from '@donkey-ideas/database';
import Link from 'next/link';

async function getPageContent() {
  try {
    const content = await prisma.websiteContent.findFirst({
      where: { section: 'services-page', published: true },
    });
    return content?.content || null;
  } catch (error) {
    console.error('Failed to load services page content:', error);
    return null;
  }
}

export default async function ServicesPage() {
  const content = await getPageContent();
  
  const defaultContent = {
    hero: {
      title: 'Our Services',
      subtitle: 'What We Offer',
      description: 'Comprehensive solutions for building and scaling innovative ventures.',
    },
    sections: [
      {
        title: 'Venture Operating System',
        description: 'Complete platform for managing your venture\'s financials, operations, and growth metrics.',
        imageUrl: '',
        features: ['Financial Management', 'Operations Dashboard', 'Growth Analytics'],
      },
      {
        title: 'Venture Building',
        description: 'From concept to launch, we build and scale innovative AI-powered products.',
        imageUrl: '',
        features: ['Product Development', 'AI Integration', 'Scalable Architecture'],
      },
      {
        title: 'Innovation Laboratory',
        description: 'Experimental R&D to test and validate unconventional ideas before full-scale deployment.',
        imageUrl: '',
        features: ['R&D Services', 'Prototyping', 'Validation Testing'],
      },
    ],
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
              <Link href="/home#ventures" className="text-white/60 hover:text-white text-sm uppercase tracking-wider transition-colors">
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
      <section className="pt-[180px] pb-[120px] px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10">
            <div className="text-sm uppercase tracking-widest text-blue-400 mb-6">
              {pageContent.hero?.subtitle || 'What We Offer'}
            </div>
            <h1 className="text-7xl font-light leading-tight mb-8">
              {pageContent.hero?.title || 'Our Services'}
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mb-10 leading-relaxed">
              {pageContent.hero?.description || 'Comprehensive solutions for building and scaling innovative ventures.'}
            </p>
          </div>
        </div>
        <div className="absolute top-[20%] right-[20%] w-[600px] h-[600px] bg-blue-500/15 rounded-full blur-3xl" />
      </section>

      {/* Services Sections */}
      <section className="py-32 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-32">
            {pageContent.sections?.map((section: any, index: number) => (
              <div
                key={index}
                className={`flex gap-16 items-center ${index % 2 === 1 ? 'flex-row-reverse' : ''}`}
              >
                <div className="flex-1">
                  {section.imageUrl ? (
                    <div className="w-full h-96 rounded-lg overflow-hidden">
                      <img
                        src={section.imageUrl}
                        alt={section.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center text-white/30 text-lg">
                      {section.title || `Service ${index + 1}`}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-5xl font-light mb-6">{section.title || `Service ${index + 1}`}</h2>
                  <p className="text-xl text-white/70 mb-6 leading-relaxed">
                    {section.description}
                  </p>
                  {section.features && section.features.length > 0 && (
                    <ul className="space-y-3">
                      {section.features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-3 text-white/60">
                          <div className="w-2 h-2 bg-blue-400 rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
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

