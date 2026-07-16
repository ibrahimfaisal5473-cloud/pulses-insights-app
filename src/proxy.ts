import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/config";

/**
 * Optimistic auth gate (this Next version's replacement for `middleware.ts`).
 *
 * Only reads/verifies the session cookie — no data access — per the docs'
 * guidance. Authoritative checks live in the DAL (`lib/auth/dal.ts`).
 */

const PUBLIC_ROUTES = ["/login"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthenticated = Boolean(session?.username);

  // Unauthenticated user on a protected route → send to login.
  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  // Authenticated user on a public (auth) route → send to the dashboard.
  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
