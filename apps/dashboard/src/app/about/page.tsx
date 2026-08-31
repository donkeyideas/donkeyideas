/* eslint-disable react/no-unescaped-entities */
// About — rebuilt in the venture-studio voice (retires the old "creative
// consulting studio / 15+ team / 92% retention" page). Reuses the homepage
// studio CSS by wrapping everything under .dk-home.
import Link from 'next/link';
import { Metadata } from 'next';
import { Gabarito } from 'next/font/google';
import '../home-studio.css';

const gabarito = Gabarito({ subsets: ['latin'], weight: ['400', '500', '600', '800', '900'], display: 'swap' });

export const metadata: Metadata = {
  title: 'About — A One-Person Venture Studio in New York',
  description:
    'Donkey Ideas is a one-person venture studio in New York, run by Alain Beltran — a controller and CFO with 20 years of experience. It validates, builds, and launches real digital businesses, and offers fractional CFO services to startups and small businesses.',
  alternates: { canonical: 'https://www.donkeyideas.com/about' },
  openGraph: {
    type: 'profile',
    title: 'About Donkey Ideas — A One-Person Venture Studio',
    description:
      'A venture studio run by a 20-year controller and CFO. Ideas validated with a real financial model, then built and launched with an AI-native process.',
    url: 'https://www.donkeyideas.com/about',
    images: [{ url: '/og-home.png', width: 1200, height: 630, alt: 'Donkey Ideas — Dumb ideas, taken seriously.' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-home.png'] },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'AboutPage',
      '@id': 'https://www.donkeyideas.com/about#aboutpage',
      url: 'https://www.donkeyideas.com/about',
      name: 'About Donkey Ideas',
      description:
        'Donkey Ideas is a one-person venture studio in New York that validates, builds, and launches real digital businesses, plus fractional CFO services for startups and small businesses.',
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.donkeyideas.com/#organization',
      name: 'Donkey Ideas',
      url: 'https://www.donkeyideas.com',
      logo: 'https://www.donkeyideas.com/logo.png',
      email: 'info@donkeyideas.com',
      description:
        'New York venture studio that validates, builds, and launches real digital businesses, plus fractional CFO services for startups and small businesses.',
      address: { '@type': 'PostalAddress', addressLocality: 'New York', addressRegion: 'NY', addressCountry: 'US' },
      founder: { '@type': 'Person', name: 'Alain Beltran' },
      sameAs: ['https://www.linkedin.com/company/donkey-ideas/', 'https://github.com/donkeyideas'],
    },
    {
      '@type': 'Person',
      '@id': 'https://www.donkeyideas.com/#founder',
      name: 'Alain Beltran',
      jobTitle: 'Founder & Fractional CFO',
      worksFor: { '@id': 'https://www.donkeyideas.com/#organization' },
      description:
        'Controller and CFO with 20 years of experience across SaaS, financial services, and public companies. Founder of Donkey Ideas.',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.donkeyideas.com/' },
        { '@type': 'ListItem', position: 2, name: 'About', item: 'https://www.donkeyideas.com/about' },
      ],
    },
  ],
};

