"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Disc3, Ellipsis, LayoutDashboard, Mic2, Music, Settings, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { title: string; icon: LucideIcon; href: string };

const tabs: Item[] = [
  { title: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Artists", icon: Mic2, href: "/dashboard/artists" },
  { title: "Tracks", icon: Music, href: "/dashboard/tracks" },
  { title: "Albums", icon: Disc3, href: "/dashboard/albums" },
];

const more: Item[] = [
  { title: "Friends", icon: UserPlus, href: "/dashboard/friends" },
  { title: "Settings", icon: Settings, href: "/profile" },
];

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

const TAB =
  "press press-tab relative z-10 flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium";

/** Apple's tabBarMinimizeBehavior(.onScrollDown): true while scrolling down, false the moment the user scrolls up or reaches the top.
 *  Listens in the capture phase so it works for the app's <main> scroller, not just the window. */
function useScrollingDown() {
  const [down, setDown] = useState(false);
  useEffect(() => {
    let last = 0;
    const onScroll = (e: Event) => {
      const el = e.target instanceof Element ? e.target : document.scrollingElement;
      const y = el?.scrollTop ?? 0;
      if (y <= 0 || y < last - 4) setDown(false);
      else if (y > last + 4 && y > 80) setDown(true);
      last = y;
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);
  return down;
}

function Glyph({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <Icon
      size={24}
      strokeWidth={active ? 2 : 1.8}
      fill={active ? "currentColor" : "none"}
      fillOpacity={0.18}
      className="h-6 w-6"
    />
  );
}

/** Floating Liquid Glass tab bar. Active tab follows the route; the lens slides between tabs. */
export function MobileNavigation({ className }: { className?: string }) {
  const pathname = usePathname();
  const minimized = useScrollingDown();
  const label = (text: string) => (
    <span
      className={cn(
        "overflow-hidden transition-[max-height,opacity] duration-200 motion-reduce:transition-none",
        minimized ? "max-h-0 opacity-0" : "max-h-4 opacity-100",
      )}
    >
      {text}
    </span>
  );
  // Distance from the viewport bottom to the top of the bar, measured when the menu opens. null = closed.
  const [menuBottom, setMenuBottom] = useState<number | null>(null);
  const open = menuBottom !== null;
  const toggleMenu = () => {
    if (open) return setMenuBottom(null);
    const nav = document.getElementById("bottom-nav");
    setMenuBottom(nav ? window.innerHeight - nav.getBoundingClientRect().top + 8 : 92);
  };

  const n = tabs.length + 1;
  const moreActive = more.some((t) => matches(pathname, t.href));
  // Longest matching href wins so /dashboard/artists doesn't light up Overview.
  const active = moreActive
    ? n - 1
    : tabs.reduce((best, t, i) => {
        return matches(pathname, t.href) && (best < 0 || t.href.length > tabs[best].href.length) ? i : best;
      }, -1);

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn("pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]", className)}
      >
        <div aria-hidden className="fade-up" />
        <div
          id="bottom-nav"
          className="glass group pointer-events-auto relative mx-auto flex max-w-md items-stretch rounded-full p-1"
        >
          {active >= 0 && (
            <span
              aria-hidden
              className="lens pointer-events-none absolute inset-y-1 rounded-full transition-[left,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-active:scale-[1.08] motion-reduce:transition-none"
              style={{
                width: `calc((100% - 0.5rem) / ${n})`,
                left: `calc(0.25rem + (100% - 0.5rem) * ${active} / ${n})`,
              }}
            />
          )}
          {tabs.map((t, i) => {
            const isActive = i === active;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(TAB, isActive ? "text-primary" : "text-muted-foreground")}
              >
                <Glyph icon={t.icon} active={isActive} />
                {label(t.title)}
              </Link>
            );
          })}
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={toggleMenu}
            className={cn(TAB, moreActive || open ? "text-primary" : "text-muted-foreground")}
          >
            <Glyph icon={Ellipsis} active={moreActive} />
            {label("More")}
          </button>
        </div>
      </nav>
      {open && <MorePopover bottom={menuBottom} onClose={() => setMenuBottom(null)} pathname={pathname} />}
    </>
  );
}

/** Glass menu rising from the "More" tab. Portalled to body so it blurs page content, not the bar. */
function MorePopover({ bottom, onClose, pathname }: { bottom: number; onClose: () => void; pathname: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute inset-x-4 mx-auto flex max-w-md justify-end" style={{ bottom }}>
        <div role="menu" className="glass animate-pop-up w-56 origin-bottom-right rounded-[28px] p-2">
          {more.map((t) => {
            const isActive = matches(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                role="menuitem"
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "press flex w-full items-center gap-3 rounded-[20px] px-3 py-2.5 text-sm font-medium active:bg-page/60",
                  isActive ? "text-primary" : "text-foreground",
                )}
              >
                <Glyph icon={t.icon} active={isActive} />
                {t.title}
              </Link>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
