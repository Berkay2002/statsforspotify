import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ArtistsList } from "@/components/artists-list";
import { TracksList } from "@/components/tracks-list";
import { AlbumsList } from "@/components/albums-list";
import { HeroBanner } from "@/components/dashboard/hero-banner";
import { HighlightCards } from "@/components/dashboard/highlight-cards";
import type { PlotTwistsRecap } from "@/components/recaps/plot-twists";
import { statsDetailHref } from "./navigation";

const friendId = "00000000-0000-0000-0000-000000000002";
const item = { id: "kent", name: "Kent", rank: 8, imageUrl: null, genres: [], artistName: "Kent", albumName: "Album", durationMs: 180000, trackCount: 1 };
const data = { short_term: [item], medium_term: [item], long_term: [item] };

test("friend artist, track and album cards carry their owner and selected range into detail links", () => {
  const lists = [
    { type: "artist", component: <ArtistsList artistsByTimeRange={data} userId={friendId} /> },
    { type: "track", component: <TracksList tracksByTimeRange={data} userId={friendId} /> },
    { type: "album", component: <AlbumsList albumsByTimeRange={data} userId={friendId} /> },
  ];
  for (const { type, component } of lists) {
    const html = renderToStaticMarkup(component).replaceAll("&amp;", "&");
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]).filter((href) => href.startsWith("/dashboard/"));
    assert.ok(links.length > 0);
    for (const href of links) {
      const url = new URL(href, "http://localhost");
      assert.equal(url.pathname, `/dashboard/${type}s/kent`);
      assert.equal(url.searchParams.get("user_id"), friendId);
      assert.equal(url.searchParams.get("time_range"), "short_term");
    }
  }
});

test("related detail links preserve the friend origin while viewing your own history", () => {
  for (const type of ["artist", "track", "album"] as const) {
    const url = new URL(statsDetailHref(type, "spotify-id", "long_term", friendId, true), "http://localhost");
    assert.equal(url.searchParams.get("user_id"), friendId);
    assert.equal(url.searchParams.get("view"), "me");
    assert.equal(url.searchParams.get("time_range"), "long_term");
  }
});

test("own detail links do not inherit a friend or a view override", () => {
  assert.equal(statsDetailHref("artist", "kent", "medium_term"), "/dashboard/artists/kent?time_range=medium_term");
});

const overviewArtist = { ...item, id: "artist-one", popularity: 0, previous_rank: null };
const overviewTrack = { ...item, id: "track-one", artistId: "artist-one", albumId: "album-one", popularity: 0, previous_rank: null };
const overviewAlbum = { ...item, id: "album-one", artistId: "artist-one", releaseDate: "2026-01-01", totalTracks: 10, previous_rank: null };

function renderedDetailLinks(component: React.ReactNode) {
  const html = renderToStaticMarkup(component).replaceAll("&amp;", "&");
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

test("overview artist, track and album links open the named item in the selected range", () => {
  for (const range of ["short_term", "medium_term", "long_term"] as const) {
    const links = renderedDetailLinks(<>
      <HeroBanner artist={overviewArtist} timeRange={range} />
      <HighlightCards track={overviewTrack} album={overviewAlbum} plotTwists={null} timeRange={range} hasSnapshots />
    </>);
    assert.deepEqual(links, [
      `/dashboard/artists/artist-one?time_range=${range}`,
      `/dashboard/tracks/track-one?time_range=${range}`,
      `/dashboard/albums/album-one?time_range=${range}`,
    ]);
  }
});

test("biggest move links to the winning artist or album and has no link without a move", () => {
  const event = { event_type: "biggest_climb" as const, date: "2026-09-10", item_id: "artist-riser", item_name: "Artist riser", item_image_url: null, rank: 1, previous_rank: 10, delta: 9, context: null };
  const recap: PlotTwistsRecap = {
    short_term: { artists: [event], albums: [] },
    medium_term: { artists: [event], albums: [{ ...event, item_id: "album-riser", item_name: "Album riser", previous_rank: 25, delta: 24 }] },
    long_term: { artists: [], albums: [] },
  };
  for (const [range, expected] of [
    ["short_term", "/dashboard/artists/artist-riser?time_range=short_term"],
    ["medium_term", "/dashboard/albums/album-riser?time_range=medium_term"],
    ["long_term", null],
  ] as const) {
    const links = renderedDetailLinks(<HighlightCards track={overviewTrack} album={overviewAlbum} plotTwists={recap} timeRange={range} hasSnapshots />);
    assert.deepEqual(links.slice(2), expected ? [expected] : []);
  }
});
