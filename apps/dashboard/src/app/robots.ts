import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.donkeyideas.com';

  const publicPages = [
    '/',
    '/fractional-cfo',
    '/ventures',
    '/blog',
    '/services',
    '/process',
    '/about',
    '/contact',
    '/privacy',
  ];

  const blockedPaths = [
    '/app/*',
    '/api/*',
    '/login',
    '/register',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: publicPages,
        disallow: blockedPaths,
      },
      {
        userAgent: 'Googlebot',
        allow: publicPages,
        disallow: ['/app/*', '/api/*'],
      },
      // AI/Generative Engine Crawlers
      {
        userAgent: 'GPTBot',
        allow: publicPages,
        disallow: ['/app/*', '/api/*'],
      },
      {
        userAgent: 'Claude-Web',
        allow: publicPages,
        disallow: ['/app/*', '/api/*'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: publicPages,
        disallow: ['/app/*', '/api/*'],
      },
      {
        userAgent: 'Google-Extended',
        allow: publicPages,
        disallow: ['/app/*', '/api/*'],
      },
      {
        userAgent: 'Applebot-Extended',
        allow: publicPages,
        disallow: ['/app/*', '/api/*'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
