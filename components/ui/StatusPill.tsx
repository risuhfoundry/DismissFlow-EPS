import clsx from "clsx";
import type { DismissalStatus } from "@/lib/dismissal/state";
import { StatusBadge, type StatusTone } from "./StatusBadge";

const COPY: Record<DismissalStatus, { label: string; tone: StatusTone }> = {
  IDLE: { label: "No Active Request", tone: "neutral" },
  REQUESTED: { label: "Awaiting Gate Scan", tone: "info" },
  AWAITING_TEACHER: { label: "Awaiting Teacher", tone: "info" },
  DISMISSED: { label: "Dismissed", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "neutral" }
};

/** Maps a dismissal status to the standard status badge (preserves contract). */
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
    <StatusBadge tone={c.tone} pulse={pulse} className={clsx(className)}>
      {c.label}
    </StatusBadge>
  );
}
