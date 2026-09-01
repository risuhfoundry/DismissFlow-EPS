import type { DismissalStatus } from "@/lib/dismissal/state";
import { getStatusMeta } from "@/lib/dismissal/status-meta";
import { StatusBadge } from "./StatusBadge";

/**
 * Domain bridge: a dismissal status → the canonical StatusBadge.
 * All label/tone logic lives in lib/dismissal/status-meta.ts (single source).
 */
export function StatusPill({
  status,
  pulse = false,
  className
}: {
  status: DismissalStatus;
  pulse?: boolean;
  className?: string;
}) {
  const meta = getStatusMeta(status);
  return (
    <StatusBadge tone={meta.tone} pulse={pulse} className={className}>
      {meta.label}
    </StatusBadge>
  );
}
