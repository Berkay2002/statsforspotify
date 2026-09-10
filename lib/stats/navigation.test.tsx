import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ArtistsList } from "@/components/artists-list";
import { TracksList } from "@/components/tracks-list";
import { AlbumsList } from "@/components/albums-list";
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
