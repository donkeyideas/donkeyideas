import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center px-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-6xl font-light mb-4">404</h1>
        <h2 className="text-2xl font-light mb-6">Venture Not Found</h2>
      <p className="text-slate-400 mb-8">
        The venture you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
        <Link
          href="/ventures"
          className="inline-block px-8 py-3 bg-white text-slate-900 rounded-full hover:bg-white/90 transition-all text-base font-medium"
        >
          View All Ventures
        </Link>
      </div>
    </div>
  );
}
