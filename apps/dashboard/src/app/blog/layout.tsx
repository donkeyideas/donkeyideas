import { Metadata } from 'next';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'Blog — Insights on Business Strategy & Creative Consulting',
  description: 'Expert insights on creative consulting, business strategy, financial modeling, and turning bold ideas into real businesses from Donkey Ideas.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/blog',
  },
  keywords: [
    'creative consulting blog',
    'startup insights',
    'business strategy',
    'entrepreneurship',
    'financial modeling',
    'project management',
  ],
  openGraph: {
    title: 'Blog — Insights on Business Strategy & Creative Consulting | Donkey Ideas',
    description: 'Expert insights on creative consulting, business strategy, and turning ideas into businesses.',
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
