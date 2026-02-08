import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { prisma } from '@donkey-ideas/database';
import ScrollHeader from '@/components/scroll-header';
import { ArticleStructuredData } from '@/components/seo/structured-data';

export const dynamic = 'force-dynamic';

async function getPostBySlug(slug: string) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: { author: { select: { name: true, email: true } } },
    });
    return post;
  } catch {
    return null;
  }
}

async function getRelatedPosts(currentSlug: string, category: string | null) {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        published: true,
        slug: { not: currentSlug },
        ...(category ? { category } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { title: true, slug: true, excerpt: true, category: true, publishedAt: true, readTime: true },
    });
    return posts;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || '';

  return {
    title,
    description,
    keywords: post.seoKeywords.length > 0 ? post.seoKeywords : undefined,
    alternates: {
      canonical: `https://www.donkeyideas.com/blog/${post.slug}`,
    },
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

  if (!post || !post.published) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(slug, post.category);
  const authorName = 'Donkey Ideas';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <ArticleStructuredData
        data={{
          title: post.title,
          description: post.seoDescription || post.excerpt || '',
          url: `https://www.donkeyideas.com/blog/${post.slug}`,
          image: post.featuredImage || 'https://www.donkeyideas.com/og-image.png',
          datePublished: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          authorName: authorName,
        }}
      />

      <ScrollHeader />

      {/* Article */}
      <article className="pt-32 pb-24 px-8">
        <div className="max-w-3xl mx-auto">
          {/* Category & Meta */}
          <div className="flex items-center gap-3 mb-6">
            {post.category && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                {post.category}
              </span>
            )}
            <span className="text-sm text-slate-500">
              {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
            </span>
            <span className="text-sm text-slate-500">&bull; {post.readTime} min read</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-light leading-tight mb-8">
            {post.title}
          </h1>

          {/* Author */}
          <div className="flex items-center gap-4 mb-10 pb-10 border-b border-slate-700/50">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-lg">
              {authorName.charAt(0)}
            </div>
            <div>
              <div className="text-base font-medium text-white">{authorName}</div>
              <div className="text-sm text-slate-400">Venture Builder & AI Strategist at Donkey Ideas</div>
            </div>
          </div>

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="mb-10 rounded-xl overflow-hidden">
              <Image
                src={post.featuredImage}
                alt={post.title}
                width={1200}
                height={630}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-invert prose-lg max-w-none
              prose-headings:font-light prose-headings:text-white
              prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-6
              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-blue-300
              prose-strong:text-white prose-strong:font-medium
              prose-ul:text-slate-300 prose-ol:text-slate-300
              prose-li:mb-2"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-700/50">
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Author Bio */}
          <div className="mt-12 p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-xl flex-shrink-0">
                {authorName.charAt(0)}
              </div>
              <div>
                <div className="text-base font-medium text-white mb-1">
                  Written by {authorName}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Donkey Ideas is a venture builder creating AI-powered companies and sharing insights on startup strategy, technical architecture, and growth. We partner with founders and enterprises to take ideas from concept to production.
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 px-8 border-t border-slate-800">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-2xl font-light mb-8">Related Posts</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map(related => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group block bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all"
                >
                  <h3 className="font-medium text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {related.title}
                  </h3>
                  {related.excerpt && (
                    <p className="text-slate-400 text-sm line-clamp-2 mb-3">{related.excerpt}</p>
                  )}
                  <div className="text-xs text-slate-500">
                    {related.publishedAt ? new Date(related.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} &bull; {related.readTime} min read
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-16 px-8 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-xl font-semibold tracking-tight">
              <span className="font-light">DONKEY</span> IDEAS
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400">
              <Link href="/ventures" className="hover:text-white transition-colors">Ventures</Link>
              <Link href="/services" className="hover:text-white transition-colors">Services</Link>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
            <div className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Donkey Ideas
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
