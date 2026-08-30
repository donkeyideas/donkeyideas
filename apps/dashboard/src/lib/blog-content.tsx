import React from 'react';

/**
 * Blog authoring convention — lets post content (and the AI writer) add the
 * studio's "character" elements with plain-text markers. Transformed at render
 * time into the styled HTML the .dk-post CSS already knows how to render.
 *
 *   ==text==                        → yellow highlight (inline; works in body + title)
 *   [[pull: text]]                  → pull-quote block (yellow left border)
 *   [[stat: 35% | description]]     → stat callout card (big red number + text)
 *   <blockquote>…</blockquote>      → also styled as a pull-quote (via CSS)
 *
 * All markers are optional and backward-compatible: existing plain posts are
 * untouched.
 */
export function enhancePostHtml(html: string): string {
  if (!html) return '';
  let out = html;

  // [[stat: value | description]] — optionally wrapped by the editor in a <p>
  out = out.replace(
    /(?:<p>\s*)?\[\[stat:\s*([^|\]]+?)\s*\|\s*([\s\S]+?)\]\](?:\s*<\/p>)?/gi,
    (_m, val, desc) => `<div class="stat-callout"><b>${val.trim()}</b><span>${desc.trim()}</span></div>`
  );

  // [[pull: text]]
  out = out.replace(
    /(?:<p>\s*)?\[\[pull:\s*([\s\S]+?)\]\](?:\s*<\/p>)?/gi,
    (_m, text) => `<div class="pull">${text.trim()}</div>`
  );

  // ==highlight==
  out = out.replace(/==([^=]+?)==/g, (_m, t) => `<span class="hl">${t}</span>`);

  return out;
}

/** Remove markers for plain-text contexts (list titles, <title>, structured data). */
export function stripMarks(s: string | null | undefined): string {
  return (s || '').replace(/==([^=]+?)==/g, '$1');
}

/** Render a title with ==highlight== spans as JSX (for the post H1). */
export function renderTitle(title: string): React.ReactNode {
  const parts = (title || '').split(/==([^=]+?)==/g);
  return parts.map((p, i) => (i % 2 === 1 ? <span className="hl" key={i}>{p}</span> : p));
}
