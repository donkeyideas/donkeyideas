import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Donkey Marble Racing — Admin',
  description: 'Admin Dashboard for Donkey Marble Racing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-navy-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
