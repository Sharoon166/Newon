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
    // Staff users go to their restricted page
    if (token.role === 'staff') {
      const staffInventoryUrl = new URL('/inventory/staff', request.url);
      return NextResponse.redirect(staffInventoryUrl);
    }
    // Admin users go to main inventory
    const inventoryUrl = new URL('/inventory', request.url);
    return NextResponse.redirect(inventoryUrl);
  }

  // Role-based access control for staff
  if (token && token.role === 'staff') {
    // Staff can only access /inventory/staff and /not-allowed
    const allowedStaffRoutes = ['/inventory/staff', '/not-allowed'];
    const isAllowedStaffRoute = allowedStaffRoutes.some(route => pathname.startsWith(route));
    
    if (!isAllowedStaffRoute) {
      // Redirect staff to not-allowed page
      const notAllowedUrl = new URL('/not-allowed', request.url);
      return NextResponse.redirect(notAllowedUrl);
    }
  }

  // Redirect root to appropriate page based on role
  if (pathname === '/') {
    if (token?.role === 'staff') {
      const staffInventoryUrl = new URL('/inventory/staff', request.url);
      return NextResponse.redirect(staffInventoryUrl);
    }
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
