import clsx from "clsx";

/**
 * DismissFlow brand mark + wordmark. A calm, geometric "flow" glyph (two
 * arcs resolving into a check) paired with the product name. No gradient
 * noise, no glow — just a confident, trustworthy mark.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={clsx("h-8 w-8 text-primary", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M9 21c0-6 4.5-10 10-10 3 0 5 1.4 6.5 3.4"
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M21 12.5l2.2 2.2L27 11"
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <Logo />
      <span className="text-base font-semibold tracking-tight text-foreground sm:text-title">
        DismissFlow
      </span>
    </span>
  );
}
