/* eslint-disable react/no-unescaped-entities */
// Fractional CFO services — new public route (purely additive; nothing else changes).
import Link from 'next/link';
import { Metadata } from 'next';
import { Gabarito } from 'next/font/google';
import CfoMotion from '@/components/home/CfoMotion';
import CfoLeadForm from '@/components/home/CfoLeadForm';
import StickyCta from '@/components/home/StickyCta';
import './cfo.css';

const gabarito = Gabarito({ subsets: ['latin'], weight: ['400', '500', '600', '800', '900'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Fractional CFO Services — Remote CFO for Startups & Small Businesses | Donkey Ideas',
  description:
    'Remote fractional CFO services for startups and small businesses: financial modeling, forecasting, cash-flow and runway management, fundraising preparation, and investor reporting. 20 years as a controller and CFO. New York-based, working with companies across the US.',
  alternates: { canonical: 'https://www.donkeyideas.com/fractional-cfo' },
  openGraph: {
    type: 'website',
    title: 'Fractional CFO Services — Remote | Donkey Ideas',
    description:
      'Senior finance leadership without the full-time salary. Financial modeling, forecasting, fundraising prep, and monthly close oversight — fully remote.',
    url: 'https://www.donkeyideas.com/fractional-cfo',
    images: [{ url: 'https://www.donkeyideas.com/og-fractional-cfo.png', width: 1200, height: 630, alt: 'Fractional CFO services, fully remote — Donkey Ideas' }],
  },
  twitter: { card: 'summary_large_image', images: ['https://www.donkeyideas.com/og-fractional-cfo.png'] },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Service',
      '@id': 'https://www.donkeyideas.com/fractional-cfo#service',
      name: 'Fractional CFO Services',
      serviceType: 'Fractional CFO',
      areaServed: 'United States',
      provider: { '@type': 'Organization', name: 'Donkey Ideas', url: 'https://www.donkeyideas.com/', email: 'info@donkeyideas.com', address: { '@type': 'PostalAddress', addressLocality: 'New York', addressRegion: 'NY', addressCountry: 'US' } },
      description: 'Remote fractional CFO services for startups and small businesses: financial modeling and forecasting, budgeting, cash-flow and runway management, fundraising preparation, investor reporting, and monthly close oversight.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'What is a fractional CFO?', acceptedAnswer: { '@type': 'Answer', text: 'A senior finance executive who works with your company part-time — typically a set number of days per month — providing CFO-level leadership: financial modeling, forecasting, cash-flow management, and fundraising support, at a fraction of the cost of a full-time hire.' } },
        { '@type': 'Question', name: 'Do fractional CFOs work remotely?', acceptedAnswer: { '@type': 'Answer', text: "Yes — it's now the standard model. Modeling, forecasting, close review, and board reporting all run on cloud accounting and shared dashboards. Donkey Ideas works fully remotely with companies across the US from a New York base." } },
        { '@type': 'Question', name: 'When should a startup hire a fractional CFO?', acceptedAnswer: { '@type': 'Answer', text: "Common triggers: preparing to raise, revenue passing roughly $500K to $1M, cash decisions getting consequential, investors asking for reporting you can't produce, or a bookkeeper handling transactions while nobody owns the forward-looking numbers." } },
        { '@type': 'Question', name: "What's the difference between a fractional CFO, a controller, and a bookkeeper?", acceptedAnswer: { '@type': 'Answer', text: 'A bookkeeper records transactions; a controller makes sure the books close accurately; a CFO looks forward — scenarios, runway, budgets, and fundraises. Donkey Ideas covers all three, with 20 years of experience across them.' } },
        { '@type': 'Question', name: 'How much does a fractional CFO cost?', acceptedAnswer: { '@type': 'Answer', text: "A monthly retainer scoped to fixed deliverables and cadence — a small fraction of a full-time CFO's salary and equity. The first diagnostic call is free." } },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.donkeyideas.com/' },
        { '@type': 'ListItem', position: 2, name: 'Fractional CFO Services', item: 'https://www.donkeyideas.com/fractional-cfo' },
      ],
    },
  ],
};

