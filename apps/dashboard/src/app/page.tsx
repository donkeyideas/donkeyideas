/* eslint-disable react/no-unescaped-entities */
// Donkey Ideas — venture-studio homepage (Path B: the "dumb-serious" mock as a
// real Next route, with a LIVE portfolio ledger + admin-editable copy).
//
// This file is intentionally named `page.studio.tsx` so it is NOT yet a route.
// To go live, rename it to `page.tsx` (back up the current one first). Nothing
// about /app (admin) or /api (backend) changes.
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@donkey-ideas/database';
import { Gabarito } from 'next/font/google';
import HomeMotion from '@/components/home/HomeMotion';
import { getVentureCounts, getPortfolio } from '@/lib/public-portfolio';
import './home-studio.css';

const gabarito = Gabarito({ subsets: ['latin'], weight: ['400', '500', '600', '800', '900'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Donkey Ideas | New York Venture Studio — We Turn Ideas Into Real Businesses',
  description:
    'Donkey Ideas is a New York venture studio that validates, builds, and launches digital products. Idea validation, business planning, financial modeling, and AI-native product development, plus fractional CFO services for startups — from napkin sketch to live business.',
  alternates: { canonical: 'https://www.donkeyideas.com/' },
  openGraph: {
    type: 'website',
    title: 'Donkey Ideas | Venture Studio — Dumb Ideas, Taken Seriously',
    description:
      'A one-person venture studio building a portfolio of real digital products: idea validation, financial modeling, and AI-native development from concept to launch.',
    url: 'https://www.donkeyideas.com/',
    images: [{ url: 'https://www.donkeyideas.com/og-home.png', width: 1200, height: 630, alt: 'Donkey Ideas — Dumb ideas, taken seriously.' }],
  },
  twitter: { card: 'summary_large_image', images: ['https://www.donkeyideas.com/og-home.png'] },
};

// --- Portfolio ledger — fully admin-driven (websiteContent['ventures-page']).
// Rows come from getPortfolio(); add / edit / reorder a venture in the admin and
// the homepage follows automatically. These maps translate admin values into the
// ledger's labels + colors.
type Status = { label: string; cls: string };

const STATUS_MAP: Record<string, Status> = {
  PRODUCTION: { label: 'Live', cls: 'live' },
  BETA: { label: 'Beta', cls: 'build' },
  ALPHA: { label: 'Alpha', cls: 'build' },
  DEVELOPMENT: { label: 'In build', cls: 'build' },
  IDEA: { label: 'Concept', cls: 'exp' },
};
const DEFAULT_STATUS: Status = { label: 'In build', cls: 'build' };

const DUMB_MAP: Record<string, { label: string; cls: string }> = {
  SEVERE: { label: 'Severe', cls: 'd3' },
  ELEVATED: { label: 'Elevated', cls: 'd2' },
  MODERATE: { label: 'Moderate', cls: 'd1' },
};

const HERO_TILES = ['argufight', 'basketball', 'govirall', 'jetdale', 'kamioi', 'julyu', 'buildwrk', 'opticrank', 'marble', 'cfbsocial'];

const DEFAULT_FAQ = [
  { q: 'What is Donkey Ideas?', a: 'Donkey Ideas is a venture studio based in New York that turns early-stage ideas into real digital businesses. It validates concepts with market research and financial modeling, then designs, builds, and launches the product — operating a portfolio of 11+ ventures across consumer apps, SaaS, fintech, media, and gaming.' },
  { q: 'What is a venture studio?', a: 'A venture studio creates and operates its own startups — taking ideas from validation through build and launch under one roof. Unlike an agency, it does not build for clients; unlike a VC fund, it does not just invest. It builds and owns.' },
  { q: 'How do you validate a business idea?', a: 'The same way every time: market and competitor research, a real financial model with unit economics, and a small, fast prototype to test actual demand — before serious time or money is committed. Most ideas fail this gauntlet. That is the point.' },
  { q: 'Why is it called Donkey Ideas?', a: 'Because every good idea looks dumb before it wins the race. The name filters for concepts that sound a little dumb at first — which is where the opportunities nobody serious is chasing tend to live.' },
  { q: 'Do you offer fractional CFO services?', a: 'Yes. Alongside the venture studio, Donkey Ideas provides fractional CFO services for startups and small businesses: financial modeling and forecasting, budgeting and cash-flow management, fundraising preparation, investor reporting, and monthly close oversight — senior finance leadership on a part-time basis, backed by 20 years as a controller and CFO.' },
  { q: 'Have an idea you want pressure-tested?', a: 'Send it over: info@donkeyideas.com. Worst case, you get an honest read on the numbers from a 20-year CFO. Best case, it stops being just an idea.' },
];

async function getWebsiteContent(): Promise<Record<string, any>> {
  try {
    const rows = await prisma.websiteContent.findMany({ where: { published: true } });
    return rows.reduce((acc: Record<string, any>, r: any) => {
      acc[r.section] = r.content;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export default async function StudioHomePage() {
  // Preserve existing behavior: logged-in owner goes straight to the admin.
  const cookieStore = await cookies();
  if (cookieStore.get('auth-token')) redirect('/app/dashboard');

  // Live member counts + real admin statuses (both cached hourly, degrade
  // gracefully) + editable copy.
  const [{ counts }, portfolio, content] = await Promise.all([
    getVentureCounts().catch(() => ({ counts: {} as Record<string, number>, total: 0 })),
    getPortfolio().catch(() => [] as Awaited<ReturnType<typeof getPortfolio>>),
    getWebsiteContent(),
  ]);
  const hero = content.studio_hero || {};
  const faq: { q: string; a: string }[] = content.studio_faq?.items || DEFAULT_FAQ;

  const kicker: string = hero.kicker || 'A one-person venture studio with a dumb name. On purpose.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': 'https://www.donkeyideas.com/#org', name: 'Donkey Ideas', url: 'https://www.donkeyideas.com/', email: 'info@donkeyideas.com', logo: 'https://www.donkeyideas.com/og-home.png', founder: { '@id': 'https://www.donkeyideas.com/#founder' }, address: { '@type': 'PostalAddress', addressLocality: 'New York', addressRegion: 'NY', addressCountry: 'US' }, description: 'A New York venture studio that validates, builds, and launches digital products, plus fractional CFO services.' },
      { '@type': 'Person', '@id': 'https://www.donkeyideas.com/#founder', name: 'Alain Beltran', jobTitle: 'Founder & Fractional CFO', worksFor: { '@id': 'https://www.donkeyideas.com/#org' }, address: { '@type': 'PostalAddress', addressLocality: 'New York', addressRegion: 'NY', addressCountry: 'US' }, knowsAbout: ['Fractional CFO services', 'Financial modeling', 'Fundraising', 'Cash flow management', 'FP&A', 'M&A integration', 'Venture building'], description: 'A finance executive with 20 years as a controller and CFO across SaaS, financial services, and public companies, and the founder of the Donkey Ideas venture studio.' },
      { '@type': 'WebSite', url: 'https://www.donkeyideas.com/', name: 'Donkey Ideas', publisher: { '@id': 'https://www.donkeyideas.com/#org' } },
      { '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  };

  return (
    <div className={`dk-home ${gabarito.className}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <HomeMotion />

      <header>
        <div className="nav">
          <a className="logo" href="#top">
            Donkey Ideas<span className="dumb">yes, it means what you think</span>
          </a>
          <nav aria-label="Main">
            <a href="#services">What we do</a>
            <a href="#ledger">Portfolio</a>
            <a href="#manual">Process</a>
            <a href="#cfo">CFO services</a>
            <a href="#faq">FAQ</a>
            <Link href="/blog">Blog</Link>
          </nav>
          <a className="btn" href="#contact">Pitch your idea</a>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <div className="bouncer" aria-hidden="true">
            {HERO_TILES.map((t, i) => (
              <span className="b-tile" data-b="" key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/ventures/${t}.png`} alt="" />
              </span>
            ))}
          </div>
          <div className="wrap">
            <div className="kicker">{kicker}</div>
            <h1>
              <span className="strike">Smart</span> <span className="hl">Dumb</span> ideas, taken seriously.
            </h1>
            {hero.sub ? (
              <p className="hero-sub">{hero.sub}</p>
            ) : (
              <p className="hero-sub">
                <b>Donkey Ideas is a New York venture studio</b> that turns early-stage ideas into real digital
                businesses. Every concept gets validated with market research and a real financial model —{' '}
                <b>twenty years of CFO discipline</b> — then designed, built, and launched with an AI-native process.
                11+ ventures and counting.
              </p>
            )}
            <div className="hero-cta">
              <a className="btn big" href="#contact">Pitch your idea</a>
              <a className="btn big ghost" href="#ledger">See the portfolio</a>
            </div>
            <div className="stamp" aria-hidden="true">
              CFO Approved<small>against his better judgment</small>
            </div>
            <div className="definition">
              <span className="term">don·key i·de·as</span>
              <span className="pos">noun, plural</span>
              <p>
                Polite corporate English for <b>dumb ideas</b> — the early-stage, easy-to-dismiss concepts a venture
                studio exists to validate, build, and launch. See also: every venture listed below.
              </p>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="services" id="services">
          <div className="wrap">
            <div className="sec-head">
              <h2>What a venture studio actually does<span style={{ color: 'var(--red)' }}>.</span></h2>
              <span className="sec-note">Idea in, business out.</span>
            </div>
            <div className="svc-grid">
              <div className="svc-card">
                <h3>Idea validation</h3>
                <p>Market research, competitor analysis, and a fast prototype to test real demand — so you find out an idea is wrong for hundreds of dollars, not hundreds of thousands.</p>
              </div>
              <div className="svc-card">
                <h3>Business planning and financial modeling</h3>
                <p>Unit economics, projections, and a plan built by a 20-year controller and CFO. If the model does not work on paper, the product does not get built.</p>
              </div>
              <div className="svc-card">
                <h3>AI-native product development</h3>
                <p>Design, code, and content shipped by one operator using modern AI tooling — team-level output at solo-founder speed, from consumer apps to B2B SaaS and fintech.</p>
              </div>
              <div className="svc-card">
                <h3>Launch and growth</h3>
                <p>Go-to-market, app store optimization, and organic growth loops. Every launch feeds a portfolio that compounds: winners get doubled down on, experiments get honest reviews.</p>
              </div>
            </div>
          </div>
        </section>

        {/* LEDGER — live member counts */}
        <section className="ledger" id="ledger">
          <div className="wrap">
            <div className="sec-head">
              <h2>The portfolio: {portfolio.length} ventures, built in-house<span style={{ color: 'var(--red)' }}>.</span></h2>
              <span className="sec-note">All real. All shipped or shipping.</span>
            </div>
            <div className="cols">
              <span>No.</span><span></span><span>Venture</span><span>What it is</span><span>Dumbness*</span><span>Status</span>
            </div>

            {portfolio.map((v, i) => {
              const count = v.extSlug ? counts[v.extSlug] : undefined;
              const status = STATUS_MAP[v.status] || DEFAULT_STATUS;
              const dumb = v.dumbness ? DUMB_MAP[v.dumbness.toUpperCase()] : null;
              return (
                <Link className="row" href={`/ventures/${v.slug}`} key={v.slug || i}>
                  <span className="no">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`tile${v.logo ? '' : ' letter'}`}>
                    {v.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.logo} alt={`${v.name} logo`} />
                    ) : (
                      v.letter
                    )}
                  </span>
                  <span className="name">
                    {v.name}
                    {typeof count === 'number' && count > 0 && (
                      <span className="members">{fmt(count)} members</span>
                    )}
                  </span>
                  <span className="desc">{v.tagline}</span>
                  <span className={`dumb ${dumb?.cls ?? ''}`}>{dumb?.label ?? ''}</span>
                  <span className={`status ${status.cls}`}>{status.label}</span>
                </Link>
              );
            })}

            <p className="footnote">
              * Dumbness assessed at inception using a proprietary methodology (gut feel). Past dumbness is not indicative
              of future results. Several &quot;Severe&quot; ratings are currently outperforming.
            </p>
          </div>
        </section>

        {/* MANUAL */}
        <section className="manual" id="manual">
          <div className="wrap">
            <div className="sec-head">
              <h2>How we turn an idea into a business<span style={{ color: 'var(--yellow)' }}>.</span></h2>
              <span className="sec-note">Playful in, serious out.</span>
            </div>
            <div className="manual-grid">
              <div className="m-item">
                <span className="rule-no">Rule 01</span>
                <h3>If it sounds dumb, investigate.</h3>
                <p>Every crowded market started as somebody&apos;s dumb idea. &quot;Sounds dumb&quot; means nobody serious is looking — which is exactly the opening.</p>
              </div>
              <div className="m-item">
                <span className="rule-no">Rule 02</span>
                <h3>Then model it like a CFO.</h3>
                <p>Twenty years as controller and CFO means the joke stops at the spreadsheet. Every idea gets real unit economics before it gets a logo.</p>
              </div>
              <div className="m-item">
                <span className="rule-no">Rule 03</span>
                <h3>Ship small, ship fast.</h3>
                <p>One person with AI-native tooling builds what used to take a team. Launch lean, let the market vote, spend real money only on what earns it.</p>
              </div>
              <div className="m-item">
                <span className="rule-no">Rule 04</span>
                <h3>Keep the winners, retire the rest.</h3>
                <p>The portfolio compounds. Winners get doubled down on, experiments get honest reviews, and sunsets happen without a funeral.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CFO */}
        <section className="cfo" id="cfo">
          <div className="wrap">
            <div className="cfo-grid">
              <div>
                <div className="cfo-label">The serious half, for hire</div>
                <h2>Fractional CFO services<span style={{ color: 'var(--red)' }}>.</span></h2>
                <p className="cfo-lede">The financial discipline behind every venture on this page is available to your company. Twenty years as a controller and CFO across SaaS, financial services, and public companies — fractional, so you get senior finance leadership without the full-time salary.</p>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <Link className="btn big" href="/fractional-cfo">Full CFO services page</Link>
                  <a className="btn big" style={{ background: 'transparent', color: 'var(--ink)' }} href="https://calendar.app.google/bTGoJDjxDWSHijKZ7" target="_blank" rel="noopener noreferrer">Book a CFO call</a>
                </div>
              </div>
              <ul className="cfo-list">
                <li><b>Financial modeling and forecasting</b><span>Unit economics, projections, and scenario planning you can defend in a board meeting.</span></li>
                <li><b>Budgeting, cash flow, and runway</b><span>Know exactly how much you have, how fast it moves, and when decisions are due.</span></li>
                <li><b>Fundraising preparation and investor reporting</b><span>Data rooms, pitch financials, and the monthly updates investors actually read.</span></li>
                <li><b>Monthly close, KPIs, and dashboards</b><span>Clean books and a scoreboard, so you run the business on numbers instead of vibes.</span></li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ — editable via websiteContent.studio_faq */}
        <section className="faq" id="faq">
          <div className="wrap">
            <div className="sec-head">
              <h2>Questions people actually ask<span style={{ color: 'var(--red)' }}>.</span></h2>
            </div>
            <div className="faq-list">
              {faq.map((f, i) => (
                <div className="faq-item" key={i}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* NAME */}
        <section className="name-sec" id="name">
          <div className="wrap">
            <span className="label">Why &quot;Donkey&quot;?</span>
            <blockquote>Every good idea looks dumb before it wins the race.</blockquote>
            <p>The donkey is stubborn, unglamorous, and easy to laugh at — and it carries the load up the hill every single day. Name chosen accordingly.</p>
          </div>
        </section>
      </main>

      <footer id="contact">
        <div className="wrap">
          <div className="foot">
            <h2>Got a <span className="hl">dumb</span> idea? Good — pitch it.</h2>
            <a className="mail" href="mailto:info@donkeyideas.com">info@donkeyideas.com</a>
          </div>
          <div className="copy">
            © {new Date().getFullYear()} Donkey Ideas · Venture Studio · New York, NY ·{' '}
            <Link className="foot-login" href="/login">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
