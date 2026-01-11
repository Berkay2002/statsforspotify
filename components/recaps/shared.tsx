import Image from "next/image";

export type RecapTimeRange = "short_term" | "medium_term" | "long_term";

export const recapTimeRanges: RecapTimeRange[] = ["short_term", "medium_term", "long_term"];

export const recapTimeRangeLabels: Record<RecapTimeRange, string> = {
  short_term: "Last 4 Weeks",
  medium_term: "Last 6 Months",
  long_term: "All Time",
};

export function RecapItemImage(props: {
  imageUrl: string | null | undefined;
  alt: string;
  size: number;
  className?: string;
}) {
  const { imageUrl, alt, size, className } = props;

  if (!imageUrl) {
    return (
      <div
        className={["bg-muted shrink-0", className].filter(Boolean).join(" ")}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={size}
      height={size}
      className={["shrink-0 object-cover", className].filter(Boolean).join(" ")}
    />
  );
}

