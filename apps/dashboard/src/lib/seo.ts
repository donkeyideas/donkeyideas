import { prisma } from '@donkey-ideas/database';
import { Metadata } from 'next';

interface SEOSettings {
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
  domain: {
    customDomain: string;
    sslEnabled: boolean;
  };
  analytics: {
    googleAnalyticsId: string;
    googleTagManagerId: string;
  };
}

const defaultSEOSettings: SEOSettings = {
  seo: {
    title: 'Donkey Ideas — New York Venture Studio & Fractional CFO',
    description: 'A New York venture studio that validates, builds, and launches real digital businesses, plus fractional CFO services for startups and small businesses.',
    keywords: '',
    ogImage: '/og-home.png',
  },
  domain: {
    customDomain: '',
    sslEnabled: true,
  },
  analytics: {
    googleAnalyticsId: '',
    googleTagManagerId: '',
  },
};

export async function getSEOSettings(): Promise<SEOSettings> {
  try {
    const seoSettings = await prisma.websiteContent.findFirst({
      where: { section: 'seo-settings' },
    });

    if (!seoSettings?.content) {
      return defaultSEOSettings;
    }

    // Handle both JSON string and object
    if (typeof seoSettings.content === 'string') {
      try {
        return JSON.parse(seoSettings.content);
      } catch {
        return defaultSEOSettings;
      }
    }

    return seoSettings.content as unknown as SEOSettings;
  } catch (error) {
    console.error('Failed to fetch SEO settings:', error);
    return defaultSEOSettings;
  }
}

export async function generatePageMetadata(
  pageTitle: string,
  pageDescription: string,
  pageUrl: string,
  additionalKeywords: string[] = []
): Promise<Metadata> {
  const settings = await getSEOSettings();
  const baseUrl = 'https://www.donkeyideas.com';

  const keywords = settings.seo.keywords
    ? [...settings.seo.keywords.split(',').map(k => k.trim()), ...additionalKeywords]
    : additionalKeywords;

  return {
    title: pageTitle,
    description: pageDescription,
    keywords,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${baseUrl}${pageUrl}`,
      images: [
        {
          url: settings.seo.ogImage || '/og-home.png',
          width: 1200,
          height: 630,
          alt: pageTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: [settings.seo.ogImage || '/og-home.png'],
    },
  };
}
