import clsx from "clsx";
import { MonoLabel } from "./MonoLabel";

// Consistent live/realtime indicator: a pulsing dot + mono caps label.
// Replaces the ad-hoc literal "● LIVE" text and the duplicated pulse dots.
export type LiveTone = "live" | "warn" | "danger" | "muted";

const DOT: Record<LiveTone, string> = {
  live: "bg-success shadow-[0_0_8px_#B7EF42]",
  warn: "bg-warn shadow-[0_0_8px_#FEBC2E]",
  danger: "bg-danger shadow-[0_0_8px_#FF3B20]",
  muted: "bg-muted shadow-none"
};

export function LiveDot({
  tone = "live",
  className
}: {
  tone?: LiveTone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "h-1.5 w-1.5 rounded-full animate-pulse-dot",
        DOT[tone],
        className
      )}
      aria-hidden="true"
    />
  );
}

export function LiveBadge({
  tone = "live",
  label,
  className
}: {
  tone?: LiveTone;
  label: string;
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <LiveDot tone={tone} />
      <MonoLabel size="xs" tone={tone === "muted" ? "muted" : "bone"}>
        {label}
      </MonoLabel>
    </span>
  );
}
