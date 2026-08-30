/* eslint-disable react/no-unescaped-entities */
// Blog post — new studio UI (matches donkeyideas-blog-post mock). Data loading,
// related posts, and SEO metadata unchanged. Post content is stored HTML and
// rendered into the scoped .dk-post article styles.
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { prisma } from '@donkey-ideas/database';
import { Gabarito } from 'next/font/google';
import { ArticleStructuredData } from '@/components/seo/structured-data';
import PostProgress from '@/components/home/PostProgress';
import { enhancePostHtml, stripMarks, renderTitle } from '@/lib/blog-content';
import './post.css';

const gabarito = Gabarito({ subsets: ['latin'], weight: ['400', '500', '600', '800', '900'], display: 'swap' });

export const dynamic = 'force-dynamic';

function fmtDate(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

async function getPostBySlug(slug: string) {
  try {
    return await prisma.blogPost.findUnique({
      where: { slug },
      include: { author: { select: { name: true, email: true } } },
    });
  } catch {
    return null;
  }
}

async function getRelatedPosts(currentSlug: string, category: string | null) {
  try {
    return await prisma.blogPost.findMany({
      where: { published: true, slug: { not: currentSlug }, ...(category ? { category } : {}) },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { title: true, slug: true, excerpt: true, category: true, publishedAt: true, readTime: true },
    });
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Post Not Found' };
  const title = stripMarks(post.seoTitle || post.title);
  const description = post.seoDescription || post.excerpt || '';
  return {
    title,
    description,
    keywords: post.seoKeywords.length > 0 ? post.seoKeywords : undefined,
    alternates: { canonical: `https://www.donkeyideas.com/blog/${post.slug}` },
    openGraph: {
      title: `${title} | Donkey Ideas`,
      description,
      url: `https://www.donkeyideas.com/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: ['Donkey Ideas'],
      images: post.featuredImage ? [{ url: post.featuredImage, width: 1200, height: 630, alt: post.title }] : [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.featuredImage ? [post.featuredImage] : ['/og-image.png'],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || !post.published) notFound();

  const related = await getRelatedPosts(slug, post.category);

  // Contextual internal link to /fractional-cfo on finance-relevant posts (SEO).
  const financeRe = /\b(cfo|finance|financial|fundrais|funding|runway|cash[\s-]?flow|budget|revenue|unit economics|investor|valuation|burn|forecast|financial model|capital|profit|margin)\b/i;
  const isFinance = financeRe.test(`${post.title} ${post.excerpt || ''} ${post.category || ''} ${post.tags.join(' ')}`);

  return (
    <div className={`dk-post ${gabarito.className}`}>
      <ArticleStructuredData
        data={{
          title: stripMarks(post.title),
          description: post.excerpt || '',
          datePublished: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          authorName: 'Donkey Ideas',
          image: post.featuredImage || 'https://www.donkeyideas.com/og-image.png',
          url: `https://www.donkeyideas.com/blog/${post.slug}`,
        }}
      />
      <div className="progress" aria-hidden="true" />
      <PostProgress />

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
        <div className="post-hero">
          <div className="article-wrap">
            <div className="crumb">
              <Link href="/">Donkey Ideas</Link> / <Link href="/blog">Blog</Link> / {stripMarks(post.title)}
            </div>
            <div className="meta">
              {post.category && <span className="cat">{post.category}</span>}
              <span>{fmtDate(post.publishedAt)}</span>
              <span>{post.readTime} min read</span>
            </div>
            <h1>{renderTitle(post.title)}</h1>
            <div className="byline">
              <div className="avatar">D</div>
              <div>
                <b>Donkey Ideas</b>
                <span>The one-person venture studio behind 11+ products</span>
              </div>
            </div>
          </div>
        </div>

        {post.featuredImage && (
          <div className="post-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.featuredImage} alt={post.title} />
          </div>
        )}

        <article>
          <div className="article-wrap post-body" dangerouslySetInnerHTML={{ __html: enhancePostHtml(post.content) }} />
          <div className="article-wrap">
            {isFinance && (
              <div className="cfo-callout">
                <b>Running the numbers yourself?</b> Donkey Ideas offers <Link href="/fractional-cfo">fractional CFO services</Link> — financial modeling, forecasting, runway, and fundraising support for startups, at a fraction of a full-time hire. <Link href="/fractional-cfo">See how it works →</Link>
              </div>
            )}
            {post.tags.length > 0 && (
              <div className="tags">
                {post.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
              </div>
            )}
            <div className="author-box">
              <div className="avatar">D</div>
              <div>
                <b>Written by Donkey Ideas</b>
                <p>Donkey Ideas is a one-person venture studio in New York that turns dumb-sounding ideas into real digital businesses — 11+ ventures validated, built, and operated with 20 years of CFO discipline underneath.</p>
              </div>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section className="related">
            <div className="article-wrap">
              <h2>Related reading</h2>
              {related.map((r) => (
                <Link className="rel-card" href={`/blog/${r.slug}`} key={r.slug} style={{ marginBottom: '14px' }}>
                  <div className="meta">
                    {r.category && <span className="cat">{r.category}</span>}
                    <span>{fmtDate(r.publishedAt)}</span>
                    <span>{r.readTime} min read</span>
                  </div>
                  <h3>{stripMarks(r.title)}</h3>
                  {r.excerpt && <p>{r.excerpt}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="cta">
          <div className="wrap cta-grid">
            <div>
              <h2>Got a dumb idea of your own<span style={{ color: 'var(--yellow)' }}>?</span></h2>
              <p>We turn dumb-sounding ideas into real businesses — validated, built, and run like one. Pitch us yours.</p>
            </div>
            <Link className="btn" href="/#contact">Pitch your idea</Link>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot">
          <Link href="/blog" style={{ borderColor: 'var(--rule)' }}>← Back to the blog</Link>
          <a href="mailto:info@donkeyideas.com">info@donkeyideas.com</a>
          <span className="copy">© {new Date().getFullYear()} Donkey Ideas · Venture Studio · New York, NY</span>
        </div>
      </footer>
    </div>
  );
}
