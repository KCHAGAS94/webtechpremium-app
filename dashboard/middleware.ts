import { NextRequest, NextResponse } from 'next/server';

// Presence-only check: middleware runs on the Edge runtime, where
// jsonwebtoken's Node `crypto` usage doesn't work, so signature verification
// happens in the API routes/pages that actually consume the token instead.
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const isLoggedIn = !!token;

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/login';

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard/usuarios', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard/:path*'],
};
