/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
// Venture detail page — studio mock UI (matches the ArguFight design). Driven by
// the same websiteContent['ventures-page'] admin data: stats → stat line,
// techStack → "How it's built". Bespoke sections in the mock that have no data
// field (origin quote, feature grid, per-venture FAQ) are omitted gracefully.
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { Gabarito } from 'next/font/google';
import { prisma } from '@donkey-ideas/database';
import DetailMotion from '@/components/home/DetailMotion';
import './detail.css';

const gabarito = Gabarito({ subsets: ['latin'], weight: ['400', '500', '600', '800', '900'], display: 'swap' });

type Venture = {
  status?: string;
  category?: string;
  title: string;
  description?: string;
  tags?: string[];
  imageUrl?: string;
  websiteUrl?: string;
  stats?: { value: string; label: string }[];
  techStack?: { frontend?: string[]; backend?: string[]; aiml?: string[] };
};

function slugify(title: string): string {
  return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
}

// Extracted logos in /public/ventures — matched to a venture by token.
const LOGO_KEYS = ['argufight', 'basketball', 'govirall', 'jetdale', 'kamioi', 'julyu', 'buildwrk', 'opticrank', 'marble', 'cfbsocial'];
function findLogo(v: Venture): string | undefined {
  const hay = `${v.title ?? ''} ${v.websiteUrl ?? ''}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = LOGO_KEYS.find((k) => hay.includes(k));
  return key ? `/ventures/${key}.png` : undefined;
}

// Short display name for CTAs (strip the " - subtitle" tail).
function shortName(title: string): string {
  const head = title.split(/\s[–—-]\s/)[0].trim();
  return head.length > 0 && head.length <= 20 ? head : 'site';
}

// Admin status → chip label + class (consistent with the homepage ledger).
function statusChip(status?: string): { label: string; cls: string } {
  const s = (status || '').toUpperCase();
  if (s === 'PRODUCTION') return { label: 'Live', cls: 'live' };
  if (s === 'BETA') return { label: 'Beta', cls: '' };
  if (s === 'ALPHA') return { label: 'Alpha', cls: '' };
  if (s === 'DEVELOPMENT') return { label: 'In build', cls: '' };
  if (s === 'IDEA') return { label: 'Concept', cls: 'cat' };
  return { label: status || 'Live', cls: '' };
}

async function getVentureBySlug(slug: string): Promise<Venture | null> {
  try {
    const row = await prisma.websiteContent.findFirst({ where: { section: 'ventures-page', published: true } });
    let content: any = row?.content;
    if (typeof content === 'string') content = JSON.parse(content);
    const ventures: Venture[] = content?.ventures || content?.sections || [];
    return ventures.find((v) => v?.title && slugify(v.title) === slug) || null;
  } catch (err) {
    console.error('Failed to load venture:', err instanceof Error ? err.message : 'Unknown error');
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const venture = await getVentureBySlug(params.slug);
  if (!venture) return { title: 'Venture — Donkey Ideas' };
  return {
    title: `${venture.title} | Donkey Ideas`,
    description: venture.description?.slice(0, 160),
    alternates: { canonical: `https://www.donkeyideas.com/ventures/${params.slug}` },
  };
}

export default async function VenturePage({ params }: { params: { slug: string } }) {
  const venture = await getVentureBySlug(params.slug);
  if (!venture) notFound();

  const tags = Array.isArray(venture.tags) ? venture.tags : [];
  const stats = Array.isArray(venture.stats) ? venture.stats.slice(0, 4) : [];
  const ts = venture.techStack;
  const hasStack = !!(ts && (ts.frontend?.length || ts.backend?.length || ts.aiml?.length));
  const logo = findLogo(venture);
  const name = shortName(venture.title);
  const chip = statusChip(venture.status);
  const site = venture.websiteUrl?.trim();

  return (
    <div className={`dk-detail ${gabarito.className}`}>
      <DetailMotion />

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
          {site ? (
            <a className="btn" href={site} target="_blank" rel="noopener noreferrer">Visit {name}</a>
          ) : (
            <Link className="btn" href="/#contact">Pitch your idea</Link>
          )}
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="wrap">
            <div className="crumb">
              <Link href="/">Donkey Ideas</Link> / <Link href="/#ledger">Ventures</Link> / {name}
            </div>
            <div className="hero-grid" style={logo ? undefined : { gridTemplateColumns: '1fr' }}>
              {logo && (
                <div className="v-logo">
                  <img src={logo} alt={`${name} logo`} />
                </div>
              )}
              <div>
                <div className="chips">
                  {venture.status && <span className={`chip ${chip.cls}`}>{chip.label}</span>}
                  {venture.category && <span className="chip cat">{venture.category}</span>}
                </div>
                <h1>{venture.title}</h1>
                {venture.description && <p className="hero-sub">{venture.description}</p>}
                <div className="hero-cta">
                  {site && (
                    <a className="btn big" href={site} target="_blank" rel="noopener noreferrer">Visit {name}</a>
                  )}
                  {hasStack && <a className="btn big ghost" href="#build">See how it's built</a>}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STAT LINE */}
        {stats.length > 0 && (
          <div className="statline">
            <div className="stat-grid">
              {stats.map((s, i) => (
                <div className="stat" key={i}>
                  <b>{s.value}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HOW IT'S BUILT */}
        {hasStack && (
          <section className="stack" id="build">
            <div className="wrap">
              <h2>How it's built<span style={{ color: 'var(--red)' }}>.</span></h2>
              <p className="lede">
                Production infrastructure, not a demo — <b>built solo with an AI-native process</b> and run like a business from day one.
              </p>
              <div className="col-grid">
                {ts!.frontend && ts!.frontend.length > 0 && (
                  <div className="col">
                    <h3>Frontend</h3>
                    <ul>{ts!.frontend.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  </div>
                )}
                {ts!.backend && ts!.backend.length > 0 && (
                  <div className="col">
                    <h3>Backend</h3>
                    <ul>{ts!.backend.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  </div>
                )}
                {ts!.aiml && ts!.aiml.length > 0 && (
                  <div className="col">
                    <h3>AI / ML</h3>
                    <ul>{ts!.aiml.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TOPICS / TAGS */}
        {tags.length > 0 && (
          <section style={{ paddingTop: 0 }}>
            <div className="wrap">
              <h2>What it's about<span style={{ color: 'var(--yellow)' }}>.</span></h2>
              <div className="chips">
                {tags.map((t, i) => (
                  <span className="chip cat" key={i}>{t}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FINAL CTA */}
        <section className="final">
          <div className="wrap">
            <h2>See it for yourself<span style={{ color: 'var(--red)' }}>.</span></h2>
            <p>It's real, it's shipping, and the numbers are on this page. Go poke at it — then tell us what you'd build.</p>
            {site ? (
              <a className="btn big" href={site} target="_blank" rel="noopener noreferrer">Visit {name}</a>
            ) : (
              <Link className="btn big" href="/#contact">Pitch your idea</Link>
            )}
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot">
          <Link href="/#ledger" style={{ borderColor: 'var(--rule)' }}>← Back to the ledger</Link>
          <a href="mailto:info@donkeyideas.com">info@donkeyideas.com</a>
          <span className="copy">© {new Date().getFullYear()} Donkey Ideas · Venture Studio · New York, NY</span>
        </div>
      </footer>
    </div>
  );
}
