import Link from 'next/link';
import { prisma } from '@donkey-ideas/database';
import ScrollHeader from '../home/scroll-header';

async function getPrivacyContent() {
  try {
    const content = await prisma.websiteContent.findFirst({
      where: { section: 'privacy-page', published: true },
    });
    return content;
  } catch (error) {
    console.error('Failed to load privacy page content:', error);
    return null;
  }
}

export default async function PrivacyPage() {
  const content = await getPrivacyContent();
  
  // Default content if not in database
  const privacyContent = content?.content || {
    title: 'Privacy Policy',
    lastUpdated: 'January 2026',
    sections: [
      {
        heading: 'Introduction',
        content: 'At Donkey Ideas, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.',
      },
      {
        heading: 'Information We Collect',
        content: 'We collect information that you provide directly to us, including:\n\n• Name and contact information\n• Company information\n• Email address\n• Information about your business needs\n• Any other information you choose to provide',
      },
      {
        heading: 'How We Use Your Information',
        content: 'We use the information we collect to:\n\n• Provide, maintain, and improve our services\n• Communicate with you about our services\n• Respond to your inquiries and support requests\n• Send you updates and marketing communications (with your consent)\n• Protect against fraudulent or illegal activity',
      },
      {
        heading: 'Information Sharing',
        content: 'We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:\n\n• With your consent\n• To comply with legal obligations\n• To protect our rights and safety\n• With service providers who assist us in operating our business',
      },
      {
        heading: 'Data Security',
        content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.',
      },
      {
        heading: 'Your Rights',
        content: 'You have the right to:\n\n• Access your personal information\n• Correct inaccurate information\n• Request deletion of your information\n• Opt-out of marketing communications\n• File a complaint with a supervisory authority',
      },
      {
        heading: 'Cookies and Tracking',
        content: 'We use cookies and similar tracking technologies to improve your experience on our website. You can control cookie settings through your browser preferences.',
      },
      {
        heading: 'Changes to This Policy',
        content: 'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.',
      },
      {
        heading: 'Contact Us',
        content: 'If you have any questions about this Privacy Policy, please contact us at:\n\nEmail: info@donkeyideas.com\nLocation: New York & Miami',
      },
    ],
  };

  const pageContent = typeof privacyContent === 'string' 
    ? JSON.parse(privacyContent) 
    : privacyContent;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <ScrollHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-light leading-tight mb-6">
            {pageContent.title}
          </h1>
          <p className="text-lg text-slate-400">
            Last Updated: {pageContent.lastUpdated}
          </p>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {pageContent.sections?.map((section: any, index: number) => (
            <div key={index} className="space-y-4">
              <h2 className="text-3xl font-light text-white">
                {section.heading}
              </h2>
              <div className="text-lg text-slate-300 leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-light mb-6">
            Questions about your privacy?
          </h2>
          <p className="text-xl text-slate-300 mb-10 leading-relaxed">
            We&apos;re here to help. Reach out to us with any concerns.
          </p>
          <Link
            href="/contact"
            className="inline-block px-10 py-4 bg-white text-slate-900 rounded-full hover:bg-white/90 transition-all text-base font-medium shadow-xl hover:shadow-2xl hover:scale-105 transform"
          >
            Contact Us
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-xl font-semibold tracking-tight">
              <span className="font-light">DONKEY</span> IDEAS
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400">
              <Link href="/ventures" className="hover:text-white transition-colors">
                Ventures
              </Link>
              <Link href="/services" className="hover:text-white transition-colors">
                Services
              </Link>
              <Link href="/process" className="hover:text-white transition-colors">
                Approach
              </Link>
              <Link href="/about" className="hover:text-white transition-colors">
                About
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/login" className="hover:text-white transition-colors">
                Login
              </Link>
            </div>
            <div className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Donkey Ideas
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
