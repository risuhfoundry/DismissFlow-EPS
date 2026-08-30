import clsx from "clsx";
import type { ConnStatus } from "@/lib/realtime/subs";
import { statusLabel } from "@/lib/realtime/subs";

const DOT: Record<string, string> = {
  live: "bg-success",
  warn: "bg-warning",
  offline: "bg-destructive"
};

/** Realtime connection indicator (preserves the `ConnStatus` contract). */
export function StatusIndicator({
  status,
  className
}: {
  status: ConnStatus;
  className?: string;
}) {
  const c = statusLabel(status);
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground",
        className
      )}
      aria-live="polite"
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          DOT[c.tone] ?? "bg-muted-foreground",
          c.tone !== "danger" && "animate-pulse-soft"
        )}
        aria-hidden="true"
      />
      {c.label}
    </div>
  );
}
