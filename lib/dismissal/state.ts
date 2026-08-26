// Persisted dismissal request status. Source: Docs/architecture.md §7.
// SCANNED/APPROVED are deliberately NOT persisted — scans and approvals are
// recorded as events in dismissal_events (scan_time / approval_time).
export type DismissalStatus =
  | "IDLE"
  | "REQUESTED"
  | "AWAITING_TEACHER"
  | "DISMISSED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

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
