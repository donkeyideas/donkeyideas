import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.donkeyideas.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/ventures',
          '/services',
          '/process',
          '/about',
          '/contact',
          '/privacy',
        ],
        disallow: [
          '/app/*',      // Block authenticated dashboard
          '/api/*',      // Block API routes
          '/login',      // Block login page
          '/register',   // Block registration page
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/ventures',
          '/services',
          '/process',
          '/about',
          '/contact',
          '/privacy',
        ],
        disallow: [
          '/app/*',
          '/api/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
