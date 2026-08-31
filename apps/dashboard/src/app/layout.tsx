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
    default: 'Donkey Ideas | New York Venture Studio & Fractional CFO',
    template: '%s | Donkey Ideas',
  },
  description: 'Donkey Ideas is a New York venture studio that validates, builds, and launches real digital businesses — plus fractional CFO services for startups and small businesses. Idea validation, financial modeling, and AI-native product development, from concept to launch.',
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
    title: 'Donkey Ideas | New York Venture Studio & Fractional CFO',
    description: 'A one-person venture studio building a portfolio of real digital products — plus fractional CFO services for startups. Dumb ideas, taken seriously.',
    siteName: 'Donkey Ideas',
    images: [
      {
        url: '/og-home.png',
        width: 1200,
        height: 630,
        alt: 'Donkey Ideas — Dumb ideas, taken seriously.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Donkey Ideas | New York Venture Studio & Fractional CFO',
    description: 'A venture studio building real digital products, plus fractional CFO services for startups. Dumb ideas, taken seriously.',
    images: ['/og-home.png'],
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
          description: 'New York venture studio that validates, builds, and launches real digital businesses, plus fractional CFO services for startups and small businesses.',
          sameAs: [
            'https://www.linkedin.com/company/donkey-ideas/',
            'https://github.com/donkeyideas',
          ],
        }} />
        <WebsiteStructuredData />
        <ServiceStructuredData />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


