import type { StatusTone } from "@/components/ui/StatusBadge";
import type { DismissalStatus } from "./state";

export type StatusMeta = {
  /** Human label shown in the status badge. */
  label: string;
  /** Visual tone for the status badge. */
  tone: StatusTone;
  /** Plain-language next step, shown only while the request is active. */
  next?: string;
};

const META: Record<DismissalStatus, StatusMeta> = {
  IDLE: { label: "Idle", tone: "neutral" },
  REQUESTED: {
    label: "Requested",
    tone: "primary",
    next: "Your pickup request was sent and is waiting for the teacher to confirm."
  },
  AWAITING_TEACHER: {
    label: "Approved",
    tone: "success",
    next: "The teacher approved the pickup. Show your code to gate staff for release."
  },
  DISMISSED: { label: "Released", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "warning" }
};

export function dismissalStatusMeta(status: DismissalStatus): StatusMeta {
  return META[status] ?? META.IDLE;
}
