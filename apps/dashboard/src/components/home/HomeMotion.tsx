'use client';

import { useEffect } from 'react';

/**
 * Client-side motion for the studio homepage, ported verbatim from the mock's
 * two inline <script> blocks:
 *   1. Scroll-reveal: adds `.reveal` to key elements, then `.in` via
 *      IntersectionObserver as they enter the viewport.
 *   2. Hero "bouncer": lightweight physics loop that floats the logo tiles
 *      around the hero. Respects prefers-reduced-motion.
 *
 * All queries are scoped to the `.dk-home` root so nothing on other pages is
 * ever touched. Returns null — it only runs effects.
 */
export default function HomeMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.dk-home');
    if (!root) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let onResize: (() => void) | null = null;

    // --- 1) Scroll reveals ---
    let io: IntersectionObserver | null = null;
    if (!reduce) {
      const groups = [root.querySelectorAll('.ledger .row'), root.querySelectorAll('.m-item')];
      groups.forEach((list) => {
        list.forEach((el, i) => {
          el.classList.add('reveal');
          (el as HTMLElement).style.transitionDelay = `${(i % 12) * 55}ms`;
        });
      });
      const singles = root.querySelectorAll(
        '.sec-head, .svc-card, .cfo-grid > div, .cfo-list li, .faq-item, .footnote, .name-sec .label, .name-sec blockquote, .name-sec p, .foot'
      );
      singles.forEach((el) => el.classList.add('reveal'));

      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              io!.unobserve(e.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
      );
      root.querySelectorAll('.reveal').forEach((el) => io!.observe(el));
    }

    // --- 2) Hero bouncing logo tiles ---
    const hero = root.querySelector<HTMLElement>('.hero');
    const tiles = Array.from(root.querySelectorAll<HTMLElement>('[data-b]'));
    if (hero && tiles.length) {
      const bounds = () => ({ w: hero.clientWidth, h: hero.clientHeight });
      let b = bounds();
      const bodies = tiles.map((el) => {
        const size = el.offsetWidth;
        return {
          el,
          s: size,
          x: Math.random() * (b.w - size),
          y: Math.random() * (b.h - size),
          vx: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.7),
          vy: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6),
          r: Math.random() * 10 - 5,
          vr: (Math.random() < 0.5 ? -1 : 1) * 0.25,
        };
      });

      if (reduce) {
        bodies.forEach((o) => {
          o.el.style.transform = `translate(${o.x}px,${o.y}px) rotate(${o.r}deg)`;
        });
      } else {
        onResize = () => {
          b = bounds();
        };
        window.addEventListener('resize', onResize);
        const tick = () => {
          bodies.forEach((o) => {
            o.x += o.vx;
            o.y += o.vy;
            o.r += o.vr;
            if (o.x <= 0) {
              o.x = 0;
              o.vx *= -1;
              o.vr *= -1;
            }
            if (o.x >= b.w - o.s) {
              o.x = b.w - o.s;
              o.vx *= -1;
              o.vr *= -1;
            }
            if (o.y <= 0) {
              o.y = 0;
              o.vy *= -1;
            }
            if (o.y >= b.h - o.s) {
              o.y = b.h - o.s;
              o.vy *= -1;
            }
            o.el.style.transform = `translate(${o.x}px,${o.y}px) rotate(${o.r}deg)`;
          });
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (onResize) window.removeEventListener('resize', onResize);
      if (io) io.disconnect();
    };
  }, []);

  return null;
}
