import clsx from "clsx";

// Animated loading spinner — Kernel blue, GPU-cheap rotation. Uses Tailwind's
// built-in animate-spin so it respects prefers-reduced-motion automatically.
// Replaces the static Icon name="timer" that previously stood in for a spinner.
export function Spinner({
  className = "h-5 w-5",
  label = "Loading"
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={clsx(
        "inline-block rounded-full border-2 border-line border-t-accent animate-spin",
        className
      )}
    />
  );
}
