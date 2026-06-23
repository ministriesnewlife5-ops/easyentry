import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getRoleHomePath, isAdminRole, normalizeRole } from "@/lib/roles";
import { canAccessRoute, getRouteAccess } from "@/lib/route-access";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = String(request.headers.get('host') || '');

  // Subdomain routing: if request is to staff.* host, rewrite to /staff/*
  if (hostname.startsWith('staff.')) {
    // If the incoming URL is already under /staff, continue normally
    if (!pathname.startsWith('/staff')) {
      const url = request.nextUrl.clone();
      // Rewrite root to /staff, otherwise prefix with /staff
      url.pathname = `/staff${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url);
    }
    // allow middleware to continue for /staff paths
  } else {
    // If host is NOT staff.* but path is /staff/* — block access by showing 404
    if (pathname.startsWith('/staff')) {
      const url = request.nextUrl.clone();
      url.pathname = '/404';
      return NextResponse.rewrite(url);
    }
  }
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const normalizedRole = normalizeRole(token?.role);
  const routeAccess = getRouteAccess(pathname);

  if (routeAccess === 'public') {
    if (normalizedRole && (pathname === '/login' || pathname === '/forgot-password' || pathname === '/work/register')) {
      return NextResponse.redirect(new URL(getRoleHomePath(normalizedRole), request.url));
    }

    return NextResponse.next();
  }

  if (!token || !normalizedRole) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessRoute(pathname, normalizedRole)) {
    const fallback = isAdminRole(normalizedRole)
      ? "/admin"
      : getRoleHomePath(normalizedRole);

    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
