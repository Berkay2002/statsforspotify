import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Stats for Spotify',
    short_name: 'Spotify Stats',
    description: 'Track your Spotify listening history and see how your music taste evolves over time',
    start_url: '/',
    display: 'standalone',
    background_color: '#191414',
    theme_color: '#1DB954',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/spotify/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
