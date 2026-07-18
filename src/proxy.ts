import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/config";

/**
 * Optimistic auth gate (this Next version's replacement for `middleware.ts`).
 *
 * Only reads/verifies the session cookie — no data access — per the docs'
 * guidance. Authoritative checks live in the DAL (`lib/auth/dal.ts`).
 */

/** Reachable without a session. */
const PUBLIC_ROUTES = ["/login", "/support"];
/**
 * Public routes that only make sense signed out — a signed-in user hitting one
 * gets bounced to the dashboard. /support is deliberately not here: it stays
 * open either way, since a signed-in user can also need help.
 */
const SIGNED_OUT_ONLY_ROUTES = ["/login"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthenticated = Boolean(session?.username);

  // Unauthenticated user on a protected route → send to login.
  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  // Authenticated user on a signed-out-only route → send to the dashboard.
  if (SIGNED_OUT_ONLY_ROUTES.includes(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
