import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { SpotifyAPIError } from "@/lib/spotify/errors";
import { isTimeRange } from "@/lib/spotify/time-range";

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  return { user, supabase };
}

/**
 * Validates that the user is authenticated
 * @returns User object if authenticated, null otherwise
 */
export async function validateAuth() {
  const authContext = await getAuthContext();
  return authContext?.user ?? null;
}

/**
 * Higher-order function that wraps an API handler with authentication and error handling
 * @param handler - The API handler function that receives the authenticated user
 * @returns A wrapped handler with automatic auth checking and error handling
 */
export function withAuthHandler<T extends Record<string, unknown> = Record<string, unknown>>(
  handler: (user: User, request: Request, context: T) => Promise<Response>
) {
  return async (request: Request, context: T) => {
    try {
      const user = await validateAuth();
      if (!user) {
        return unauthorizedResponse();
      }
      return await handler(user, request, context);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

/**
 * Gets the authenticated user and Supabase client
 * @returns Object with user and supabase client, or null if not authenticated
 */
export async function authenticateUser() {
  return getAuthContext();
}

export async function getAuthenticatedUser() {
  return authenticateUser();
}

/**
 * Handles API errors and returns appropriate responses
 * @param error - The error to handle
 * @returns NextResponse with appropriate status and message
 */
export function handleAPIError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Handle Spotify API errors specifically
  if (error instanceof SpotifyAPIError) {
    if (error.shouldRefresh) {
      return NextResponse.json(
        {
          error: error.message,
          requiresReauth: true,
          spotifyError: true,
        },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        error: error.message,
        spotifyError: true,
      },
      { status: error.status }
    );
  }

  // Handle generic errors
  if (error instanceof Error) {
    return serverErrorResponse(error.message);
  }

  return serverErrorResponse("An unexpected error occurred");
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
  return isTimeRange(timeRange);
}
