import clsx from "clsx";
import { MonoLabel } from "./MonoLabel";
import type { DismissalStatus } from "@/lib/dismissal/state";

// Status pill — mono caps, square corners, hairline border. Replaces the
// iOS-style soft pill from the previous version.
const COPY: Record<DismissalStatus, { label: string; tone: "muted" | "accent" | "success" | "danger" }> = {
  IDLE: { label: "No Active Request", tone: "muted" },
  REQUESTED: { label: "Awaiting Gate Scan", tone: "accent" },
  AWAITING_TEACHER: { label: "Awaiting Teacher", tone: "accent" },
  DISMISSED: { label: "Dismissed", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "muted" },
  CANCELLED: { label: "Cancelled", tone: "muted" }
};

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
        "inline-flex items-center gap-2 px-2.5 py-1 hairline bg-ink",
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-pulse-dot" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      <MonoLabel size="sm" tone={c.tone}>
        {c.label}
      </MonoLabel>
    </span>
  );
}
