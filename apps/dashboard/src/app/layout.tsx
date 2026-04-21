import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import { OrganizationStructuredData, WebsiteStructuredData, ServiceStructuredData } from '@/components/seo/structured-data';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const GA_MEASUREMENT_ID = 'G-N12TK3KWF4';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.donkeyideas.com'),
  title: {
    default: 'Donkey Ideas — Creative Consulting Studio',
    template: '%s | Donkey Ideas',
  },
  description: 'Donkey Ideas is a creative consulting studio helping entrepreneurs turn bold ideas into real businesses. Strategy, business planning, financial modeling, and hands-on project management.',
  keywords: [
    'creative consulting',
    'business consulting',
    'startup consulting',
    'project management',
    'business planning',
    'financial modeling',
    'entrepreneur tools',
    'idea development',
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
    title: 'Donkey Ideas — Creative Consulting Studio',
    description: 'A creative consulting studio helping entrepreneurs turn bold ideas into real businesses.',
    siteName: 'Donkey Ideas',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Donkey Ideas - Creative Consulting Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Donkey Ideas — Creative Consulting Studio',
    description: 'A creative consulting studio helping entrepreneurs turn bold ideas into real businesses.',
    images: ['/og-image.png'],
    creator: '@donkeyideas',
  },
  alternates: {
    canonical: 'https://www.donkeyideas.com',
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
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
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
      <body className={inter.className}>
        <OrganizationStructuredData data={{
          name: 'Donkey Ideas',
          url: 'https://www.donkeyideas.com',
          logo: 'https://www.donkeyideas.com/logo.png',
          description: 'Creative consulting studio helping entrepreneurs turn bold ideas into real businesses through strategy, planning, and hands-on project management.',
        }} />
        <WebsiteStructuredData />
        <ServiceStructuredData />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


