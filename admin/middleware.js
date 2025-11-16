import { NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/config';

export function middleware(request) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  
  // List of all protected admin routes
  const protectedRoutes = [
    '/admin',
    '/manageproperty',
    '/city',
    '/buildermanagement',
    '/categories',
    '/users',
    '/leads',
    '/settings',
    '/insights'
  ];
  
  const isProtected = protectedRoutes.some(route => 
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`)
  );

  // Only redirect if it's a protected route and no token exists
  // Note: We check for token existence only, actual validation happens in ProtectedRoute component
  if (isProtected && !token) {
    // Store the attempted URL for redirect after login
    const redirectUrl = request.nextUrl.pathname + request.nextUrl.search;
    return NextResponse.redirect(new URL(`/?redirect=${encodeURIComponent(redirectUrl)}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/manageproperty/:path*',
    '/city/:path*',
    '/buildermanagement/:path*',
    '/categories/:path*',
    '/users/:path*',
    '/leads/:path*',
    '/settings/:path*',
    '/insights/:path*',
    // Also match exact routes (without trailing path)
    '/admin',
    '/manageproperty',
    '/city',
    '/buildermanagement',
    '/categories',
    '/users',
    '/leads',
    '/settings',
    '/insights'
  ],
};
