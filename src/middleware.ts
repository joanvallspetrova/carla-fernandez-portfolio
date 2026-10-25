import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Skip static assets, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/photos') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Route portal.carlafernandezoliva.com (or portal.localhost) directly to /portal
  const isPortalHost =
    hostname.startsWith('portal.') ||
    request.nextUrl.searchParams.get('mode') === 'portal';

  if (isPortalHost && !pathname.startsWith('/portal')) {
    const url = request.nextUrl.clone();
    url.pathname = `/portal${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
