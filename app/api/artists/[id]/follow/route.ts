import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serverErrorResponse } from "@/lib/api/utils";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

async function getAccessToken() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.provider_token) {
    throw new Error("No active session");
  }

  return session.provider_token;
}

async function handleSpotifyRequest(
  method: "GET" | "PUT" | "DELETE",
  url: string,
  errorMessage: string
): Promise<NextResponse> {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(errorMessage);
    }

    if (method === "GET") {
      const data = await response.json();
      return NextResponse.json({ isFollowing: data[0] });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error: ${errorMessage}`, error);
    return serverErrorResponse(errorMessage);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleSpotifyRequest(
    "GET",
    `${SPOTIFY_API_BASE}/me/following/contains?type=artist&ids=${id}`,
    "Failed to check follow status"
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleSpotifyRequest(
    "PUT",
    `${SPOTIFY_API_BASE}/me/following?type=artist&ids=${id}`,
    "Failed to follow artist"
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleSpotifyRequest(
    "DELETE",
    `${SPOTIFY_API_BASE}/me/following?type=artist&ids=${id}`,
    "Failed to unfollow artist"
  );
}
