import { Metadata } from "next";
import Link from "next/link";
import { Music, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy - Stats for Spotify",
  description: "Privacy Policy for Stats for Spotify application",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Music className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Stats for Spotify</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="mt-2 text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
            <section className="mt-8">
              <h2 className="text-2xl font-semibold">1. Introduction</h2>
              <p className="mt-4 text-muted-foreground">
                Stats for Spotify (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our application.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">2. Data We Collect</h2>
              <p className="mt-4 text-muted-foreground">
                When you use Stats for Spotify, we collect and store the following information from your Spotify account:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li>Your Spotify user ID and email address</li>
                <li>Your display name and profile picture</li>
                <li>Your top artists, tracks, and albums (as provided by Spotify&apos;s API)</li>
                <li>Historical snapshots of your listening data to track changes over time</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">3. How We Use Your Data</h2>
              <p className="mt-4 text-muted-foreground">
                We use your data solely to:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li>Display your current listening statistics</li>
                <li>Track and visualize changes in your music preferences over time</li>
                <li>Provide personalized insights about your listening habits</li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                We do not sell, share, or transfer your personal data to third parties for marketing purposes.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">4. Data Storage and Security</h2>
              <p className="mt-4 text-muted-foreground">
                Your data is stored securely using Supabase, which provides enterprise-grade security including:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li>Encryption at rest and in transit</li>
                <li>Row Level Security (RLS) ensuring you can only access your own data</li>
                <li>Regular security audits and compliance certifications</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">5. Spotify API Usage</h2>
              <p className="mt-4 text-muted-foreground">
                Stats for Spotify uses Spotify&apos;s Web API to access your listening data. We request only the minimum permissions necessary:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li><code className="bg-muted px-1 rounded">user-read-email</code>: To identify your account</li>
                <li><code className="bg-muted px-1 rounded">user-top-read</code>: To access your top artists and tracks</li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                We do not access your playlists, playback controls, or any other Spotify features.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">6. Your Rights</h2>
              <p className="mt-4 text-muted-foreground">
                You have the right to:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Access</strong>: Export all your data at any time from your profile page</li>
                <li><strong>Delete</strong>: Permanently delete all your data from our systems via your profile page</li>
                <li><strong>Revoke</strong>: Disconnect your Spotify account and revoke access at any time through your <a href="https://www.spotify.com/account/apps/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Spotify account settings</a>. When you revoke access, we can no longer access your Spotify data, and any subsequent login will require re-authorization.</li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                <strong>Important:</strong> Revoking access in Spotify settings does not automatically delete your stored data from our database. To completely remove all your data, please use the &quot;Delete All Data&quot; button on your profile page before or after revoking access.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">7. Data Retention</h2>
              <p className="mt-4 text-muted-foreground">
                We retain your data only for as long as necessary to provide our service:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Listening History Snapshots</strong>: Stored to track changes in your music preferences over time. You can delete individual snapshots or all data at any time from your profile page.</li>
                <li><strong>Account Data</strong>: Basic profile information (name, email) is retained while your account is active.</li>
                <li><strong>Data Deletion</strong>: When you delete your account or revoke access, all your data (snapshots, rankings, and profile information) will be permanently removed within 30 days.</li>
                <li><strong>Spotify Content</strong>: We store historical rankings but regularly refresh artist names, track titles, and album artwork from Spotify to ensure accuracy.</li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                You have full control over your data and can export or delete it at any time through your profile settings.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">8. Third-Party Services</h2>
              <p className="mt-4 text-muted-foreground">
                We use the following third-party services:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Spotify</strong>: For authentication and accessing your listening data</li>
                <li><strong>Supabase</strong>: For data storage and authentication</li>
                <li><strong>Vercel</strong>: For hosting the application</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">9. Cookies</h2>
              <p className="mt-4 text-muted-foreground">
                We use essential cookies only for authentication purposes. We do not use tracking cookies or third-party analytics.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">10. Changes to This Policy</h2>
              <p className="mt-4 text-muted-foreground">
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">11. Contact Us</h2>
              <p className="mt-4 text-muted-foreground">
                If you have any questions about this privacy policy or our data practices, please contact us through our support channels.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Stats for Spotify. Not affiliated with Spotify AB.</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
