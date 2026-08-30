'use client';

import { useEffect, useState } from 'react';

/** A "Book a call" button that fades in after the reader scrolls past the hero.
 * Rendered inside .dk-cfo so its styling is scoped. */
export default function StickyCta({ href, label }: { href: string; label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <a
      className={`dk-sticky-cta${show ? ' show' : ''}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}
