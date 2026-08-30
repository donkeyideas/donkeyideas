'use client';

import { useEffect } from 'react';

/** Scroll-reveal for the venture detail page, ported from the mock. Scoped to
 * `.dk-detail` so it never touches other pages. */
export default function DetailMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.dk-detail');
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = root.querySelectorAll('.stat, .col, .faq-item, h2, .lede, .verdict, .feat');
    targets.forEach((el, i) => {
      el.classList.add('reveal');
      (el as HTMLElement).style.transitionDelay = `${(i % 8) * 45}ms`;
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );
    root.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
