import { NextRequest, NextResponse } from "next/server";
import { spotifyRequest } from "@/lib/spotify/api";
import { badRequestResponse, handleAPIError } from "@/lib/api/utils";

async function handleSpotifyRequest(
  method: "GET" | "PUT" | "DELETE",
  url: string,
  errorMessage: string
): Promise<NextResponse> {
  try {
    const response = await spotifyRequest(url, { method });

    if (method === "GET") {
      const data = await response.json();
      return NextResponse.json({ isFollowing: data[0] });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error: ${errorMessage}`, error);
    return handleAPIError(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9]{22}$/.test(id)) return badRequestResponse("Invalid artist ID");
  return handleSpotifyRequest(
    "GET",
    `/me/following/contains?type=artist&ids=${id}`,
    "Failed to check follow status"
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9]{22}$/.test(id)) return badRequestResponse("Invalid artist ID");
  return handleSpotifyRequest(
    "PUT",
    `/me/following?type=artist&ids=${id}`,
    "Failed to follow artist"
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9]{22}$/.test(id)) return badRequestResponse("Invalid artist ID");
  return handleSpotifyRequest(
    "DELETE",
    `/me/following?type=artist&ids=${id}`,
    "Failed to unfollow artist"
  );
}