export default function AboutPage() {
  return (
    <div className={`dk-home ${gabarito.className}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header>
        <div className="nav">
          <Link className="logo" href="/">
            Donkey Ideas<span className="dumb">yes, it means what you think</span>
          </Link>
          <nav aria-label="Main">
            <Link href="/#services">What we do</Link>
            <Link href="/#ledger">Portfolio</Link>
            <Link href="/fractional-cfo">CFO services</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/blog">Blog</Link>
          </nav>
          <Link className="btn" href="/#contact">Pitch your idea</Link>
        </div>
      </header>

      <main>
        <section className="hero" style={{ paddingBottom: 40 }}>
          <div className="wrap">
            <div className="kicker">About Donkey Ideas</div>
            <h1>One person. A <span className="hl">dumb</span> name. A real portfolio.</h1>
            <p className="hero-sub">
              <b>Donkey Ideas is a one-person venture studio in New York.</b> It's run by Alain Beltran — a controller
              and CFO with twenty years behind the numbers — and it exists to take the ideas everyone else calls dumb,
              put them through a real financial model, and build the ones that survive.
            </p>
            <div className="definition">
              <span className="term">don·key i·de·as</span>
              <span className="pos">noun, plural</span>
              <p>
                Polite corporate English for <b>dumb ideas</b> — the early-stage, easy-to-dismiss concepts a venture
                studio exists to validate, build, and launch. See also: every venture in the portfolio.
              </p>
            </div>
          </div>
        </section>

        <section className="services" id="story">
          <div className="wrap">
            <div className="sec-head">
              <h2>Not a consultancy. A builder<span style={{ color: 'var(--red)' }}>.</span></h2>
              <span className="sec-note">We ship our own product.</span>
            </div>
            <div className="svc-grid">
              <div className="svc-card">
                <h3>What it actually is</h3>
                <p>
                  A venture studio — not an agency and not a fund. Donkey Ideas builds and operates its own portfolio of
                  digital products, from consumer apps to SaaS to fintech. When it works with outside founders, it's as a
                  builder and a fractional CFO, never as a check-writer.
                </p>
              </div>
              <div className="svc-card">
                <h3>Who's behind it</h3>
                <p>
                  Alain Beltran — twenty years as a controller and CFO across SaaS, financial services, and public
                  companies. Over $1B in daily liquidity managed, multi-entity M&amp;A consolidation across nine
                  countries, and now a dozen ventures built with that same discipline underneath.
                </p>
              </div>
              <div className="svc-card">
                <h3>Why the dumb name</h3>
                <p>
                  Because every crowded market started as somebody's dumb idea. "Sounds dumb" usually means nobody serious
                  is looking — which is exactly the opening. The name keeps the ego out and the curiosity in.
                </p>
              </div>
              <div className="svc-card">
                <h3>How the work gets done</h3>
                <p>
                  One person with an AI-native toolchain builds what used to take a team. Validate with real market
                  research, model it like a CFO, ship something small and fast, then spend real money only on what earns
                  it. Playful going in, serious coming out.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="manual">
          <div className="wrap">
            <div className="sec-head">
              <h2>The two jobs<span style={{ color: 'var(--yellow)' }}>.</span></h2>
              <span className="sec-note">Same discipline, two doors.</span>
            </div>
            <div className="manual-grid">
              <div className="m-item">
                <span className="rule-no">01</span>
                <h3>Build the portfolio.</h3>
                <p>
                  Take dumb-sounding ideas, validate them, and launch the ones that hold up — a growing portfolio of real,
                  shipping products. See them all on the{' '}
                  <Link href="/#ledger" style={{ borderBottom: '2px solid var(--yellow)' }}>portfolio ledger</Link>.
                </p>
              </div>
              <div className="m-item">
                <span className="rule-no">02</span>
                <h3>Be your CFO, part-time.</h3>
                <p>
                  The same twenty years of finance leadership, available to your startup or small business —
                  modeling, forecasting, runway, and fundraising prep. That's{' '}
                  <Link href="/fractional-cfo" style={{ borderBottom: '2px solid var(--yellow)' }}>fractional CFO services</Link>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="name-sec" id="about-cta">
          <div className="wrap">
            <span className="name-tag">Got a dumb idea?</span>
            <h2>Then you already know where this goes.</h2>
            <p>
              Pitch it and you get a builder and a CFO in your corner — not a term sheet. Or if it's your numbers that
              need the help, book a free CFO call.
            </p>
            <div className="hero-cta" style={{ justifyContent: 'center' }}>
              <Link className="btn big" href="/#contact">Pitch your idea</Link>
              <Link className="btn big ghost" href="/fractional-cfo">CFO services</Link>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot">
            <h2>Say hello. <span className="hl">We read every one.</span></h2>
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
