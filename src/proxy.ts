/**
 * Proxy (Next.js 16's renamed `middleware`) — a COARSE auth gate.
 *
 * It only checks that a validly-signed session cookie is present and redirects
 * anonymous page loads to the right login screen. It deliberately does NOT hit
 * the database: the authoritative "is this session live / does this user have
 * the role?" check happens inside each protected route handler via
 * `getSessionUser` / `requireRole` (see `src/lib/auth.ts`). The proxy just keeps
 * signed-out users from ever rendering a protected page.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifyCookieValue } from "@/lib/cookieSign";

/**
 * Which paths actually require a session. The matcher runs the proxy across the
 * authenticated areas, but several sub-paths are intentionally PUBLIC:
 *   • /admin/login        — the admin sign-in page
 *   • /vendor/register    — the public caterer onboarding wizard
 *   • /partner (landing)  — the partner pitch page
 *   • /bookings/invoice   — a shareable invoice viewer
 */
function isProtected(pathname: string): boolean {
  if (pathname === "/admin/login") return false;
  if (pathname.startsWith("/admin")) return true;
  if (pathname === "/vendor/dashboard" || pathname.startsWith("/vendor/dashboard/"))
    return true;
  if (
    pathname === "/partner/dashboard" ||
    pathname.startsWith("/partner/dashboard/")
  )
    return true;
  if (pathname === "/bookings") return true; // My Bookings (invoice stays public)
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  const hasSession = Boolean(
    verifyCookieValue(request.cookies.get(SESSION_COOKIE)?.value),
  );
  if (hasSession) return NextResponse.next();

  // Anonymous → send to the appropriate login, preserving where they wanted to
  // go so the app can bounce them back after signing in.
  const loginPath = pathname.startsWith("/admin") ? "/admin/login" : "/login";
  const url = request.nextUrl.clone();
  url.pathname = loginPath;
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Guard the authenticated areas. Static assets, image optimization and API
  // routes are excluded (API routes enforce their own guards).
  matcher: [
    "/admin/:path*",
    "/vendor/:path*",
    "/partner/:path*",
    "/bookings/:path*",
  ],
};
