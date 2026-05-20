import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Public routes that bypass the admin auth cookie check. The mobile app
 * fetches these from production with no credentials — gating them would
 * make the app silently fall back to defaults (empty trackBgImages,
 * no announcements, no promos, etc.) and look broken in TestFlight.
 *
 * Convention: anything under `/api/game-*` is the public, mobile-facing
 * surface. Admin-only routes use bare names (`/api/announcements`,
 * `/api/promos`, ...). Don't add a route here unless you're certain it
 * should be world-readable.
 */
function isPublicPath(pathname: string): boolean {
  if (pathname === '/login') return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname.startsWith('/api/game-')) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

/* Matcher excludes:
 *   - Next.js internals (_next/static, _next/image)
 *   - favicon.ico
 *   - any static asset by extension (png, jpg, svg, etc.) so files in
 *     /public are served without auth. Without this, /logo-small.png on
 *     the login page 307'd to /login (the user has no auth cookie yet),
 *     which broke the Next.js Image optimizer fetch with a 400 and
 *     rendered as the broken-image icon.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf)$).*)'],
};
