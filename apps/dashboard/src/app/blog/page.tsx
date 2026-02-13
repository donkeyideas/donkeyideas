import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { prisma } from '@donkey-ideas/database';
import ScrollHeader from '@/components/scroll-header';

export const dynamic = 'force-dynamic';

const POSTS_PER_PAGE = 9;

export const metadata: Metadata = {
  title: 'Blog | Donkey Ideas',
  description: 'Insights on creative consulting, business strategy, and turning bold ideas into real businesses from Donkey Ideas.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/blog',
  },
};

async function getPaginatedPosts(page: number) {
  try {
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where: { published: true },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * POSTS_PER_PAGE,
        take: POSTS_PER_PAGE,
        include: { author: { select: { name: true } } },
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
  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <ScrollHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-light leading-tight mb-6">
            Blog
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Insights on creative consulting, business strategy, and turning bold ideas into real businesses.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="pb-16 px-8">
        <div className="max-w-[1200px] mx-auto">
          {posts.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-slate-400 text-lg">No posts published yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group block bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-all hover:translate-y-[-2px]"
                >
                  <div className="aspect-video overflow-hidden relative">
                    {post.featuredImage ? (
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                        <span className="text-4xl font-light text-slate-500">{post.title.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    {post.category && (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 mb-3">
                        {post.category}
                      </span>
                    )}
                    <h2 className="text-xl font-medium text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>Donkey Ideas</span>
                      <span>&bull;</span>
                      <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                      <span>&bull;</span>
                      <span>{post.readTime} min read</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <section className="pb-32 px-8">
          <div className="max-w-[1200px] mx-auto">
            <nav aria-label="Blog pagination" className="flex items-center justify-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={currentPage === 2 ? '/blog' : `/blog?page=${currentPage - 1}`}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 hover:text-white transition-all"
                >
                  Previous
                </Link>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Link
                  key={page}
                  href={page === 1 ? '/blog' : `/blog?page=${page}`}
                  className={`w-10 h-10 rounded-lg text-sm font-medium flex items-center justify-center transition-all ${
                    page === currentPage
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'text-slate-400 bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {page}
                </Link>
              ))}

              {currentPage < totalPages && (
                <Link
                  href={`/blog?page=${currentPage + 1}`}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 hover:text-white transition-all"
                >
                  Next
                </Link>
              )}
            </nav>
            <p className="text-center text-xs text-slate-500 mt-4">
              Showing {(currentPage - 1) * POSTS_PER_PAGE + 1}–{Math.min(currentPage * POSTS_PER_PAGE, total)} of {total} posts
            </p>
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
