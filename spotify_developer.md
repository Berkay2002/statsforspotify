Certainly! Here is the current content of the `spotify_design_guidelines.md` file in Markdown format:

# Spotify Design & Branding Guidelines

Welcome to the hub for partner guidelines and assets. These guidelines help external developers integrate Spotify into their products while ensuring a consistent user experience and respecting brand and licensing restrictions.

## 1. Introduction

By using these resources, you accept the **Developer Terms of Service**. Usage may also be covered by the Spotify End User Agreement and Privacy Policy.

## 2. Attribution

### When does this apply?

If you use any Spotify metadata (artist, album, track names, artwork, or audio playback), it must always be accompanied by the Spotify brand.

### Rules for Attribution:

* **Logo Usage:** Always attribute content with the Spotify logo.
* **Full Logo vs. Icon:** In partner integrations, use the full logo (icon + wordmark). Use the icon only if space is strictly limited.
* **Compliance:** All logo use must comply with the Logo & Color Guidelines.
* **Logo Visibility (Stats):** You must have the Spotify logo visible on every page where stats are displayed to show that the data is "Powered by Spotify."

## 3. Data Persistence (Temporal Stats)

Since temporal stats involve tracking changes over time, you must handle user data with extreme care to remain compliant with the Developer Policy:

* **The Storage Rule:** You should not store Spotify content (metadata, user data) indefinitely. You may only store it for as long as is strictly necessary to provide the service.
* **Privacy Policy:** Because you are tracking data over time, you must have a clear Privacy Policy on your site explaining what data is stored and for how long.
* **The "Delete" Rule:** You are legally required to provide an easy way for users to revoke access and delete all the data you have collected about them.

### Technical Tip for Temporal Stats

To stay compliant while offering temporal stats, it is best practice to:

1. **Store Spotify IDs:** Store the unique ID strings rather than full metadata (names, images).
2. **Refetch Metadata:** Refetch the names and images using those IDs whenever the user logs in. This ensures the information is always the "most up to date," as required by the Developer Terms.

## 4. Using Our Content

### Album and Podcast Artwork

* **Integrity:** Keep artwork in its original form. Do not crop, animate, distort, or overlay text/images.
* **Corner Radius:** Corners must be rounded for optical blending.
* **Small/Medium Devices:** 4px radius.
* **Large Devices:** 8px radius.


* **Placement:** Do not place your own brand logo on top of Spotify artwork.

### Metadata & Links

* Titles for tracks, artists, playlists, and albums must be legible and accurate.
* **Metadata Links:** Every track or artist listed in your "Top Stats" must link back to the original content on Spotify.
* **Truncation:** You may truncate metadata if space is limited, but the user should be able to view the full metadata eventually.

### Layout Considerations (Max Characters)

* **Playlist/Album Name:** 25 characters
* **Artist Name:** 18 characters
* **Track Name:** 23 characters

## 5. Data Visualization & Commercialization

When displaying your graphs and lists (the "static stats"):

* **No Commercialization of Data:** You cannot sell the stats or the data you collect to third parties.
* **Monetization:** You can use ads (like Google Ads) on a stats website, but you cannot "repackage" the API data and sell it as a premium product.

## 6. Browsing Spotify Content

### Content Presentation

* **Fair Treatment:** Platforms aggregating multiple providers must give Spotify treatment equal to other partners.
* **Shelves/Rows:** Spotify will provide "shelves" of recommended content. Dedicate a full row/shelf to Spotify content; do not mix it with content from other services.
* **Limits:** Never show more than 20 items in a content set.
* **Exploration:** Provide a link to the Spotify app at the end of each content set.

## 7. Linking to Spotify

If you build an integration on a platform where the Spotify client exists (Mobile/Desktop), always link to the Spotify app as the default playback mechanism.

### Link Text Strings:

* **App Not Installed:** "GET SPOTIFY FREE"
* **App Installed:** "OPEN SPOTIFY", "PLAY ON SPOTIFY", or "LISTEN ON SPOTIFY"

## 8. Playing Views

### UI Requirements:

* **Controls:** It is recommended *not* to provide play controls other than Play/Pause.
* **Free User Restrictions:** If you show controls, they must reflect the disabled state correctly based on `PlaybackRestrictions`.
* **Seek Bar:** For music, the track progress bar should be informational only (no seeking).
* **Podcast/Audiobook Seeking:** These *must* have 15-second forward/back seek options.

## 9. Showing Entities

### Spotify Free Layouts

* **On-Demand:** Users see and play all tracks in the playlist/album.
* **Shuffle Play:** Users see a content summary and can only start shuffle playback.

### Explicit Content

* Use the Web API to identify explicit tracks.
* **South Korea:** Local regulations require an explicit content badge next to the title for all explicit tracks/episodes.

## 10. Logo & Color Guidelines

### Logo Versions

* **Primary:** Spotify Green logo on black or white backgrounds.
* **Black Logo:** Use on light-colored backgrounds.
* **White Logo:** Use on dark-colored backgrounds.

### Exclusion Zone

The exclusion zone around the logo should be equal to half the height of the icon (marked as '×').

### Minimum Sizes

* **Logo:** 70px (digital) / 20mm (print)
* **Icon:** 21px (digital) / 6mm (print)

### Logo Misuse (The "Don'ts")

* Do not rotate, stretch, or alter the shape.
* Do not fill the lines of the logo.
* Do not use the logo within a sentence or as a letter.
* Do not place the logo over busy images.

### Colors

* **Spotify Green:** Hex `#1DB954`
* **Black:** Hex `#191414`

## 11. Naming & Branding Restrictions

* **App Naming:** Your app name should **not** include "Spotify" or sound similar to it. You may say your app is "for Spotify".
* **Company Branding:** Do not use Spotify's trademarks in your company or product name.
* **Pairing Brands:** You are not permitted to use the Spotify brand together with another brand in co-branded communications.

## 12. Fonts

Spotify recommends using the default sans-serif font for your specific platform:

1. Default system sans-serif
2. Helvetica Neue
3. Helvetica
4. Arial