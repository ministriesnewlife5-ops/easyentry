import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getRoleHomePath, isAdminRole, normalizeRole } from "@/lib/roles";
import { canAccessRoute, getRouteAccess } from "@/lib/route-access";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
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
