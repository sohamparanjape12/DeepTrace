import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware is intentionally minimal — auth is handled client-side via AuthProvider.
// This file exists to avoid the "Cannot find middleware module" error.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
