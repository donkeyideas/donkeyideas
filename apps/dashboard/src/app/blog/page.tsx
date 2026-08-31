/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
// Blog index — new studio UI (matches donkeyideas-blog mock). Data + pagination
// unchanged (published BlogPosts, newest first). Category filter is client-side
// over the visible page (BlogListMotion).
import Link from 'next/link';
import { Metadata } from 'next';
import { prisma } from '@donkey-ideas/database';
import { Gabarito } from 'next/font/google';
import BlogListMotion from '@/components/home/BlogListMotion';
import { stripMarks } from '@/lib/blog-content';
import './blog.css';

const gabarito = Gabarito({ subsets: ['latin'], weight: ['400', '500', '600', '800', '900'], display: 'swap' });

export const dynamic = 'force-dynamic';
const POSTS_PER_PAGE = 9;

export const metadata: Metadata = {
  title: 'Blog — Venture Building & Startup Finance Notes',
  description: 'Field notes from a venture studio building a dozen products — venture building, product strategy, startup finance, and the occasional dumb idea that turned out right.',
  alternates: { canonical: 'https://www.donkeyideas.com/blog' },
};

function fmtDate(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
function catSlug(c?: string | null): string {
  return (c || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Collapse the free-form DB category strings (which have drifted into variants
// like "Finance" vs "Finance & Strategy") into a small, canonical set so the
// filter bar stays at four buckets instead of seven.
const CANON_ORDER = ['Finance', 'Building', 'Growth', 'Strategy'];
function canonicalCategory(raw?: string | null): string {
  const c = (raw || '').toLowerCase();
  if (/financ|cfo|account|fundrais|capital|cash|runway|budget|revenue|invest|valuation|profit|econ|\btax\b/.test(c)) return 'Finance';
  if (/build|develop|engineer|\btech|\bai\b|\bml\b|product|launch|ship|design|\bcode|stack|infra|data/.test(c)) return 'Building';
  if (/market|growth|brand|\bseo\b|acqui|sales|audience|content|social|\buser|traffic/.test(c)) return 'Growth';
  return 'Strategy';
}

async function getPaginatedPosts(page: number) {
  try {
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where: { published: true },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * POSTS_PER_PAGE,
        take: POSTS_PER_PAGE,
      }),
      prisma.blogPost.count({ where: { published: true } }),
    ]);
    return { posts, total };
  } catch (error) {
    console.error('Failed to load blog posts:', error);
    return { posts: [], total: 0 };
  }
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const { posts, total } = await getPaginatedPosts(currentPage);
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));

  // On page 1, the newest post is the featured card; the rest are rows.
  const featured = currentPage === 1 ? posts[0] : undefined;
  const rows = featured ? posts.slice(1) : posts;

  // Canonical categories present on this page, in a fixed display order.
  const present = new Set(posts.map((p) => canonicalCategory(p.category)));
  const categories = CANON_ORDER.filter((c) => present.has(c));
  const startN = (currentPage - 1) * POSTS_PER_PAGE + 1;
  const endN = Math.min(currentPage * POSTS_PER_PAGE, total);

  return (
    <div className={`dk-blog ${gabarito.className}`}>
      <BlogListMotion />

      <header>
        <div className="nav">
          <Link className="logo" href="/">Donkey Ideas<span className="dumb">yes, it means what you think</span></Link>
          <nav aria-label="Main">
            <Link href="/#services">What we do</Link>
            <Link href="/#ledger">Portfolio</Link>
            <Link href="/fractional-cfo">CFO services</Link>
            <Link className="active" href="/blog">Blog</Link>
          </nav>
          <Link className="btn" href="/#contact">Pitch your idea</Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap">
            <h1>Field notes from the <span className="hl">workshop.</span></h1>
            <p className="hero-sub">What we learn building <b>a dozen ventures</b>, written down — venture building, product strategy, startup finance, and the occasional dumb idea that turned out to be right.</p>
            {categories.length > 0 && (
              <div className="filters" role="group" aria-label="Filter posts by category">
                <button className="filter on" data-cat="all">All posts</button>
                {categories.map((c) => (
                  <button className="filter" data-cat={catSlug(c)} key={c}>{c}</button>
                ))}
                {/* data-cat on rows below uses the same canonical slugs */}
              </div>
            )}
          </div>
        </section>

        {posts.length === 0 ? (
          <div className="wrap" style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--mid)' }}>
            No posts published yet. Check back soon.
          </div>
        ) : (
          <>
            {featured && (
              <div className="wrap">
                <Link className="featured" href={`/blog/${featured.slug}`}>
                  <div className="feat-visual">
                    {featured.featuredImage
                      ? <img src={featured.featuredImage} alt={featured.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span>{canonicalCategory(featured.category)}</span>}
                  </div>
                  <div className="feat-body">
                    <div className="meta">
                      <span className="cat">{canonicalCategory(featured.category)}</span>
                      <span>{fmtDate(featured.publishedAt)}</span>
                      <span>{featured.readTime} min read</span>
                    </div>
                    <h2>{stripMarks(featured.title)}</h2>
                    {featured.excerpt && <p>{featured.excerpt}</p>}
                    <span className="read">Read the post</span>
                  </div>
                </Link>
              </div>
            )}

            <section className="posts">
              <div className="wrap">
                {rows.map((post) => (
                  <div className="row" data-cat={catSlug(canonicalCategory(post.category))} key={post.id}>
                    <span className="date">{fmtDate(post.publishedAt)}</span>
                    <Link href={`/blog/${post.slug}`}>
                      <span className="cat">{canonicalCategory(post.category)}</span>
                      <h3>{stripMarks(post.title)}</h3>
                      {post.excerpt && <p>{post.excerpt}</p>}
                    </Link>
                    <span className="mins">{post.readTime} min</span>
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="pager" aria-label="Pagination">
                    {currentPage > 1 && (
                      <Link href={currentPage === 2 ? '/blog' : `/blog?page=${currentPage - 1}`}>Prev</Link>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Link className={p === currentPage ? 'on' : ''} href={p === 1 ? '/blog' : `/blog?page=${p}`} key={p}>{p}</Link>
                    ))}
                    {currentPage < totalPages && (
                      <Link href={`/blog?page=${currentPage + 1}`}>Next</Link>
                    )}
                    <span className="count">Showing {startN}–{endN} of {total} posts</span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <section className="cta">
          <div className="wrap cta-grid">
            <div>
              <h2>Reading about it is the easy part.</h2>
              <p>See the ventures these lessons came from — or pitch us the dumb idea you've been sitting on.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link className="btn" style={{ fontSize: '15px', padding: '14px 26px', borderRadius: '8px' }} href="/#ledger">See the portfolio</Link>
              <Link className="btn" style={{ fontSize: '15px', padding: '14px 26px', borderRadius: '8px', background: 'transparent', color: 'var(--ink)' }} href="/#contact">Pitch your idea</Link>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot">
          <span style={{ fontWeight: 800 }}>Donkey Ideas</span>
          <a href="mailto:info@donkeyideas.com">info@donkeyideas.com</a>
          <span className="copy">© {new Date().getFullYear()} Donkey Ideas · Venture Studio · New York, NY</span>
        </div>
      </footer>
    </div>
  );
}
