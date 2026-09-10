"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Decorative artwork. Keep identifying text in the card's foreground. */
export function ArtworkBackground({
  src,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: {
  src?: string | null;
  className?: string;
  sizes?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-neutral-900", className)}>
      {src && (
        <Image src={src} alt="" fill sizes={sizes}
          className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}
