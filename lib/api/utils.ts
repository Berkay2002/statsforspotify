import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Validates that the user is authenticated
 * @returns User object if authenticated, null otherwise
 */
export async function validateAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  return user;
}

/**
 * Creates an unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Creates a bad request response
 */
export function badRequestResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Creates a not found response
 */
export function notFoundResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Creates an internal server error response
 */
export function serverErrorResponse(message: string = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Validates item type (artist, track, or album)
 */
export function validateItemType(type: string | null): type is "artist" | "track" | "album" {
  return type !== null && ["artist", "track", "album"].includes(type);
}

/**
 * Validates time range
 */
export function validateTimeRange(timeRange: string | null): timeRange is "short_term" | "medium_term" | "long_term" {
  return timeRange !== null && ["short_term", "medium_term", "long_term"].includes(timeRange);
}
