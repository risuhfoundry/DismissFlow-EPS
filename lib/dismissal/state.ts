// Persisted dismissal request status. Source: Docs/architecture.md §7.
// SCANNED/APPROVED are deliberately NOT persisted — scans and approvals are
// recorded as events in dismissal_events (scan_time / approval_time).
import type { StatusTone } from "@/components/ui/StatusBadge";
import { getStatusMeta } from "./status-meta";

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

/** Maps a dismissal status to its canonical design-system badge tone. */
export function dismissalStatusTone(status: DismissalStatus): StatusTone {
  return getStatusMeta(status).tone;
}

/** Human-readable label for a dismissal status (no acronyms in the UI). */
export function dismissalStatusLabel(status: DismissalStatus): string {
  return getStatusMeta(status).label;
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
