'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface WebsitePreviewProps {
  url: string;
  title: string;
  fallbackImageUrl?: string;
  className?: string;
}

export default function WebsitePreview({ url, title, fallbackImageUrl, className = '' }: WebsitePreviewProps) {
  const [blocked, setBlocked] = useState<boolean | null>(null);

  useEffect(() => {
    // Check server-side if the site allows iframes
    fetch(`/api/check-iframe?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => setBlocked(!data.allowed))
      .catch(() => setBlocked(true));
  }, [url]);

  // Still checking...
  if (blocked === null) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-800/50 ${className}`}>
        <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Site blocks iframes — show fallback image
  if (blocked) {
    if (fallbackImageUrl) {
      return (
        <div className={`w-full h-full relative ${className}`}>
          {fallbackImageUrl.startsWith('/') ? (
            <img src={fallbackImageUrl} alt={title} className="w-full h-full object-contain p-8" />
          ) : (
            <Image
              src={fallbackImageUrl}
              alt={title}
              width={1920}
              height={1080}
              className="w-full h-full object-cover"
              quality={100}
              unoptimized={fallbackImageUrl.includes('.png')}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
        </div>
      );
    }

    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-800/50 ${className}`}>
        <div className="text-center px-4">
          <svg className="w-10 h-10 mx-auto mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <p className="text-slate-500 text-xs">Preview unavailable</p>
        </div>
      </div>
    );
  }

  // Site allows iframes — show live preview
  return (
    <div className={`w-full h-full relative overflow-hidden ${className}`}>
      <iframe
        src={url}
        title={`${title} website preview`}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
      />
    </div>
  );
}
