import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Protect the dashboard and profile routes, redirect to login if no session cookie
  // We only check for paths that are NOT public
  const isPublicRoute = 
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/infrastructure') ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/api') || // Allow API routes for their own auth handling
    pathname.includes('.'); // Allow files like icon.svg, favicon.ico, etc.

  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
