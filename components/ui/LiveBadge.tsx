import clsx from "clsx";
import { MonoLabel } from "./MonoLabel";

export type LiveTone = "live" | "warn" | "danger" | "muted";

const DOT: Record<LiveTone, string> = {
  live: "bg-success",
  warn: "bg-warning",
  danger: "bg-destructive",
  muted: "bg-muted-foreground"
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
        "h-1.5 w-1.5 rounded-full",
        DOT[tone],
        tone !== "muted" && "animate-pulse-soft",
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
      <MonoLabel size="xs" tone="muted">
        {label}
      </MonoLabel>
    </span>
  );
}