export default function FractionalCfoPage() {
  return (
    <div className={`dk-cfo ${gabarito.className}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CfoMotion />
      <StickyCta href="https://calendar.app.google/bTGoJDjxDWSHijKZ7" label="Book a free call" />

      <header>
        <div className="nav">
          <Link className="logo" href="/">
            Donkey Ideas<span className="dumb">yes, it means what you think</span>
          </Link>
          <nav aria-label="Main">
            <Link href="/#services">What we do</Link>
            <Link href="/#ledger">Portfolio</Link>
            <a href="#services">CFO services</a>
            <a href="#faq">FAQ</a>
            <Link href="/blog">Blog</Link>
          </nav>
          <a className="btn" href="https://calendar.app.google/bTGoJDjxDWSHijKZ7" target="_blank" rel="noopener noreferrer">Book a free call</a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap">
            <div className="crumb"><Link href="/">Donkey Ideas</Link> / Fractional CFO</div>
            <h1>Fractional CFO services, <span className="hl">fully remote.</span></h1>
            <p className="hero-sub"><b>Senior finance leadership without the full-time salary.</b> Twenty years as a controller and CFO across SaaS, financial services, and public companies — now available to your startup or small business, part-time, from anywhere in the US.</p>
            <div className="hero-cta">
              <a className="btn big" href="https://calendar.app.google/bTGoJDjxDWSHijKZ7" target="_blank" rel="noopener noreferrer">Book a free CFO call</a>
              <a className="btn big ghost" href="#services">See what's included</a>
            </div>
            <div className="stamp" aria-hidden="true">Works Remote<small>numbers travel fine</small></div>
          </div>
        </section>

        <div className="trustline">
          <div className="trust-grid">
            <div className="trust"><b>20 years</b><span>Controller and CFO experience — startup to public company</span></div>
            <div className="trust"><b>11+ ventures</b><span>Built and operated with the same financial discipline</span></div>
            <div className="trust"><b>NYC-based</b><span>Working remotely with companies across the US</span></div>
          </div>
        </div>

        <div className="wrap">
          <div className="tldr">
            <span className="k">In short</span>
            <p><b>Donkey Ideas provides remote fractional CFO services</b> for US startups and small businesses — financial modeling and forecasting, cash-flow and runway management, fundraising preparation, investor reporting, and monthly close oversight — led by a controller and CFO with 20 years of experience, at a fraction of the cost of a full-time hire. <b>Best fit:</b> companies doing roughly $500K–$10M in revenue with no senior finance hire. <b>To start:</b> book a free 30-minute diagnostic call.</p>
          </div>
        </div>

        <section id="services">
          <div className="wrap">
            <h2>What a fractional CFO does for you<span style={{ color: 'var(--red)' }}>.</span></h2>
            <p className="lede">A bookkeeper records the past. A controller closes it accurately. A CFO owns the future — the models, the runway, the raise. This engagement covers that forward-looking layer, and because I spent years as a controller too, the foundation underneath gets checked while we're at it.</p>
            <div className="svc-grid">
              <div className="svc"><h3>Financial modeling and forecasting</h3><p>Unit economics, three-statement models, and scenario planning you can defend in a board meeting — built, maintained, and explained in plain English.</p></div>
              <div className="svc"><h3>Budgeting, cash flow, and runway</h3><p>Know exactly how much cash you have, how fast it moves, and the date decisions come due. No more discovering problems in the bank balance.</p></div>
              <div className="svc"><h3>Fundraising preparation</h3><p>Investor-ready projections, data room assembly, and pitch financials that survive diligence. I sit on your side of the table for the hard questions.</p></div>
              <div className="svc"><h3>Investor reporting and board support</h3><p>The monthly update investors actually read: metrics that matter, honest commentary, and no surprises in the board deck.</p></div>
              <div className="svc"><h3>Monthly close oversight and KPIs</h3><p>Your bookkeeper keeps the books; I make sure the close is right and turn it into a scoreboard — so you run the business on numbers instead of vibes.</p></div>
              <div className="svc"><h3>Systems and process</h3><p>Accounting stack setup, dashboards, and financial hygiene that scales — built by someone who has run finance at every size from startup to public company.</p></div>
            </div>
          </div>
        </section>

        <section className="who">
          <div className="wrap">
            <h2>Who this is for<span style={{ color: 'var(--yellow)' }}>.</span></h2>
            <p className="lede">Fractional works when you need CFO-level judgment, but not forty hours of it a week.</p>
            <div className="who-grid">
              <div className="who-col">
                <h3 className="yes">A good fit if you're...</h3>
                <ul>
                  <li>A startup preparing to raise — or cleaning up after a raise</li>
                  <li>Doing roughly $500K–$10M in revenue with no senior finance hire</li>
                  <li>A founder making cash decisions on gut feel and a bank balance</li>
                  <li>Getting investor questions your bookkeeper can't answer</li>
                  <li>A small business that wants real forecasting, not just clean books</li>
                </ul>
              </div>
              <div className="who-col">
                <h3 className="no">Not the right fit if you're...</h3>
                <ul>
                  <li>Looking for bookkeeping or tax prep alone — I'll refer you out</li>
                  <li>Big enough to need a full-time CFO in the building daily</li>
                  <li>Wanting numbers that say what you wish were true</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="how">
          <div className="wrap">
            <h2>How an engagement works<span style={{ color: 'var(--red)' }}>.</span></h2>
            <div className="step"><span className="n">1</span><div><h3>Free diagnostic call</h3><p>Thirty minutes on where your finances stand and what you actually need. If you don't need a CFO yet, I'll tell you that — it's cheaper for both of us.</p></div></div>
            <div className="step"><span className="n">2</span><div><h3>Scoped monthly engagement</h3><p>A fixed retainer tied to concrete deliverables and a meeting cadence — typically a few days a month, scaled to your stage. No hourly meters running.</p></div></div>
            <div className="step"><span className="n">3</span><div><h3>First 30 days: the foundation</h3><p>Model built or rebuilt, cash-flow visibility established, close process reviewed, and a KPI dashboard you'll actually look at.</p></div></div>
            <div className="step"><span className="n">4</span><div><h3>Ongoing: the forward look</h3><p>Monthly close review, updated forecasts, board and investor materials, and a standing call where we make the numbers argue with your plans.</p></div></div>
          </div>
        </section>

        <section className="remote">
          <div className="wrap">
            <h2>Remote by design<span style={{ color: 'var(--ink)' }}>.</span></h2>
            <p><b>Finance is the most remote-friendly seat in your company.</b> Your books live in the cloud, your model lives in a shared file, and your board meets on video. I work with companies across the US from New York — same-day responsiveness, no travel line item, and every deliverable in tools you keep if we ever part ways.</p>
            <p>Based in <b>New York City</b>, which means market hours, US GAAP fluency, and the occasional in-person session if you're in the city and want one.</p>
          </div>
        </section>

        <section className="proof">
          <div className="wrap">
            <h2>The track record behind your numbers<span style={{ color: 'var(--red)' }}>.</span></h2>
            <p className="lede">Not a junior analyst with a template — two decades of senior finance leadership, now focused on your business.</p>
            <div className="proof-grid">
              <div className="pstat"><b>20 yrs</b><span>As a controller &amp; CFO across SaaS, financial services, and public companies</span></div>
              <div className="pstat"><b>$1B+</b><span>In daily liquidity managed at an asset-management firm</span></div>
              <div className="pstat"><b>9 countries</b><span>Multi-entity M&amp;A consolidation led at a high-growth SaaS company</span></div>
              <div className="pstat"><b>11+</b><span>Ventures built and operated with the same financial discipline</span></div>
            </div>
            <div className="pricing">
              <p><b>Simple, fixed pricing.</b> Monthly retainers scoped to your stage — a fraction of a full-time CFO&apos;s salary and equity. No hourly meters, no surprises. The first diagnostic call is free.</p>
              <a className="btn big" href="https://calendar.app.google/bTGoJDjxDWSHijKZ7" target="_blank" rel="noopener noreferrer">Book a free call</a>
            </div>
          </div>
        </section>

        <section id="faq">
          <div className="wrap">
            <h2>Fractional CFO questions, answered<span style={{ color: 'var(--red)' }}>.</span></h2>
            <div className="faq-item"><h3>What is a fractional CFO?</h3><p>A senior finance executive who works with your company part-time — typically a set number of days per month — providing CFO-level leadership: financial modeling, forecasting, cash-flow management, and fundraising support, at a fraction of the cost of a full-time hire.</p></div>
            <div className="faq-item"><h3>Do fractional CFOs work remotely?</h3><p>Yes — it's now the standard model. Modeling, forecasting, close review, and board reporting all run on cloud accounting and shared dashboards. Donkey Ideas works fully remotely with companies across the US from a New York base.</p></div>
            <div className="faq-item"><h3>When should a startup hire a fractional CFO?</h3><p>Common triggers: preparing to raise, revenue passing roughly $500K to $1M, cash decisions getting consequential, investors asking for reporting you can't produce, or a bookkeeper handling transactions while nobody owns the forward-looking numbers.</p></div>
            <div className="faq-item"><h3>What's the difference between a fractional CFO and a bookkeeper or controller?</h3><p>A bookkeeper records transactions. A controller makes sure the books close accurately. A CFO looks forward — scenarios, runway, budgets, fundraises. Having spent 20 years as both a controller and a CFO, I cover the full stack and can tell you which layer your problem actually lives in.</p></div>
            <div className="faq-item"><h3>How much does it cost?</h3><p>A monthly retainer scoped to fixed deliverables and cadence — a small fraction of a full-time CFO's salary and equity. The first call is free and includes an honest read on whether you need a CFO at all yet.</p></div>
          </div>
        </section>

        <section className="final" id="contact">
          <div className="wrap">
            <h2>Stop running the business on <span className="hl">vibes.</span></h2>
            <p>One free call. An honest read on your numbers. Zero pressure — the donkey carries the load either way.</p>
            <CfoLeadForm />
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot">
          <span style={{ fontWeight: 800 }}>Donkey Ideas</span>
          <a href="mailto:info@donkeyideas.com">info@donkeyideas.com</a>
          <span className="copy">© {new Date().getFullYear()} Donkey Ideas · Venture Studio &amp; Fractional CFO · New York, NY</span>
        </div>
      </footer>
    </div>
  );
}
