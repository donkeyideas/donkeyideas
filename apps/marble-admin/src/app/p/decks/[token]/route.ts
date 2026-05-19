import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

/* ------------------------------------------------------------------ */
/*  GET /p/decks/[token]                                                */
/*                                                                     */
/*  Public, unauthenticated route that serves the generated deck HTML  */
/*  by its shareToken. This is the URL admins copy + send to investors */
/*  / press / partners.                                                */
/*                                                                     */
/*  No auth check — the shareToken is the access control. Tokens are   */
/*  cuids (24-char random strings), so they're not guessable. If a     */
/*  link leaks and you want to revoke, regenerate the deck (creates a  */
/*  new shareToken; old one keeps working until you delete the row).   */
/*                                                                     */
/*  Caching: Vercel edge cache disabled. Each request reads the row    */
/*  from DB and serves its frozen html. Cheap since it's a single      */
/*  primary-key lookup.                                                */
/* ------------------------------------------------------------------ */

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const deck = await prisma.generatedDeck.findUnique({
    where: { shareToken: token },
    select: { html: true, type: true, title: true, generatedAt: true },
  });

  if (!deck) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Deck not found</title>
<style>body{font-family:sans-serif;background:#0a1a3a;color:#fff;margin:0;padding:80px 32px;text-align:center}h1{color:#ffc220}</style>
</head><body><h1>Deck not found</h1><p>This share link is invalid or has been revoked.</p></body></html>`,
      {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }

  return new NextResponse(deck.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      /* Allow embedding in iframes from the admin domain (for the preview) */
      'X-Frame-Options': 'SAMEORIGIN',
      /* Modest cache so repeated views of the same shared link are fast,
       * but a fresh generate is reflected within a minute. */
      'Cache-Control': 'public, max-age=60, must-revalidate',
    },
  });
}
