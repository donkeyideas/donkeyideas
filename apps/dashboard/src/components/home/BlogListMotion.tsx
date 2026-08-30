'use client';

import { useEffect } from 'react';

/** Blog list: category filter (client-side, on the visible rows) + scroll reveal.
 * Scoped to `.dk-blog`. */
export default function BlogListMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.dk-blog');
    if (!root) return;

    const filters = Array.from(root.querySelectorAll<HTMLElement>('.filter'));
    const onFilter = (btn: HTMLElement) => () => {
      filters.forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      const cat = btn.getAttribute('data-cat');
      root.querySelectorAll<HTMLElement>('.posts .row').forEach((row) => {
        row.classList.toggle('hidden', cat !== 'all' && row.getAttribute('data-cat') !== cat);
      });
    };
    const handlers = filters.map((btn) => {
      const h = onFilter(btn);
      btn.addEventListener('click', h);
      return [btn, h] as const;
    });

    let io: IntersectionObserver | null = null;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const targets = root.querySelectorAll('.featured, .posts .row, .cta-grid, h1, .hero-sub, .filters');
      targets.forEach((el, i) => {
        el.classList.add('reveal');
        (el as HTMLElement).style.transitionDelay = `${(i % 8) * 40}ms`;
      });
      io = new IntersectionObserver(
        (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io!.unobserve(e.target); } }),
        { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
      );
      root.querySelectorAll('.reveal').forEach((el) => io!.observe(el));
    }

    return () => {
      handlers.forEach(([btn, h]) => btn.removeEventListener('click', h));
      if (io) io.disconnect();
    };
  }, []);

  return null;
}
