import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify/api";
import { badRequestResponse, serverErrorResponse } from "@/lib/api/utils";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  try {
    const accessToken = await getAccessToken();

    switch (action) {
      case "devices": {
        const response = await fetch(`${SPOTIFY_API_BASE}/me/player/devices`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get devices: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
      }

      case "currently-playing": {
        const response = await fetch(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });

        if (response.status === 204) {
          return NextResponse.json({ is_playing: false });
        }

        if (!response.ok) {
          throw new Error(`Failed to get currently playing: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
      }

      default:
        return badRequestResponse(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`Error in GET /api/spotify/player/[action]:`, error);
    return serverErrorResponse(`Failed to handle player request`);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  try {
    const accessToken = await getAccessToken();

    switch (action) {
      case "play": {
        const body = await request.json();
        const { device_id, context_uri, uris, offset } = body;

        const response = await fetch(`${SPOTIFY_API_BASE}/me/player/play`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(device_id && { device_id }),
            ...(context_uri && { context_uri }),
            ...(uris && { uris }),
            ...(offset && { offset }),
          }),
        });

        if (!response.ok && response.status !== 204) {
          throw new Error(`Failed to play: ${response.statusText}`);
        }

        return NextResponse.json({ success: true });
      }

      case "pause": {
        const response = await fetch(`${SPOTIFY_API_BASE}/me/player/pause`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });

        if (!response.ok && response.status !== 204) {
          throw new Error(`Failed to pause: ${response.statusText}`);
        }

        return NextResponse.json({ success: true });
      }

      default:
        return badRequestResponse(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`Error in PUT /api/spotify/player/[action]:`, error);
    return serverErrorResponse(`Failed to handle player request`);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  try {
    const accessToken = await getAccessToken();

    switch (action) {
      case "queue": {
        const body = await request.json();
        const { uri } = body;

        if (!uri) {
          return badRequestResponse("URI is required");
        }

        const response = await fetch(
          `${SPOTIFY_API_BASE}/me/player/queue?uri=${encodeURIComponent(uri)}`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok && response.status !== 204) {
          throw new Error(`Failed to add to queue: ${response.statusText}`);
        }

        return NextResponse.json({ success: true });
      }

      default:
        return badRequestResponse(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`Error in POST /api/spotify/player/[action]:`, error);
    return serverErrorResponse(`Failed to handle player request`);
  }
}
