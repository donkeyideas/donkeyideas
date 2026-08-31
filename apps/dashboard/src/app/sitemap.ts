import { MetadataRoute } from 'next';
import { prisma } from '@donkey-ideas/database';

const baseUrl = 'https://www.donkeyideas.com';

function slugify(title: string): string {
  return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static public pages (login/register intentionally excluded — they're
  // disallowed in robots.ts, so listing them here would send mixed signals).
  // NOTE: /services, /process, /contact, /ventures now 301-redirect to homepage
  // sections or /fractional-cfo, so they are intentionally excluded here.
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/fractional-cfo`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Venture detail pages — derived from the SAME source the pages render from
  // (websiteContent['ventures-page'] → slugified title), not the Page table.
  let venturePages: MetadataRoute.Sitemap = [];
  try {
    const row = await prisma.websiteContent.findFirst({ where: { section: 'ventures-page', published: true } });
    let content: any = row?.content;
    if (typeof content === 'string') content = JSON.parse(content);
    const ventures: any[] = content?.ventures || content?.sections || [];
    venturePages = ventures
      .filter((v) => v?.title)
      .map((v) => ({
        url: `${baseUrl}/ventures/${slugify(v.title)}`,
        lastModified: row?.updatedAt || now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch {
    // ventures-page not populated yet
  }

  // Blog posts
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    blogPages = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch {
    // BlogPost table might not have data yet
  }

  return [...staticPages, ...venturePages, ...blogPages];
}
