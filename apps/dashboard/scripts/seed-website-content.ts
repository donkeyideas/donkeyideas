/**
 * Seed script to update website content in the database.
 * Repositions Donkey Ideas as a creative consulting studio.
 *
 * Usage:
 *   export DATABASE_URL="your-database-url"
 *   npx tsx apps/dashboard/scripts/seed-website-content.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sections = [
  {
    section: 'hero',
    content: {
      label: 'Creative Consulting Studio',
      headline: 'Got a Wild Idea?\nWe\'ll Help You\nBuild It',
      description: 'Donkey Ideas is a creative consulting studio that helps entrepreneurs, founders, and dreamers turn bold concepts into real businesses. From strategy and planning to financials and execution — we make ideas happen.',
      backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
      cta: {
        primary: { text: "LET'S TALK", link: '/contact' },
        secondary: { text: 'OUR SERVICES', link: '/services' },
      },
    },
  },
  {
    section: 'stats',
    content: {
      items: [
        { value: '50+', label: 'Projects Delivered' },
        { value: '6-12 weeks', label: 'Average Project Timeline' },
        { value: '15+', label: 'Industries Served' },
        { value: '92%', label: 'Client Retention Rate' },
      ],
    },
  },
  {
    section: 'about',
    content: {
      title: 'Where Crazy Ideas Meet Smart Execution',
      text: "Most people with big ideas don't need more advice — they need a partner who rolls up their sleeves and builds alongside them. That's Donkey Ideas. We're a creative consulting studio founded by a project manager who's spent years helping entrepreneurs, small businesses, and dreamers turn their wildest concepts into real, functioning ventures.\n\nWe're not a traditional consultancy that hands you a deck and disappears. We're a think tank that actually builds things. We plan it, model the financials, map out the strategy, prototype it, and help you launch it. From restaurant concepts to tech startups to nonprofit overhauls — if you've got an idea that keeps you up at night, we'll help you figure out how to make it work.\n\nOur approach is simple: understand your vision, pressure-test it with real research and financial modeling, then build a clear roadmap to get it done. No jargon, no fluff — just hands-on creative consulting that moves your idea from napkin sketch to reality.",
    },
  },
  {
    section: 'engage-excellence',
    content: {
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
        text2: "We move fast — most engagements kick off within a week of first contact. From building your business plan and financial projections to designing your go-to-market strategy and helping you pitch investors, we're with you every step of the way. Let's build something worth talking about.",
        ctaText: 'Start Your Project',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2070&auto=format&fit=crop',
      },
    },
  },
  {
    section: 'services-page',
    content: {
      hero: {
        title: 'The more ideas we build,\nthe sharper we get',
        description: 'Go beyond advice. We roll up our sleeves and help you plan, build, and launch. Whether you need a full business plan, financial projections, or a launch strategy — we bring the structure and expertise to make your idea real.',
        features: [
          { title: 'Strategic Planning', description: 'Research-backed roadmaps tailored to your specific idea and market' },
          { title: 'Financial Modeling', description: 'Investor-ready projections and budgets that actually make sense' },
          { title: 'Launch Execution', description: 'Hands-on support from concept through opening day' },
        ],
      },
      dashboardImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
      sections: [
        {
          badge: 'Rapid Execution',
          title: 'From concept to launch, fast',
          description: 'Don\'t let your idea sit on the shelf. Our proven project management framework helps you move from concept to launch in weeks, not months. We keep things lean, focused, and moving forward.',
          imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
          stats: [
            { value: '6-12 weeks', label: 'Average project timeline' },
            { value: '50+', label: 'Projects successfully delivered' },
          ],
        },
        {
          badge: 'Strategic Planning',
          title: 'Roadmaps that\nactually work',
          description: 'Get clear, actionable plans built on real market research and financial analysis. We don\'t just tell you what to do — we map out exactly how to do it, step by step.',
          imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070&auto=format&fit=crop',
          features: [
            { title: 'Market Research & Validation', description: 'Understand your competitive landscape and target market before you invest' },
            { title: 'Business Plan Development', description: 'Comprehensive plans that work for investors, banks, and your own decision-making' },
            { title: 'Financial Projections', description: 'Revenue models, cash flow forecasts, and break-even analysis you can actually trust' },
          ],
        },
        {
          badge: 'Focused Prioritization',
          title: 'Know exactly what\nto build first',
          description: 'See the full picture of your project so you can focus on what moves the needle most. We help you prioritize decisions that drive the biggest impact on your timeline and budget.',
          imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2074&auto=format&fit=crop',
          insights: [
            { category: 'Go-to-Market Strategy', impact: 'High Impact', title: 'Launch with a targeted local campaign', description: 'Reach your first 100 customers before scaling spend' },
            { category: 'Financial Planning', impact: 'Critical Path', title: 'Secure initial funding before buildout', description: 'Investor deck and financial model ready for pitch meetings' },
          ],
        },
      ],
    },
  },
  {
    section: 'process-page',
    content: {
      hero: {
        title: 'A process built for\nreal-world ideas',
        description: 'We\'ve refined our approach through dozens of projects across every kind of industry. Whether you\'re launching a restaurant, building a tech product, or reimagining a nonprofit — our process adapts to your idea while keeping things on track and on budget.',
        features: [
          { title: 'Tailored Strategies', description: 'Customized to match your unique vision and market' },
          { title: 'Iterative Approach', description: 'Adapted to real feedback and changing conditions' },
          { title: 'Rapid Execution', description: 'Industry-leading timelines from concept to launch' },
        ],
      },
      integrationTitle: 'Seamless collaboration without the red tape',
      sections: [
        {
          badge: 'Discovery & Research',
          title: 'Deep-dive validation\nbefore you invest',
          description: 'We start every project with thorough research — competitive analysis, market sizing, customer interviews, and feasibility studies. No assumptions, just data. This gives you confidence before you spend a dollar.',
          imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
          marketAnalysis: {
            title: 'Market Research',
            status: 'Complete',
            task: 'Competitive landscape analysis for new market entry',
            scanning: 'Analyzing industry reports, competitor positioning, customer segments...',
            result: 'Identified 3 underserved segments with strong demand signals',
            aiStatus: 'Research Complete',
          },
        },
        {
          badge: 'Global Reach',
          title: 'Launch in any market',
          description: 'Whether you\'re opening a business down the street or expanding internationally, we build strategies that account for local market dynamics, regulatory requirements, and cultural nuances.',
          imageUrl: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=2006&auto=format&fit=crop',
          markets: [
            'North America — Startups, restaurants, retail, real estate',
            'Europe — Market entry, localization, partnerships',
            'Asia-Pacific — E-commerce, manufacturing, supply chain',
            'Latin America — Emerging markets, nonprofit, community development',
          ],
        },
        {
          badge: 'Project Execution',
          title: 'Strike the right balance',
          description: 'Our project management approach adapts to your pace and priorities. We collaborate closely with you at every milestone, making sure the plan evolves with real-world feedback and your input drives every decision.',
          imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
          founderInput: {
            quote: '"We need to pivot our go-to-market strategy"',
            context: 'Customer feedback suggests a different entry point',
          },
          aiResponse: {
            result: 'Identified 3 alternative market segments with immediate demand',
            actions: 'Realigned roadmap, adjusted messaging, reprioritized launch milestones',
          },
        },
      ],
      howItWorks: {
        title: 'Research-driven project execution',
        description: 'Every initiative is backed by real data and market intelligence. We identify opportunities, build actionable strategies, and execute with precision — so your project has the highest chance of success from day one.',
        marketSignal: {
          signal: 'Customer acquisition cost rising beyond sustainable levels',
          urgency: 'Budget threshold approaching',
          threshold: 'Requires strategic pivot',
          response: [
            'Shifted to organic growth and referral strategy',
            'Reallocated 40% of budget to content marketing',
            'Launched community-driven referral program',
          ],
          result: 'Acquisition costs reduced by 62% within 8 weeks',
        },
      },
    },
  },
  {
    section: 'about-page',
    content: {
      hero: {
        title: 'A think tank for people\nwith big ideas',
        description: 'Donkey Ideas is a creative consulting studio that helps entrepreneurs and businesses turn bold concepts into reality. Part think tank, part project management firm — we plan it, build it, and launch it with you.',
      },
      mission: {
        title: 'Where bold ideas become real businesses',
        description: "We bridge the gap between a great idea and a real business. Through hands-on consulting, strategic planning, and financial modeling, we help founders and entrepreneurs take their concepts from napkin sketch to launch day.\n\nOur mission is to be the partner that every dreamer needs — someone who doesn't just say \"great idea\" but actually helps you figure out if it works, how to fund it, and how to build it. We take on the projects that traditional consultancies don't touch, because we believe the craziest ideas often have the most potential.",
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
        description: "We run a proven loop: understand the idea, research the market, build the plan, model the numbers, and launch.\n\nEvery step is deliberate. We prototype quickly, test assumptions with real data, and only move forward when the numbers make sense. That keeps your budget lean and your odds of success high.",
      },
      team: {
        title: 'Project managers, strategists & creative problem-solvers',
        description: "We're a small, scrappy team of people who love building things. Project managers, business strategists, financial modelers, and creative thinkers — all working together to help you bring your idea to life.\n\nWe're not traditional consultants who hand you a report and walk away. We're hands-on partners who stick with you through the messy middle — from the first brainstorm to opening day and beyond.",
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
      },
    },
  },
];

async function main() {
  console.log('Seeding website content...\n');

  for (const { section, content } of sections) {
    const result = await prisma.websiteContent.upsert({
      where: { section },
      update: { content: content as any, published: true },
      create: { section, content: content as any, published: true },
    });
    console.log(`  ✓ ${section} (updated: ${result.updatedAt.toISOString()})`);
  }

  console.log('\nDone! All sections updated.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
