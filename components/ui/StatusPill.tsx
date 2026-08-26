import clsx from "clsx";
import type { DismissalStatus } from "@/lib/dismissal/state";

const COPY: Record<DismissalStatus, { label: string; tone: string }> = {
  IDLE: { label: "No Active Request", tone: "bg-surface-muted text-ink-subtle" },
  REQUESTED: { label: "Awaiting Gate Scan", tone: "bg-amber-50 text-amber-700" },
  AWAITING_TEACHER: { label: "Awaiting Teacher", tone: "bg-amber-50 text-amber-700" },
  DISMISSED: { label: "Dismissed", tone: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", tone: "bg-rose-50 text-rose-700" },
  EXPIRED: { label: "Expired", tone: "bg-surface-muted text-ink-subtle" },
  CANCELLED: { label: "Cancelled", tone: "bg-surface-muted text-ink-subtle" }
};

// iOS-style status pill — soft tint, semibold caption-1, optional pulse dot.
export function StatusPill({
  status,
  pulse = false,
  className
}: {
  status: DismissalStatus;
  pulse?: boolean;
  className?: string;
}) {
  const c = COPY[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-ios-caption-1 font-semibold tracking-wide",
        c.tone,
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-soft-pulse" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {c.label}
    </span>
  );
}
