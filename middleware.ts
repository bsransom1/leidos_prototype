import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function isProtectedRoute(pathname: string): boolean {
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/create')) {
    return true;
  }
  // /proposal/shared/[token] is public (viewer link); /proposal/[id] stays protected
  if (pathname.startsWith('/proposal/shared')) {
    return false;
  }
  return pathname.startsWith('/proposal');
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Auth will not work.'
    );
  }

  const supabase = createServerClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      user = u;
    } catch (err) {
      const cause =
        err instanceof Error && 'cause' in err ? (err as Error & { cause?: unknown }).cause : undefined;
      console.error('[middleware] Supabase auth getUser failed (network or config):', err, cause ?? '');
      // Treat as logged out; avoids spamming the same stack trace on every request
    }
  }

  // Protect dashboard and proposal routes (except public shared links)
  if (isProtectedRoute(request.nextUrl.pathname)) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Check if email is confirmed (only if email confirmation is enabled)
    // For internal tools, you may want to disable email confirmation in Supabase settings
    // If disabled, email_confirmed_at will be null but user can still access
    // Uncomment below if you want to enforce email confirmation:
    // if (!user.email_confirmed_at) {
    //   return NextResponse.redirect(new URL('/login?error=email_not_confirmed', request.url));
    // }
  }

  // Redirect authenticated users away from login/signup
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
