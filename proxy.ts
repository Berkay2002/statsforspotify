import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rankingStorageMaintenance, blocksMaintenanceRequest } from "@/lib/maintenance";

export async function proxy(request: NextRequest) {
  if (rankingStorageMaintenance && blocksMaintenanceRequest(request.nextUrl.pathname, request.method)) {
    return NextResponse.json(
      { error: "Brief maintenance in progress. Please try again shortly." },
      { status: 503, headers: {
        "Cache-Control": "private, no-store",
        "Retry-After": "300",
        "X-Ranking-Storage-Maintenance": process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      } },
    );
  }
  // Handle auth callback redirect after successful authentication
  if (request.nextUrl.pathname === "/auth/callback") {
    const { user, supabaseResponse } = await updateSession(request);

    // If user is authenticated after callback, redirect to dashboard
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  const { user, supabaseResponse } = await updateSession(request);

  if (request.nextUrl.pathname === "/api/snapshot") {
    supabaseResponse.headers.set("X-Ranking-Storage-Release", process.env.VERCEL_GIT_COMMIT_SHA ?? "local");
  }

  // Protected routes - redirect to home if not authenticated
  if (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/profile")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // If user is authenticated and on home page, redirect to dashboard
  if (request.nextUrl.pathname === "/" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
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
