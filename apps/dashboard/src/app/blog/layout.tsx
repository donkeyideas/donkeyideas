import { Metadata } from 'next';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'Blog — Insights on Venture Building & AI',
  description: 'Expert insights on venture building, startup strategy, AI integration, financial modeling, and technology advisory from Donkey Ideas.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/blog',
  },
  keywords: [
    'venture building blog',
    'startup insights',
    'AI strategy',
    'entrepreneurship',
    'business strategy',
    'technology advisory',
  ],
  openGraph: {
    title: 'Blog — Insights on Venture Building & AI | Donkey Ideas',
    description: 'Expert insights on venture building, startup strategy, and AI integration.',
    url: 'https://www.donkeyideas.com/blog',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Donkey Ideas Blog',
      },
    ],
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: 'https://www.donkeyideas.com' },
        { name: 'Blog', url: 'https://www.donkeyideas.com/blog' },
      ]} />
      {children}
    </>
  );
}
