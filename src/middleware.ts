import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// This is your middleware function that runs before requests are completed
export function middleware() {
  //   const { pathname } = req.nextUrl;

  //   console.log(`🔍 Middleware executing for: ${pathname}`);

  //   // Define public routes (accessible without authentication)
  //   const publicRoutes = ['/', '/login', '/register', '/not-allowed'];

  //   // Check if current route is public
  //   const isPublicRoute = publicRoutes.some(route => pathname === route);

  //   // Get mock token from cookie (simulating authentication)
  //   const token = req.cookies.get('mock-token')?.value;

  //   // Parse token if it exists
  //   let userRole: string | null = null;
  //   if (token) {
  //     try {
  //       // In real app, you'd verify JWT signature here
  //       const parsed = JSON.parse(token);
  //       userRole = parsed.role;
  //       console.log(`👤 User role: ${userRole}`);
  //     } catch (e) {
  //       console.log('❌ Invalid token');
  //     }
  //   }

  //   // If route is public, allow access
  //   if (isPublicRoute) {
  //     console.log('✅ Public route - access granted');
  //     return NextResponse.next();
  //   }


  //   // If not authenticated, redirect to login
  //   if (!token) {
  //     console.log('🚫 Not authenticated - redirecting to login');
  // return NextResponse.redirect(new URL('/not-allowed', req.url));
  //   }

  //   // Check admin routes
  //   if (pathname.startsWith('/admin') && userRole !== 'admin') {
  //     console.log('🚫 Not admin - access forbidden');
  //     return new Response('Forbidden: Admin access required', { status: 403 });
  //   }

  //   console.log('✅ Access granted');
  //   return NextResponse.next();
  return NextResponse.next()
}

// Configure which routes the middleware runs on
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};