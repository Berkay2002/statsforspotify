import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative w-full bg-[oklch(0.1203_0_0)] border-t border-border overflow-hidden">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.0803_0_0)] to-transparent pointer-events-none" />

      {/* Subtle texture pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_25%_25%,_var(--primary)_0%,_transparent_50%),radial-gradient(circle_at_75%_75%,_var(--primary)_0%,_transparent_50%)] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Primary Links - Left Column */}
          <div className="lg:col-span-3">
            <nav className="space-y-4">
              <Link href="/dashboard" className="block text-2xl font-bold text-foreground hover:text-primary transition-colors duration-200">
                Dashboard
              </Link>
              <Link href="#features" className="block text-2xl font-bold text-foreground hover:text-primary transition-colors duration-200">
                Features
              </Link>
              <Link href="#about" className="block text-2xl font-bold text-foreground hover:text-primary transition-colors duration-200">
                About
              </Link>
              <Link href="#contact" className="block text-2xl font-bold text-foreground hover:text-primary transition-colors duration-200">
                Contact
              </Link>
            </nav>
          </div>

          {/* Link Groups - Right Area */}
          <div className="lg:col-span-9">
            <div className="grid grid-cols-1 gap-8 mb-12">
              {/* Account Group */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">Account</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                      Log In
                    </Link>
                  </li>
                  <li>
                    <Link href="/auth/signup" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                      Sign Up
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>

        {/* Large Wordmark */}
        <div className="mt-16 relative">
          <div className="text-center lg:text-left">
            <h2 style={{ fontFamily: 'var(--font-protest-guerrilla)' }} className="text-6xl md:text-8xl lg:text-[12rem] leading-none tracking-tight bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent opacity-20 select-none pointer-events-none">
              Stats for Spotify
            </h2>
          </div>
        </div>

        {/* Privacy/Terms Links - Now where social links were, with border separator */}
        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
            <Link href="/contact" className="hover:text-primary transition-colors duration-200">
              Media Inquiries
            </Link>
            <Link href="/privacy" className="hover:text-primary transition-colors duration-200">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors duration-200">
              Terms
            </Link>
            <Link href="/supplier-terms" className="hover:text-primary transition-colors duration-200">
              Supplier Terms
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Stats for Spotify. Not affiliated with Spotify AB.</p>
        </div>
      </div>
    </footer>
  );
}
