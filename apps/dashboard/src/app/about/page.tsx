import { prisma } from '@donkey-ideas/database';
import Link from 'next/link';
import Image from 'next/image';
import ScrollHeader from '@/components/scroll-header';
import { Metadata } from 'next';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'About Us — Creative Consulting Studio | Donkey Ideas',
  description: 'Donkey Ideas is a creative consulting studio and think tank that helps entrepreneurs turn bold ideas into real businesses. Learn about our mission, values, and hands-on approach.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/about',
  },
  keywords: [
    'about donkey ideas',
    'creative consulting studio',
    'business consulting',
    'think tank',
    'entrepreneurship',
    'project management consulting',
    'innovation consulting',
  ],
  openGraph: {
    title: 'About Us — Creative Consulting Studio | Donkey Ideas',
    description: 'A creative consulting studio and think tank helping entrepreneurs turn bold ideas into real businesses.',
    url: 'https://www.donkeyideas.com/about',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'About Donkey Ideas',
      },
    ],
  },
};

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
      title: 'A think tank for people\nwith big ideas',
      description: 'Donkey Ideas is a creative consulting studio that helps entrepreneurs and businesses turn bold concepts into reality. Part think tank, part project management firm — we plan it, build it, and launch it with you.',
    },
    mission: {
      title: 'Where bold ideas become real businesses',
      description: 'We bridge the gap between a great idea and a real business. Through hands-on consulting, strategic planning, and financial modeling, we help founders and entrepreneurs take their concepts from napkin sketch to launch day.\n\nOur mission is to be the partner that every dreamer needs — someone who doesn\'t just say "great idea" but actually helps you figure out if it works, how to fund it, and how to build it. We take on the projects that traditional consultancies don\'t touch, because we believe the craziest ideas often have the most potential.',
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
    },
    values: [
      {
        title: 'Creativity',
        description: 'We embrace unconventional thinking and approach every project with fresh eyes. The best solutions often come from looking at problems differently.',
      },
      {
        title: 'Excellence',
        description: 'We hold ourselves to the highest standards in planning, strategy, and execution. Every deliverable — from a business plan to a financial model — is built to impress.',
      },
      {
        title: 'Impact',
        description: 'We measure success by results. Our projects generate revenue, secure funding, and create real value for the people and communities they serve.',
      },
    ],
    ventureProcess: {
      title: 'Our Process',
      steps: [
        {
          number: '1',
          title: 'You bring the idea',
          subtitle: 'We research the market and validate the concept',
          badge: 'Opportunity identified',
          actions: [
            'Business plan and strategy developed',
            'Financial model built in 2-4 weeks',
            'Go-to-market roadmap created',
          ],
        },
        {
          number: '2',
          title: 'Build and launch together',
          subtitle: 'We manage the project through execution',
          badge: 'Revenue generating',
          actions: [],
        },
      ],
      result: 'Validated business ready to grow',
    },
    approach: {
      badge: 'Our Approach',
      title: 'Plan smart, build fast, launch with confidence',
      description: 'We run a proven loop: understand the idea, research the market, build the plan, model the numbers, and launch.\n\nEvery step is deliberate. We prototype quickly, test assumptions with real data, and only move forward when the numbers make sense. That keeps your budget lean and your odds of success high.',
    },
    team: {
      title: 'Project managers, strategists & creative problem-solvers',
      description: 'We\'re a small, scrappy team of people who love building things. Project managers, business strategists, financial modelers, and creative thinkers — all working together to help you bring your idea to life.\n\nWe\'re not traditional consultants who hand you a report and walk away. We\'re hands-on partners who stick with you through the messy middle — from the first brainstorm to opening day and beyond.',
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
    },
  };

  // Type guard to ensure content is an object with the expected structure
  const rawContent = (typeof content === 'object' && content !== null && !Array.isArray(content)
    ? content
    : {}) as Partial<typeof defaultContent>;

  const cleanText = (value: unknown, fallback: string) => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const placeholderOnly = /^[-_—]+$/.test(trimmed);
    return placeholderOnly ? fallback : value;
  };

  const mergedApproach = {
    ...defaultContent.approach,
    ...rawContent.approach,
  };

  const mergedVentureProcess = {
    ...defaultContent.ventureProcess,
    ...rawContent.ventureProcess,
  };

  const defaultSteps = defaultContent.ventureProcess.steps || [];
  const contentSteps = Array.isArray(mergedVentureProcess.steps) ? mergedVentureProcess.steps : [];
  const mergedSteps = (contentSteps.length > 0 ? contentSteps : defaultSteps).map((step: any, idx: number) => {
    const fallback = defaultSteps[idx] || {};
    return {
      ...fallback,
      ...step,
      number: cleanText(step?.number, fallback.number || `${idx + 1}`),
      title: cleanText(step?.title, fallback.title || ''),
      subtitle: cleanText(step?.subtitle, fallback.subtitle || ''),
      badge: cleanText(step?.badge, fallback.badge || ''),
      actions: Array.isArray(step?.actions) && step.actions.length > 0 ? step.actions : (fallback.actions || []),
    };
  });

  const pageContent: typeof defaultContent = {
    ...defaultContent,
    ...rawContent,
    hero: { ...defaultContent.hero, ...rawContent.hero },
    mission: { ...defaultContent.mission, ...rawContent.mission },
    ventureProcess: {
      ...mergedVentureProcess,
      title: cleanText(mergedVentureProcess.title, defaultContent.ventureProcess.title),
      result: cleanText(mergedVentureProcess.result, defaultContent.ventureProcess.result),
      steps: mergedSteps,
    },
    approach: {
      ...mergedApproach,
      badge: cleanText(mergedApproach.badge, defaultContent.approach.badge),
      title: cleanText(mergedApproach.title, defaultContent.approach.title),
      description: cleanText(mergedApproach.description, defaultContent.approach.description),
    },
    team: { ...defaultContent.team, ...rawContent.team },
    values: rawContent.values && rawContent.values.length > 0 ? rawContent.values : defaultContent.values,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: 'https://www.donkeyideas.com' },
        { name: 'About', url: 'https://www.donkeyideas.com/about' },
      ]} />
      {/* Navigation with scroll effect */}
      <ScrollHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-[1400px] mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-light leading-tight mb-8">
            {pageContent.hero?.title?.split('\n').map((line: string, i: number) => (
              <span key={i}>{line}<br /></span>
            )) || 'About Us'}
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {pageContent.hero?.description || ''}
          </p>
        </div>
      </section>

      {/* Stats Section - HARDCODED */}
      <section className="py-16 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-light text-white mb-2">50+</div>
              <div className="text-sm text-slate-400">Projects delivered</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-white mb-2">15+</div>
              <div className="text-sm text-slate-400">Industries served</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-white mb-2">92%</div>
              <div className="text-sm text-slate-400">Client retention rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-white mb-2">6-12 weeks</div>
              <div className="text-sm text-slate-400">Average project timeline</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
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
                {pageContent.mission?.title?.split('\n').map((line: string, i: number) => (
                  <span key={i}>{line}<br /></span>
                )) || 'Our Mission'}
              </h2>
              <div className="space-y-6 text-lg text-slate-300 leading-relaxed">
                {pageContent.mission?.description?.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                <div className="aspect-[4/3] bg-gradient-to-br from-blue-900/20 to-purple-900/20 relative">
                  <Image
                    src={pageContent.mission?.imageUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop'}
                    alt="Team Collaboration"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-32 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-light mb-6">Our Core Values</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              The principles that guide everything we build and every decision we make
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pageContent.values?.map((value: any, index: number) => {
              const icons = [
                <path key="lightning" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
                <path key="check" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
                <path key="chart" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
              ];
              const colors = ['blue', 'purple', 'green'];
              const color = colors[index] || 'blue';
              return (
                <div key={index} className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/50 transition-all">
                  <div className={`w-12 h-12 rounded-lg bg-${color}-500/10 flex items-center justify-center mb-6`}>
                    <svg className={`w-6 h-6 text-${color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {icons[index]}
                    </svg>
                  </div>
                  <h3 className="text-2xl font-medium mb-4 text-white">{value.title}</h3>
                  <p className="text-slate-400 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Venture Building Process & Approach Section */}
      <section className="py-32 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              {/* Venture Building Process Card */}
              {pageContent.ventureProcess && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 space-y-6">
                  <div className="text-sm text-slate-400 mb-4">{pageContent.ventureProcess.title}</div>
                
                <div className="space-y-4">
                  {pageContent.ventureProcess.steps?.map((step: any, idx: number) => (
                    <div key={idx}>
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${idx === 0 ? 'bg-blue-500/10' : 'bg-purple-500/10'} flex items-center justify-center`}>
                          <span className={`${idx === 0 ? 'text-blue-400' : 'text-purple-400'} font-medium`}>{step.number}</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-base text-white mb-1">{step.title}</div>
                          <div className="text-sm text-slate-400">{step.subtitle}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`px-2 py-1 ${idx === 0 ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'} rounded text-xs`}>{step.badge}</span>
                          </div>
                        </div>
                      </div>
                      {step.actions?.length > 0 && (
                        <div className="border-l-2 border-blue-500/30 pl-4 ml-5 space-y-3 mt-4">
                          {step.actions.map((action: string, aIdx: number) => (
                            <div key={aIdx} className="text-sm text-slate-300">→ {action}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-700/50">
                  <div className="text-sm text-green-400">Result: {pageContent.ventureProcess.result}</div>
                </div>
              </div>
              )}
            </div>
            
            <div className="order-1 md:order-2">
              {pageContent.approach && (
                <>
                  <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-purple-500/10">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    <span className="text-xs uppercase tracking-widest text-purple-400 font-medium">
                      {pageContent.approach.badge}
                    </span>
                  </div>
                  <h2 className="text-5xl md:text-6xl font-light mb-6 leading-tight">
                    {pageContent.approach.title?.split('\n').map((line: string, i: number) => (
                      <span key={i}>{line}<br /></span>
                    )) || pageContent.approach.title}
                  </h2>
                  <div className="space-y-6 text-lg leading-relaxed">
                    {pageContent.approach.description?.split('\n\n').map((paragraph: string, index: number) => (
                      <p key={index} className={index === 0 ? 'text-xl text-slate-300' : 'text-lg text-slate-400'}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-32 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
                <div className="aspect-[4/3] bg-gradient-to-br from-teal-900/20 to-cyan-900/20 relative">
                  <Image
                    src={pageContent.team?.imageUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop'}
                    alt="Our Team"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
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
                {pageContent.team?.title?.split('\n').map((line: string, i: number) => (
                  <span key={i}>{line}<br /></span>
                )) || 'Our Team'}
              </h2>
              <div className="space-y-6 text-lg text-slate-300 leading-relaxed mb-8">
                {pageContent.team?.description?.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className={index === 0 ? 'text-xl' : 'text-lg text-slate-400'}>{paragraph}</p>
                ))}
              </div>

              {/* Team Stats - HARDCODED */}
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


