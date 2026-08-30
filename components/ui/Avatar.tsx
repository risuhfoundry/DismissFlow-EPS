import clsx from "clsx";

type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZES: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base"
};

/**
 * Avatar — initials in a colored chip. `name` is used for both the initials
 * and the alt text. Future phases can extend this to render an image URL with
 * graceful fallback (no image support required for the foundation).
 */
export function Avatar({
  name,
  size = "md",
  className
}: {
  name: string;
  size?: AvatarSize;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary",
        SIZES[size],
        className
      )}
      aria-label={name}
      title={name}
    >
      {initials || "?"}
    </span>
  );
}
