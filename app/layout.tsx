import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { CookieConsent } from "@/components/ui/cookies"
import { AnalyticsWrapper } from "@/components/analytics-wrapper"
import { SpotifyPlayerProvider } from "@/lib/spotify/player-context"

const spotifySans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-spotify-sans",
  display: "swap",
});

const spotifyMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-spotify-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stats for Spotify",
  description: "Track your Spotify listening history and see how your music taste evolves over time",
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Stats for Spotify',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spotifySans.variable} ${spotifyMono.variable}`}
    >
      <head>
        <meta name="theme-color" content="#1DB954" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="font-sans antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <SpotifyPlayerProvider>
                {children}
                <CookieConsent />
              </SpotifyPlayerProvider>
            </QueryProvider>
            <AnalyticsWrapper />
          </ThemeProvider>
      </body>
    </html>
  );
}
