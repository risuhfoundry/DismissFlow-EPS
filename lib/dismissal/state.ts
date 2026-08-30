// Persisted dismissal request status. Source: Docs/architecture.md §7.
// SCANNED/APPROVED are deliberately NOT persisted — scans and approvals are
// recorded as events in dismissal_events (scan_time / approval_time).
import type { StatusTone } from "@/components/ui/StatusBadge";

export type DismissalStatus =
  | "IDLE"
  | "REQUESTED"
  | "AWAITING_TEACHER"
  | "DISMISSED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

/** Every persisted status, in the canonical display order. */
export const DISMISSAL_STATUSES: DismissalStatus[] = [
  "REQUESTED",
  "AWAITING_TEACHER",
  "DISMISSED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED"
];

/** Maps a dismissal status to its design-system badge tone (read-only display). */
export function dismissalStatusTone(status: DismissalStatus): StatusTone {
  switch (status) {
    case "REQUESTED":
      return "info";
    case "AWAITING_TEACHER":
      return "warning";
    case "DISMISSED":
      return "success";
    case "REJECTED":
      return "danger";
    case "CANCELLED":
      return "neutral";
    case "EXPIRED":
      return "warning";
    default:
      return "neutral";
  }
}

/** Human-readable label for a dismissal status (no acronyms in the UI). */
export function dismissalStatusLabel(status: DismissalStatus): string {
  switch (status) {
    case "REQUESTED":
      return "Requested";
    case "AWAITING_TEACHER":
      return "Awaiting teacher";
    case "DISMISSED":
      return "Dismissed";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    case "IDLE":
      return "Idle";
    default:
      return status;
  }
}

export type DismissalRequest = {
  requestId: string;
  studentId: string;
  status: DismissalStatus;
  createdAt: string;
  expiresAt: string;
};

export type DismissalResult =
  | { kind: "idle" }
  | { kind: "active"; request: DismissalRequest; qrToken?: string }
  | { kind: "completed"; status: Exclude<DismissalStatus, "REQUESTED" | "AWAITING_TEACHER"> };
