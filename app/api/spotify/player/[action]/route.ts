import { NextRequest, NextResponse } from "next/server";
import { spotifyRequest } from "@/lib/spotify/api";
import { badRequestResponse, handleAPIError } from "@/lib/api/utils";

type Context = { params: Promise<{ action: string }> };
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(_request: NextRequest, { params }: Context) {
  const { action } = await params;
  if (action !== "devices" && action !== "currently-playing") return badRequestResponse("Unknown player action");
  try {
    const response = await spotifyRequest(`/me/player/${action}`);
    return NextResponse.json(response.status === 204 ? { is_playing: false } : await response.json(), { headers: noStore });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { action } = await params;
  if (action !== "play" && action !== "pause") return badRequestResponse("Unknown player action");
  try {
    let endpoint = `/me/player/${action}`;
    let body: string | undefined;
    if (action === "play") {
      const input: unknown = await request.json();
      if (!input || typeof input !== "object" || Array.isArray(input)) return badRequestResponse("Invalid playback request");
      const { device_id, context_uri, uris, offset } = input as Record<string, unknown>;
      if (device_id !== undefined && (typeof device_id !== "string" || !device_id)) return badRequestResponse("Invalid device ID");
      if (context_uri !== undefined && (typeof context_uri !== "string" || !/^spotify:(album|artist|playlist):[a-zA-Z0-9]+$/.test(context_uri))) return badRequestResponse("Invalid context URI");
      if (uris !== undefined && (!Array.isArray(uris) || uris.length === 0 || uris.length > 100 || !uris.every(uri => typeof uri === "string" && /^spotify:(track|episode):[a-zA-Z0-9]+$/.test(uri)))) return badRequestResponse("Invalid playback URIs");
      if (context_uri && uris) return badRequestResponse("Provide a context URI or track URIs");
      if (device_id) endpoint += `?device_id=${encodeURIComponent(device_id as string)}`;
      body = JSON.stringify({ ...(context_uri ? { context_uri } : {}), ...(uris ? { uris } : {}), ...(offset ? { offset } : {}) });
    }
    await spotifyRequest(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body });
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    if (error instanceof SyntaxError) return badRequestResponse("Invalid JSON body");
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const { action } = await params;
  if (action !== "queue") return badRequestResponse("Unknown player action");
  try {
    const input: unknown = await request.json();
    const uri = input && typeof input === "object" && "uri" in input ? input.uri : null;
    if (typeof uri !== "string" || !/^spotify:(track|episode):[a-zA-Z0-9]+$/.test(uri)) return badRequestResponse("Invalid Spotify URI");
    await spotifyRequest(`/me/player/queue?uri=${encodeURIComponent(uri)}`, { method: "POST" });
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    if (error instanceof SyntaxError) return badRequestResponse("Invalid JSON body");
    return handleAPIError(error);
  }
}
