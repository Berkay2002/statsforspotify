import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // A release can stop application writes while database contracts change.
  if (process.env.MAINTENANCE_MODE === "true") {
    return NextResponse.json({ error: "Brief maintenance in progress. Please try again shortly." }, {
      status: 503,
      headers: { "Cache-Control": "private, no-store", "Retry-After": "60" },
    });
  }

  // OAuth must run even when reconnecting an already authenticated account.
  if (request.nextUrl.pathname === "/auth/callback") {
    return NextResponse.next({ request });
  }

  const { user, supabaseResponse } = await updateSession(request);

  // Protected routes - redirect to home if not authenticated
  if (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/profile")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return redirectWithCookies(url, supabaseResponse);
    }
  }

  // If user is authenticated and on home page, redirect to dashboard
  if (request.nextUrl.pathname === "/" && user &&
      !request.nextUrl.searchParams.has("reauth") && !request.nextUrl.searchParams.has("error")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectWithCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}

export function redirectWithCookies(url: URL, sessionResponse: NextResponse) {
  const response = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) response.cookies.set(cookie);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
