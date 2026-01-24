import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


