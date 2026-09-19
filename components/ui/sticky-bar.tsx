import { cn } from "@/lib/utils";

/** Sticky top bar: title on the left, glass controls on the right, scroll-edge fade beneath. Taps pass through the gaps. */
export function StickyBar({
  leading,
  className,
  children,
}: {
  leading?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none sticky top-0 z-30 -mx-4 -mt-4 px-4 pb-3 pt-[calc(1rem+env(safe-area-inset-top,0px))] md:-mx-6 md:-mt-6 md:px-6 md:pt-6",
        className,
      )}
    >
      <div aria-hidden className="fade-down" />
      <div className="pointer-events-auto flex items-center justify-between gap-3">
        {leading ?? <span />}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">{children}</div>
      </div>
    </div>
  );
}
