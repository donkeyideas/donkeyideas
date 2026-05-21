'use client';

import { useEffect } from 'react';

/**
 * Ports the mockup's scroll-reveal IntersectionObserver: adds the `.in`
 * class to every `.reveal` element as it scrolls into view. Renders nothing.
 */
export default function MarbleRacingReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.mr-root .reveal'));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
