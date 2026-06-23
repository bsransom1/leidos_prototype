import { NextResponse, type NextRequest } from 'next/server';
import { getUserStubFromCookies, middlewareCookieReader } from '@/lib/supabase/middleware-session';

function isProtectedRoute(pathname: string): boolean {
  if (pathname.startsWith('/demo')) return false;
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/create')) return true;
  if (pathname.startsWith('/proposal/shared')) return false;
  return pathname.startsWith('/proposal');
}

/** Avoid middleware work unless redirects depend on knowing who is logged in. */
function needsSessionForMiddleware(pathname: string): boolean {
  if (pathname === '/') return false;
  if (pathname.startsWith('/auth/callback')) return false;
  if (pathname.startsWith('/demo')) return false;
  return (
    isProtectedRoute(pathname) ||
    pathname === '/login' ||
    pathname === '/signup'
  );
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  let user = null as { id: string } | null;

  if (needsSessionForMiddleware(request.nextUrl.pathname) && supabaseUrl) {
    user = await getUserStubFromCookies(middlewareCookieReader(request), supabaseUrl);
  }

  const pathname = request.nextUrl.pathname;

  if (isProtectedRoute(pathname) && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    '/((?!_next/|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
