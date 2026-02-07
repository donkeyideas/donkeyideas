import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import { OrganizationStructuredData, WebsiteStructuredData } from '@/components/seo/structured-data';

const GA_MEASUREMENT_ID = 'G-N12TK3KWF4';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.donkeyideas.com'),
  title: {
    default: 'Donkey Ideas — Venture Builder & Operating System',
    template: '%s | Donkey Ideas',
  },
  description: 'Transform your vision into reality with Donkey Ideas, a comprehensive venture builder platform offering financial management, project tracking, and strategic tools for entrepreneurs.',
  keywords: [
    'venture builder',
    'startup platform',
    'financial management',
    'project management',
    'pitch deck builder',
    'business planning',
    'entrepreneur tools',
    'venture operating system',
  ],
  authors: [{ name: 'Donkey Ideas' }],
  creator: 'Donkey Ideas',
  publisher: 'Donkey Ideas',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.donkeyideas.com',
    title: 'Donkey Ideas — Venture Builder & Operating System',
    description: 'Transform your vision into reality with comprehensive venture building and operating tools.',
    siteName: 'Donkey Ideas',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Donkey Ideas - Venture Builder Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Donkey Ideas — Venture Builder & Operating System',
    description: 'Transform your vision into reality with comprehensive venture building and operating tools.',
    images: ['/og-image.png'],
    creator: '@donkeyideas',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body>
        <OrganizationStructuredData data={{
          name: 'Donkey Ideas',
          url: 'https://www.donkeyideas.com',
          logo: 'https://www.donkeyideas.com/logo.png',
          description: 'Comprehensive venture builder platform and operating system for entrepreneurs.',
        }} />
        <WebsiteStructuredData />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


