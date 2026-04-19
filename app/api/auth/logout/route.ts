import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (sessionCookie) {
      try {
        // Verify the session cookie to get the user ID
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        // Revoke all refresh tokens for this user
        await auth.revokeRefreshTokens(decodedClaims.uid);
      } catch (error) {
        // If the session cookie is invalid or expired, we can still proceed to clear it
        console.warn('Could not verify session cookie or revoke tokens:', error);
      }
    }

    // Remove the session cookie
    cookieStore.delete('session');

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
