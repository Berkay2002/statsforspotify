import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Ultra, Rock_Salt, Protest_Guerrilla } from "next/font/google";
import "./globals.css";

const rockSalt = Rock_Salt({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-rock-salt",
});
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { CookieConsent } from "@/components/ui/cookies"
import { AnalyticsWrapper } from "@/components/analytics-wrapper"

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const ultra = Ultra({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-ultra",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const protestGuerrilla = Protest_Guerrilla({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-protest-guerrilla",
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${ultra.variable} ${protestGuerrilla.variable}`}>
      <head>
        <meta name="theme-color" content="#1DB954" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              {children}
              <CookieConsent />
            </QueryProvider>
            <AnalyticsWrapper />
          </ThemeProvider>
      </body>
    </html>
  );
}
