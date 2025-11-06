import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // TEMPORARILY DISABLED FOR DEBUGGING - REMOVE COMMENTS TO RE-ENABLE AUTH

  // // Define public routes (accessible without authentication)
  // const publicRoutes = ['/login', '/api/auth', '/not-allowed'];

  // // Check if current route is public or API route
  // const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  // const isApiRoute = pathname.startsWith('/api/');

  // // Allow public routes and API routes
  // if (isPublicRoute || isApiRoute) {
  //   return NextResponse.next();
  // }

  // // Check for Better Auth session cookie
  // const sessionCookie = request.cookies.get('better-auth.session_token');

  // // If no session cookie and trying to access protected route, redirect to login
  // if (!sessionCookie && !isPublicRoute) {
  //   const loginUrl = new URL('/login', request.url);
  //   return NextResponse.redirect(loginUrl);
  // }

  // Redirect root to customers (keeping this active)
  if (pathname === '/') {
    const dashboardUrl = new URL('/customers', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)'
  ]
};
