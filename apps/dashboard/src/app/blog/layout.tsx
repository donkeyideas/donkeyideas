import { Metadata } from 'next';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

// Metadata here is only a fallback — /blog and /blog/[slug] set their own title,
// description, and OG. We keep a new-brand OG default and the breadcrumb schema.
export const metadata: Metadata = {
  openGraph: {
    title: 'Blog — Venture Building & Startup Finance Notes | Donkey Ideas',
    description: 'Field notes from a venture studio building a dozen products — venture building, product strategy, and startup finance.',
    url: 'https://www.donkeyideas.com/blog',
    images: [
      {
        url: '/og-home.png',
        width: 1200,
        height: 630,
        alt: 'Donkey Ideas — Dumb ideas, taken seriously.',
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
