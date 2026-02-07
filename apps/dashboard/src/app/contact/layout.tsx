import { Metadata } from 'next';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'Contact Us — Get in Touch',
  description: 'Contact Donkey Ideas for venture building, strategic consulting, AI advisory, or partnership opportunities.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/contact',
  },
  keywords: [
    'contact donkey ideas',
    'venture builder contact',
    'startup consulting',
    'business consultation',
    'AI advisory',
    'strategic consulting',
  ],
  openGraph: {
    title: 'Contact Us — Get in Touch | Donkey Ideas',
    description: 'Reach out to discuss venture building, partnerships, or how we can help scale your business.',
    url: 'https://www.donkeyideas.com/contact',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Contact Donkey Ideas',
      },
    ],
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbStructuredData items={[
        { name: 'Home', url: 'https://www.donkeyideas.com' },
        { name: 'Contact', url: 'https://www.donkeyideas.com/contact' },
      ]} />
      {children}
    </>
  );
}
