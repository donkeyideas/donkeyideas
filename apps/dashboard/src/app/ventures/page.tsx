import { prisma } from '@donkey-ideas/database';
import Link from 'next/link';
import VentureCard from '@/components/ventures/venture-card';

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
      subtitle: 'Production systems generating measurable impact',
    },
    ventures: [
      {
        status: 'PRODUCTION',
        statusColor: 'teal',
        category: 'ENTERPRISE PLATFORM',
        title: 'AI Workflow Engine',
        description: 'Autonomous process orchestration system handling complex multi-step workflows across enterprise infrastructure.',
        tags: ['Custom LLM', 'Distributed Systems', 'Real-time Processing'],
        gradient: 'from-blue-600 to-blue-400',
        imageUrl: '',
      },
      {
        status: 'PRODUCTION',
        statusColor: 'purple',
        category: 'DATA ANALYTICS',
        title: 'Market Intelligence Platform',
        description: 'Real-time competitive intelligence aggregation and analysis platform for strategic decision-making.',
        tags: ['Neural Networks', 'Data Pipeline', 'Predictive Models'],
        gradient: 'from-purple-600 to-pink-500',
        imageUrl: '',
      },
      {
        status: 'BETA',
        statusColor: 'yellow',
        category: 'RAPID PROTOTYPING',
        title: 'Voice-to-Product System',
        description: 'Natural language interface for rapid product development and deployment.',
        tags: ['NLP', 'Voice AI', 'Rapid Development'],
        gradient: 'from-teal-600 to-cyan-400',
        imageUrl: '',
      },
      {
        status: 'PRODUCTION',
        statusColor: 'purple',
        category: 'INTERNAL INFRASTRUCTURE',
        title: 'Predictive Analytics Framework',
        description: 'Advanced analytics framework for forecasting and strategic planning.',
        tags: ['Machine Learning', 'Forecasting', 'Analytics'],
        gradient: 'from-blue-600 to-purple-500',
        imageUrl: '',
      },
    ],
  };

  const pageContent = (content && typeof content === 'object' && content !== null) ? content : defaultContent;

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

      {/* Tagline Section */}
      <section className="pt-[180px] pb-16 px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xl text-white">
            {pageContent.hero?.subtitle || 'Production systems generating measurable impact'}
          </p>
        </div>
      </section>

      {/* Ventures Grid */}
      <section className="py-8 px-8 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 gap-6">
            {(pageContent.ventures || pageContent.sections || []).map((venture: any, index: number) => (
              <VentureCard key={index} venture={venture} index={index} />
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
