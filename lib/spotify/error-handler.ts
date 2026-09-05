/**
 * Client-side utility for handling Spotify API errors
 */

export interface SpotifyErrorResponse {
  error: string;
  spotifyError?: boolean;
  requiresReauth?: boolean;
}

/**
 * Checks if an API response indicates a Spotify auth error
 */
export function isSpotifyAuthError(data: unknown): data is SpotifyErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "spotifyError" in data &&
    "requiresReauth" in data &&
    (data as SpotifyErrorResponse).requiresReauth === true
  );
}

/**
 * Handles Spotify API errors and redirects to re-auth if needed
 * @param data - The error response data
 * @param autoRedirect - Whether to automatically redirect to re-auth (default: true)
 */
export function handleSpotifyError(
  data: SpotifyErrorResponse,
  autoRedirect: boolean = true
): void {
  if (isSpotifyAuthError(data)) {
    console.error("[Spotify Error] Authentication required:", data.error);
    
    if (autoRedirect) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Reauthentication must discard stale authenticated client state.
      window.location.href = "/?reauth=spotify";
    }
  }
}

/**
 * Wrapper for fetch calls that handles Spotify errors automatically
 * Use this in client components to automatically handle auth errors
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param autoRedirect - Whether to automatically redirect on auth errors (default: true)
 * @returns The response data or null if there was an auth error requiring redirect
 * 
 * @example
 * const data = await fetchWithSpotifyErrorHandling<MyData>('/api/artists');
 * if (!data) return; // User was redirected to reauth
 */
export async function fetchWithSpotifyErrorHandling<T>(
  url: string,
  options?: RequestInit,
  autoRedirect: boolean = true
): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      if (isSpotifyAuthError(data)) {
        handleSpotifyError(data, autoRedirect);
        return null;
      }
      throw new Error(data.error || "API request failed");
    }

    return data as T;
  } catch (error) {
    console.error("[Spotify Error Handler] Fetch failed:", error);
    throw error;
  }
}
