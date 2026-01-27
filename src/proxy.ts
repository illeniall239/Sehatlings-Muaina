import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Define protected page routes (redirect to login if unauthenticated)
  const protectedPaths = ['/dashboard', '/reports', '/settings'];
  const isProtectedRoute = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  // Define protected API routes (return 401 JSON if unauthenticated)
  const protectedApiPaths = ['/api/reports', '/api/doctors'];
  const isProtectedApi = protectedApiPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  // Define auth routes (login, signup)
  const authPaths = ['/login', '/signup'];
  const isAuthRoute = authPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  // Redirect unauthenticated users to login (page routes)
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Return 401 for unauthenticated API requests
  if (isProtectedApi && !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
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
