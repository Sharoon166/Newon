import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/error', '/auth/register', '/setup'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Get the token
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Redirect to login if not authenticated and trying to access protected route
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to inventory if authenticated and trying to access auth pages
  if (token && isPublicRoute) {
    const inventoryUrl = new URL('/inventory', request.url);
    return NextResponse.redirect(inventoryUrl);
  }

  // Redirect root to inventory
  if (pathname === '/') {
    const dashboardUrl = new URL('/inventory', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};
