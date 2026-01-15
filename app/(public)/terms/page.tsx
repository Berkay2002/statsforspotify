import { Metadata } from "next";
import Link from "next/link";
import { PublicLayout } from "@/components/public-layout";

export const metadata: Metadata = {
  title: "Terms of Service - Stats for Spotify",
  description: "Terms of Service for Stats for Spotify application",
};

export default function TermsPage() {
  return (
    <PublicLayout showBackButton={true} backHref="/">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
          <section className="mt-8">
              <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
              <p className="mt-4 text-muted-foreground">
                By accessing or using Stats for Spotify (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">2. Description of Service</h2>
              <p className="mt-4 text-muted-foreground">
                Stats for Spotify is a web application that connects to your Spotify account to display and track your listening statistics over time. The Service provides:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li>Visualization of your top artists, tracks, and albums</li>
                <li>Historical tracking of your listening preferences</li>
                <li>Charts and analytics showing trends in your music taste</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">3. Spotify Account Requirements</h2>
              <p className="mt-4 text-muted-foreground">
                To use the Service, you must:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li>Have a valid Spotify account</li>
                <li>Authorize the Service to access your Spotify data</li>
                <li>Comply with Spotify&apos;s Terms of Service</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">4. Social Features</h2>
              <p className="mt-4 text-muted-foreground">
                The Service offers social features that allow users to view friends&apos; listening statistics:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li>Friendships are based on mutual Spotify follows (you both follow each other)</li>
                <li>Stats visibility is controlled by your privacy settings (default: followers only)</li>
                <li>You can search for other users by display name</li>
                <li>Follow/unfollow actions sync with your Spotify account</li>
                <li>You are responsible for managing your privacy settings appropriately</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">5. User Responsibilities</h2>
              <p className="mt-4 text-muted-foreground">
                You agree to:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide accurate information when using the Service</li>
                <li>Maintain the security of your account credentials</li>
                <li>Not attempt to access other users&apos; data</li>
                <li>Not use the Service for any illegal purposes</li>
                <li>Not attempt to reverse engineer or exploit the Service</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">5. Data and Privacy</h2>
              <p className="mt-4 text-muted-foreground">
                Your use of the Service is also governed by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. By using the Service, you consent to our collection and use of data as described in the Privacy Policy.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">6. Intellectual Property</h2>
              <p className="mt-4 text-muted-foreground">
                The Service and its original content, features, and functionality are owned by Stats for Spotify and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
              <p className="mt-4 text-muted-foreground">
                Spotify® and related marks are trademarks of Spotify AB. This Service is not affiliated with, endorsed by, or sponsored by Spotify AB.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">7. Third-Party Services</h2>
              <p className="mt-4 text-muted-foreground">
                The Service integrates with Spotify&apos;s API and is subject to Spotify&apos;s terms and conditions. We are not responsible for any changes to or availability of Spotify&apos;s services.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">8. Disclaimer of Warranties</h2>
              <p className="mt-4 text-muted-foreground">
                The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We do not warrant that:
              </p>
              <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
                <li>The Service will be uninterrupted or error-free</li>
                <li>The data provided will be accurate or complete</li>
                <li>The Service will meet your specific requirements</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">9. Limitation of Liability</h2>
              <p className="mt-4 text-muted-foreground">
                To the fullest extent permitted by law, Stats for Spotify shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">10. Account Termination</h2>
              <p className="mt-4 text-muted-foreground">
                You may terminate your account at any time by deleting your data through the profile page. We reserve the right to suspend or terminate accounts that violate these terms or for any other reason at our discretion.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">11. Changes to Terms</h2>
              <p className="mt-4 text-muted-foreground">
                We reserve the right to modify these terms at any time. We will notify users of significant changes by posting a notice on the Service. Your continued use of the Service after such modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">12. Governing Law</h2>
              <p className="mt-4 text-muted-foreground">
                These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">13. Contact</h2>
              <p className="mt-4 text-muted-foreground">
                If you have any questions about these Terms of Service, please contact us through our support channels.
              </p>
            </section>
          </div>
        </div>
    </PublicLayout>
  );
}
