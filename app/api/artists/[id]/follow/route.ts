import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

async function getAccessToken() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.provider_token) {
    throw new Error("No active session");
  }

  return session.provider_token;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();

    // Check if user follows the artist
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/following/contains?type=artist&ids=${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to check follow status");
    }

    const [isFollowing] = await response.json();

    return NextResponse.json({ isFollowing });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return NextResponse.json(
      { error: "Failed to check follow status" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();

    // Follow the artist
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/following?type=artist&ids=${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to follow artist");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error following artist:", error);
    return NextResponse.json(
      { error: "Failed to follow artist" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();

    // Unfollow the artist
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/following?type=artist&ids=${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to unfollow artist");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unfollowing artist:", error);
    return NextResponse.json(
      { error: "Failed to unfollow artist" },
      { status: 500 }
    );
  }
}
