import { NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/config';

export function middleware(request) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const isProtected = request.nextUrl.pathname.startsWith('/admin');

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
