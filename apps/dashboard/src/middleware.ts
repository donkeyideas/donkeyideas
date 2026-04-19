import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Mobile Bearer token → cookie bridge for API routes
  // Converts Authorization: Bearer <token> into an auth-token cookie
  // so all existing API routes work without modification.
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7);
      const requestHeaders = new Headers(request.headers);
      const existingCookies = request.headers.get('cookie') || '';
      requestHeaders.set('cookie', existingCookies ? `${existingCookies}; auth-token=${bearerToken}` : `auth-token=${bearerToken}`);
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
    return NextResponse.next();
  }

  // Web app: protect /app/* routes
  const token = request.cookies.get('auth-token');
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (!isPublicRoute && !token && pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login', '/register', '/api/:path*'],
};

