'use client';

import { useEffect } from 'react';

/** Reading-progress bar for a blog post. Scoped to `.dk-post .progress`. */
export default function PostProgress() {
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('.dk-post .progress');
    if (!bar) return;
    const onScroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      bar.style.width = `${pct}%`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return null;
}
