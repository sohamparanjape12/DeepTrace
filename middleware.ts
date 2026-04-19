import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  // Protect the dashboard and profile routes, redirect to login if no session cookie
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Add paths here that should be protected
    // '/dashboard/:path*', 
    // '/profile/:path*'
  ],
};
