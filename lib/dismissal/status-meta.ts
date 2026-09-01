import type { StatusTone } from "@/components/ui/StatusBadge";
import type { DismissalStatus } from "./state";

/**
 * CANONICAL dismissal status vocabulary — the single source of truth for how a
 * dismissal status is labeled, toned, and described across EVERY portal
 * (parent / teacher / gate / admin).
 *
 * Earlier phases kept four uncoordinated label maps, so AWAITING_TEACHER was
 * shown five different ways ("Approved" / "Awaiting teacher" / "Awaiting your
 * decision" / "Awaiting teacher approval" / "Awaiting Teacher") with conflicting
 * tones (success vs warning vs info). That is a safety-critical contradiction:
 * a parent must never read "Approved" while the teacher still sees "Awaiting
 * your decision". This module fixes it — one label, one tone, one meaning.
 *
 * The label and tone are identical everywhere; only the plain-language
 * `description` varies by status (never by portal). `state.ts`
 * (dismissalStatusLabel / dismissalStatusTone) delegates here so there is
 * exactly one map to maintain.
 */

export type StatusMeta = {
  /** Human label shown in the status badge. Identical in every portal. */
  label: string;
  /** Visual tone for the status badge. Identical in every portal. */
  tone: StatusTone;
  /** Plain-language meaning, shown only while the request is active. */
  description: string;
};

const META: Record<DismissalStatus, StatusMeta> = {
  IDLE: {
    label: "No Active Request",
    tone: "neutral",
    description: "No dismissal request is in progress."
  },
  REQUESTED: {
    label: "Requested",
    tone: "info",
    description: "Pickup requested. Waiting for gate staff to scan the code."
  },
  AWAITING_TEACHER: {
    label: "Awaiting Teacher",
    tone: "warning",
    description:
      "Gate staff scanned the code. Waiting for the teacher to approve release."
  },
  DISMISSED: {
    label: "Dismissed",
    tone: "success",
    description: "Released to the approved guardian."
  },
  REJECTED: {
    label: "Rejected",
    tone: "danger",
    description: "The teacher did not approve this pickup."
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "neutral",
    description: "The request was cancelled by the parent."
  },
  EXPIRED: {
    label: "Expired",
    tone: "warning",
    description: "The request timed out and is no longer valid."
  }
};

/** Canonical status metadata. Prefer this over the legacy aliases. */
export function getStatusMeta(status: DismissalStatus): StatusMeta {
  return META[status] ?? META.IDLE;
}

/** Backwards-compatible alias used by the parent pages. */
export function dismissalStatusMeta(status: DismissalStatus): StatusMeta {
  return getStatusMeta(status);
}
