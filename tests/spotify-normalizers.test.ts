import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TopTracksSection } from "../components/detail/top-tracks-section";
import { normalizeTopArtists, normalizeTopTracks, extractAlbumsFromTracks, selectArtistTopTracks } from "../lib/spotify/normalizers";
import { prepareSnapshot } from "../supabase/functions/_shared/snapshots";
import type { SpotifyArtist, SpotifyTrack } from "../lib/spotify/types";

const artist: SpotifyArtist = { id: "artist-one", name: "Artist One", external_urls: { spotify: "https://open.spotify.com/artist/one" } };
function track(id: string, albumId: string, overrides: Partial<SpotifyTrack> = {}): SpotifyTrack {
  return {
    id, name: `Track ${id}`, duration_ms: 123_000, preview_url: null, track_number: 1, explicit: false,
    artists: [{ id: artist.id, name: artist.name }],
    album: { id: albumId, name: `Album ${albumId}`, artists: [], release_date: "2026-01-01", total_tracks: 10, album_type: "album", external_urls: { spotify: "https://open.spotify.com/album/one" } },
    external_urls: { spotify: `https://open.spotify.com/track/${id}` }, ...overrides,
  };
}

describe("Spotify metadata compatibility", () => {
  test("missing popularity stays unknown and missing artwork and genres remain usable", () => {
    expect(normalizeTopArtists([artist])[0]).toEqual({ rank: 1, id: artist.id, name: artist.name, imageUrl: null, genres: [], popularity: null });
    expect(normalizeTopTracks([track("one", "album")])[0]).toMatchObject({ rank: 1, imageUrl: null, popularity: null, albumId: "album" });
  });
  test("complete records keep medium artwork, genres, ranking and zero popularity", () => {
    const images = [{ url: "https://i.scdn.co/large", height: 640, width: 640 }, { url: "https://i.scdn.co/medium", height: 300, width: 300 }];
    expect(normalizeTopArtists([{ ...artist, genres: ["pop"], images, popularity: 0 }])[0]).toMatchObject({ genres: ["pop"], imageUrl: images[1].url, popularity: 0 });
    const rawTrack = track("one", "album", { popularity: 83 });
    rawTrack.album.images = images;
    expect(normalizeTopTracks([rawTrack])[0]).toMatchObject({ imageUrl: images[1].url, popularity: 83, artistName: artist.name });
  });
  test("album aggregation shares persistence ordering and preserves tie order", () => {
    const tracks = normalizeTopTracks([track("one", "A"), track("two", "B"), track("three", "B"), track("four", "C")]);
    const albums = extractAlbumsFromTracks(tracks);
    expect(albums.map(album => ({ id: album.id, count: album.trackCount, rank: album.rank }))).toEqual([
      { id: "B", count: 2, rank: 1 }, { id: "A", count: 1, rank: 2 }, { id: "C", count: 1, rank: 3 },
    ]);
    expect(prepareSnapshot([], tracks).p_albums.map(album => album.album_id)).toEqual(albums.map(album => album.id));
    expect(extractAlbumsFromTracks([])).toEqual([]);
  });
  test("artist tracks include collaborators without renumbering the user's ranks", () => {
    const tracks = [
      track("unrelated", "A"),
      track("collaboration", "B", { artists: [{ id: "primary", name: "Primary" }, { id: "featured", name: "Featured" }] }),
      track("solo", "C", { artists: [{ id: "featured", name: "Featured" }] }),
    ];
    expect(selectArtistTopTracks(tracks, "featured", 1).map(item => ({ id: item.id, rank: item.rank }))).toEqual([{ id: "collaboration", rank: 2 }]);
  });
  test("popularity badges hide unknown values and preserve a reported zero", () => {
    const baseTrack = { rank: 1, id: "one", name: "One", imageUrl: null, subtitle: "Artist", durationMs: 123_000 };
    for (const popularity of [undefined, null]) {
      const html = renderToStaticMarkup(createElement(TopTracksSection, { title: "Tracks", tracks: [{ ...baseTrack, popularity }] }));
      expect(html).not.toContain("% popularity");
      expect(html).toContain("One");
    }
    const html = renderToStaticMarkup(createElement(TopTracksSection, { title: "Tracks", tracks: [{ ...baseTrack, popularity: 0 }] }));
    expect(html.replace(/<[^>]*>/g, "")).toContain("0% popularity");
  });
});
